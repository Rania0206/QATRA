"""A-05b: 24-hour schedule of the transfer pump (plant -> storage basin): solar first, grid only when needed.

Hours are filled in this order (each hour covers hh:00-hh:59):
  1. SOLAR hours: PV output >= the pump's kW. 07:00-12:00 first, then any other such hour.
  2. GRID hours at 06:00 and 18:00-21:00 (outside the peak).
  3. Last resort, normal scenario only: the other daytime hours 07:00-17:00 on the grid.
In the "outage" scenario the grid is NEVER used in the outage window (13:00-17:00, from sim_outage_windows):
PV still can be, the grid cannot. Whatever does not fit in the hours (or in the basin) is reported as a warning.

Everything is read through the store: pump (sim_pumps_basin.transfer_pumps[0]), basin and PV array size
(sim_pumps_basin), hourly PV (pv_estimate_sousse, scaled to the array), outage windows (sim_outage_windows),
energy formula constant (energy_params). Farm withdrawals from the basin are not modelled: basin_m3 is the level
after the water pumped in, starting from the basin's initial level.
"""
import math
import re
from functools import lru_cache
from typing import Literal, Optional

from pydantic import BaseModel

from app.engine.needs import forecast_dates
from app.schemas import ScheduleSlot
from app.store import get_store

Scenario = Literal["normal", "outage"]

# "Solar" means PV output >= SOLAR_MIN_FRACTION x the pump's kW. 1.0 = the full pump power, as specified.
# With the data pack's 60 kWp array this is rarely true (the pump needs 44.6 kW, the array peaks at ~48 kW in July and
# ~26 kW in November): lowering it (e.g. 0.8) lets weaker sun count, with the grid topping up.
SOLAR_MIN_FRACTION = 1.0

SOLAR_FIRST = range(7, 13)  # 07:00-12:59
GRID_PREFERRED = [6, 18, 19, 20, 21]
LAST_RESORT = range(7, 18)  # 07:00-17:59 on the grid, only when nothing else is left
DEFAULT_WINDOW = (13, 17)  # outage window when the date has none in sim_outage_windows (HRW 2026: 13:00-17:00)
FALLBACK_COEFF = 0.00272  # kWh per m3 per metre of head, if the formula in energy_params cannot be parsed


class Schedule(BaseModel):
    slots: list[ScheduleSlot]  # 24 slots, hour 0..23
    energy_kwh: float
    solar_share: float  # solar kWh / total kWh, 0..1
    pumped_m3: float
    warnings: list[str]


# ---------------------------------------------------------------- inputs
@lru_cache(maxsize=1)
def _pumps() -> dict:
    return get_store()["sim_pumps_basin"]


@lru_cache(maxsize=1)
def _coeff() -> float:
    """0.00272 from "E_kWh_per_m3 = 0.00272 * H_m / eta" (data/clean/energy_params.json)."""
    try:
        formula = get_store()["energy_params"]["pump_energy_formula"]["formula"]
        return float(re.search(r"=\s*([0-9.]+)\s*\*", formula).group(1))
    except (KeyError, AttributeError, ValueError):
        return FALLBACK_COEFF


def pump_spec() -> dict:
    """First transfer pump (TP1): flow m3/h, head m, efficiency, rated kW, and its energy per m3."""
    p = _pumps()["transfer_pumps"][0]
    return {**p, "kwh_per_m3": _coeff() * p["head_m"] / p["efficiency"]}


def basin_spec() -> dict:
    return _pumps()["storage_basin"]


@lru_cache(maxsize=64)
def _pv_kw(day: str) -> dict[int, float]:
    """hour -> PV output (kW) of the array on that day. The file is for pv_kwp (50); scaled to the array size (60 kWp)."""
    df = get_store()["pv_estimate_sousse"]
    df = df[df["datetime"].dt.strftime("%Y-%m-%d") == day]
    scale = _pumps()["pv_array"]["kWp"] / float(df["pv_kwp"].iloc[0]) if len(df) else 1.0
    return {int(r["datetime"].hour): float(r["pv_kwh"]) * scale for _, r in df.iterrows()}  # kWh in one hour = average kW


def outage_hours(day: str) -> set[int]:
    """Hours without grid on that day: the window in sim_outage_windows (else the common 13:00-17:00)."""
    df = get_store()["sim_outage_windows"]
    row = df[df["date"].astype(str).str[:10] == day]
    start, end = (int(row.iloc[0]["start"][:2]), int(row.iloc[0]["end"][:2])) if len(row) else DEFAULT_WINDOW
    return set(range(start, end))


# ---------------------------------------------------------------- the schedule
def schedule(total_m3: float, date: Optional[str] = None, scenario: Scenario = "normal",
             basin_initial_m3: Optional[float] = None) -> Schedule:
    """basin_initial_m3: starting level of the basin (default: sim_pumps_basin; the heatwave scenario starts at 600)."""
    day = date or (forecast_dates()[0] if forecast_dates() else "")
    pump, basin = pump_spec(), basin_spec()
    flow, kw, kwh_m3 = float(pump["flow_m3_h"]), float(pump["power_kW"]), pump["kwh_per_m3"]
    pv = _pv_kw(day)
    warnings: list[str] = []
    if not pv:
        warnings.append(f"No PV data for {day}: every pumping hour is on the grid.")

    start = float(basin["initial_level_m3"] if basin_initial_m3 is None else basin_initial_m3)
    room = max(0.0, basin["capacity_m3"] - start)
    pumpable = max(0.0, min(total_m3, room))
    if total_m3 > room + 0.05:
        warnings.append(f"{total_m3 - room:.0f} m3 could not be pumped: the basin is full "
                        f"({basin['capacity_m3']} m3 capacity, {start:g} m3 already in).")

    no_grid = outage_hours(day) if scenario == "outage" else set()
    solar_ok = lambda h: pv.get(h, 0.0) >= SOLAR_MIN_FRACTION * kw  # noqa: E731
    solar = [h for h in SOLAR_FIRST if solar_ok(h)] + [h for h in range(24) if h not in SOLAR_FIRST and solar_ok(h)]
    grid = [h for h in GRID_PREFERRED if h not in no_grid]
    last = [h for h in LAST_RESORT if h not in no_grid]
    order = list(dict.fromkeys(solar + grid + last))

    pumped: dict[int, float] = {}
    left = pumpable
    for h in order:
        if left <= 1e-9:
            break
        pumped[h] = min(flow, left)
        left -= pumped[h]
    if left > 0.05:
        why = " (no grid during the outage)" if scenario == "outage" else ""
        warnings.append(f"{left:.0f} m3 could not be pumped: not enough pumping hours{why}.")

    slots, level, energy, solar_kwh = [], start, 0.0, 0.0
    for h in range(24):
        m3 = pumped.get(h, 0.0)
        slot_kw = m3 / flow * kw
        source = "off" if m3 <= 0 else ("solar" if pv.get(h, 0.0) >= SOLAR_MIN_FRACTION * slot_kw else "grid")
        level = min(float(basin["capacity_m3"]), level + m3)
        energy += m3 * kwh_m3
        if source == "solar":
            solar_kwh += m3 * kwh_m3
        slots.append(ScheduleSlot(hour=h, pump_kw=round(slot_kw, 1), source=source, basin_m3=round(level, 1)))
    total_pumped = sum(pumped.values())
    return Schedule(slots=slots, energy_kwh=round(energy, 1), solar_share=round(solar_kwh / energy, 3) if energy else 0.0,
                    pumped_m3=round(total_pumped, 1), warnings=warnings)
