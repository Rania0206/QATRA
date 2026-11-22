"""Heatwave + grid-outage scenario, naive policy (B-05a). Numbers only, no FastAPI.

The naive policy irrigates straight from the grid, on demand: no storage basin and no solar shifting. When the
grid is cut, nothing is delivered. This module measures how many hours the farms are left without water.

Sources: weather_summer2026_sousse (NASA POWER hourly + FAO-56 ET0), sim_outage_windows and sim_scenarios
(13:00-17:00 outage on hot days), sim_pumps_basin (transfer pump TP1), crop_kc, sim_farms.
Hours are hour-start labels: hour 13 is 13:00 to 14:00. The outage window "13:00-17:00" therefore covers hours 13 to 16.
"""
from datetime import date as _date
from typing import Optional

import pandas as pd

from app.engine import soil_inputs
from app.store import get_store

WEATHER = "weather_summer2026_sousse"
OUTAGES = "sim_outage_windows"
SCENARIOS = "sim_scenarios"
PUMPS = "sim_pumps_basin"

CAVEAT = "NASA POWER ~0.5 deg grid: coastal extremes smoothed"
TAG_SOURCE = "data/simulated/sim_scenarios + sim_outage_windows + sim_pumps_basin; weather NASA POWER; demand = ESTIMATE"

# ---------------------------------------------------------------- demand model (ESTIMATE)
# Peak-day irrigation demand of the farms that are actually growing in the month of the date:
#   daily_m3 = ET0_day (mm) x sum(Kc_mid x area_ha) x 10 / EFFICIENCY      (1 mm over 1 ha = 10 m3)
# No rain credit (peak day) and 0.9 application efficiency (the same efficiency as the season volumes of sim_farms).
# Farms whose crop is outside its growing season (cereals in August) and crops forbidden for TWW (lettuce) need nothing.
# The day's volume is spread evenly over the working hours 06:00-20:00 (hours 6 to 19): farmers irrigate when they work,
# not when ET peaks. Both choices are assumptions.
EFFICIENCY = 0.9
IRRIGATION_HOURS = tuple(range(6, 20))  # 06:00 to 20:00
DEMAND_STATUS = "ESTIMATE"


# ---------------------------------------------------------------- inputs
def load_day(day: str) -> list[dict]:
    """24 hourly rows {hour, temp_c, radiation_w_m2} for `day` (YYYY-MM-DD). ValueError if the day is not in the series."""
    df = get_store()[WEATHER]
    rows = df[df["date"].astype(str).str[:10] == day].sort_values("datetime")
    if len(rows) != 24:
        raise ValueError(f"weather for {day}: expected 24 hourly rows, found {len(rows)}")
    return [{"hour": int(pd.Timestamp(r["datetime"]).hour), "temp_c": float(r["temperature_2m"]),
             "radiation_w_m2": float(r["shortwave_radiation"])} for _, r in rows.iterrows()]


def daily_et0(day: str) -> float:
    """FAO-56 reference evapotranspiration of the day (mm), as computed in the data pack."""
    df = get_store()[WEATHER]
    rows = df[df["date"].astype(str).str[:10] == day]
    if rows.empty:
        raise ValueError(f"no weather for {day}")
    return float(rows.iloc[0]["daily_et0_fao_evapotranspiration"])


def _hour(hhmm: str) -> int:
    return int(str(hhmm).split(":")[0])


def outage_hours(day: str) -> list[int]:
    """Hours (0-23) without grid power on `day`: the windows of sim_outage_windows plus those of a scenario dated `day`."""
    store = get_store()
    windows: list[tuple[str, str]] = []
    out = store[OUTAGES]
    for _, r in out[out["date"].astype(str) == day].iterrows():
        windows.append((r["start"], r["end"]))
    for sc in store[SCENARIOS]["scenarios"]:
        if sc["date"] == day:
            windows += [tuple(w) for w in sc.get("grid_outage_windows", [])]
    return sorted({h for a, b in windows for h in range(_hour(a), _hour(b))})


def get_scenario(scenario_id: str) -> dict:
    """A scenario of sim_scenarios.json (date, batch volume, outage windows, PV size, initial basin level)."""
    for sc in get_store()[SCENARIOS]["scenarios"]:
        if sc["id"] == scenario_id:
            return sc
    raise KeyError(f"unknown scenario {scenario_id!r}")


def default_pump() -> dict:
    """Transfer pump TP1 of the simulated infrastructure: flow m3/h, power kW (and the energy it needs per m3)."""
    tp = next(p for p in get_store()[PUMPS]["transfer_pumps"] if p["id"] == "TP1")
    return {"id": tp["id"], "flow_m3_h": float(tp["flow_m3_h"]), "power_kW": float(tp["power_kW"]),
            "kwh_per_m3": float(tp["power_kW"]) / float(tp["flow_m3_h"])}


# ---------------------------------------------------------------- demand
def growing_farms(day: str) -> list[dict]:
    """Demo farms that need irrigation on `day`: crop in season for the month, not forbidden for treated water."""
    month = int(day[5:7])
    kc = get_store()["crop_kc"].set_index("crop")["kc_mid"]
    out = []
    for _, f in get_store()["sim_farms"].iterrows():
        crop = str(f["crop"])
        if crop not in soil_inputs.CROP_SEASON_MONTHS or soil_inputs._blocked_reason(crop) is not None:
            continue
        if month not in soil_inputs._months(soil_inputs.CROP_SEASON_MONTHS[crop]):
            continue
        out.append({"farm_id": str(f["farm_id"]), "crop": crop, "area_ha": float(f["area_ha"]),
                    "kc_mid": float(kc[soil_inputs.CROP_TO_KC[crop]])})
    return out


def daily_demand_m3(et0_mm: float, farms: list[dict]) -> float:
    """Peak-day irrigation demand: ET0 x sum(Kc x area) x 10 / efficiency (m3)."""
    return et0_mm * sum(f["kc_mid"] * f["area_ha"] for f in farms) * 10.0 / EFFICIENCY


def demand_profile(day: str) -> list[float]:
    """Irrigation demand per hour (m3), 24 values: the day's volume spread evenly over 06:00-20:00. ESTIMATE."""
    total = daily_demand_m3(daily_et0(day), growing_farms(day))
    per_hour = total / len(IRRIGATION_HOURS)
    return [per_hour if h in IRRIGATION_HOURS else 0.0 for h in range(24)]


# ---------------------------------------------------------------- the naive run
def naive_run(day: str, demand_m3_by_hour: list[float], pump: Optional[dict] = None) -> dict:
    """Naive policy: irrigate from the grid on demand. No basin buffer, no solar shifting.

    Per hour: pump_on, delivered_m3 (at most the pump flow), grid_kw (delivered x kWh/m3), unserved_m3.
    During an outage hour the pump cannot run, so everything demanded is unserved.
    hours_without_water = hours where something was demanded and nothing was delivered."""
    if len(demand_m3_by_hour) != 24:
        raise ValueError("demand_m3_by_hour must have 24 values")
    pump = pump or default_pump()
    weather = load_day(day)
    out_hours = set(outage_hours(day))
    hourly = []
    for h, demand in enumerate(demand_m3_by_hour):
        outage = h in out_hours
        delivered = 0.0 if outage else min(float(demand), pump["flow_m3_h"])
        hourly.append({"hour": h, "temp_c": weather[h]["temp_c"], "radiation_w_m2": weather[h]["radiation_w_m2"],
                       "outage": outage, "demand_m3": round(float(demand), 3), "pump_on": delivered > 0,
                       "delivered_m3": round(delivered, 3), "grid_kw": round(delivered * pump["kwh_per_m3"], 3),
                       "unserved_m3": round(float(demand) - delivered, 3)})
    return {
        "date": day, "policy": "naive", "outage_hours": sorted(out_hours), "hourly": hourly,
        "hours_without_water": sum(1 for r in hourly if r["demand_m3"] > 0 and r["delivered_m3"] == 0),
        "demand_m3": round(sum(r["demand_m3"] for r in hourly), 1),
        "delivered_m3": round(sum(r["delivered_m3"] for r in hourly), 1),
        "unserved_m3": round(sum(r["unserved_m3"] for r in hourly), 1),
        "grid_kwh": round(sum(r["grid_kw"] for r in hourly), 1),
        "demand_status": DEMAND_STATUS, "pump": pump,
        "tag": {"status": "SIMULATED", "source": TAG_SOURCE}, "caveat": CAVEAT,
    }


def naive_day(day: str) -> dict:
    """The naive run of `day` with the modelled demand profile."""
    return naive_run(day, demand_profile(day))
