"""Heatwave + grid-outage scenario (B-05a naive policy, B-05b QATRA policy). Numbers only, no FastAPI.

Naive policy: irrigate straight from the grid on demand, with no basin and no solar shifting. When the grid is cut,
nothing is delivered.
QATRA policy: a rule-based hourly plan that uses the solar array and the storage basin so that the farms keep their
water during the outage (see qatra_run for the rules).

Sources: weather_summer2026_sousse (NASA POWER hourly + FAO-56 ET0), pv_estimate_sousse (50 kWp, scaled to the
array), sim_outage_windows and sim_scenarios (13:00-17:00 outage on hot days), sim_pumps_basin (transfer pump TP1,
basin, PV array), crop_kc and sim_farms. The crop water need is Dev A's formula (engine/needs.py).
Hours are hour-start labels: hour 13 is 13:00 to 14:00. The outage window "13:00-17:00" therefore covers hours 13 to 16.
"""
from typing import Optional

import pandas as pd

from app.engine import needs, soil_inputs
from app.engine.batches import get_batch
from app.engine.plan import AllocateOptions, Plan, allocate
from app.schemas import Farm
from app.store import get_store

WEATHER = "weather_summer2026_sousse"
PV = "pv_estimate_sousse"
OUTAGES = "sim_outage_windows"
SCENARIOS = "sim_scenarios"
PUMPS = "sim_pumps_basin"

CAVEAT = "NASA POWER ~0.5 deg grid: coastal extremes smoothed"
TAG_SOURCE = "data/simulated/sim_scenarios + sim_outage_windows + sim_pumps_basin; weather NASA POWER; demand = ESTIMATE"
EPS = 1e-9

# ---------------------------------------------------------------- demand model (ESTIMATE)
# Irrigation demand of the farms that are actually growing in the month of the date:
#   need_i (m3)  = max(0, ET0 x Kc_i - 0.7 x rain) x area_i x 10          (Dev A's needs.water_need)
#   daily_m3     = sum(need_i) / EFFICIENCY                                (0.9 application efficiency, as in sim_farms)
# Farms whose crop is outside its growing season (cereals in August) and crops forbidden for treated water (lettuce)
# need nothing. The day's volume is spread evenly over the working hours 06:00-20:00 (hours 6 to 19): farmers
# irrigate when they work, not when ET peaks. These choices are assumptions.
EFFICIENCY = 0.9
IRRIGATION_HOURS = tuple(range(6, 20))  # 06:00 to 20:00
DEMAND_STATUS = "ESTIMATE"


# ---------------------------------------------------------------- inputs
def _day_rows(day: str) -> pd.DataFrame:
    df = get_store()[WEATHER]
    return df[df["date"].astype(str).str[:10] == day].sort_values("datetime")


def load_day(day: str) -> list[dict]:
    """24 hourly rows {hour, temp_c, radiation_w_m2} for `day` (YYYY-MM-DD). ValueError if the day is not in the series."""
    rows = _day_rows(day)
    if len(rows) != 24:
        raise ValueError(f"weather for {day}: expected 24 hourly rows, found {len(rows)}")
    return [{"hour": int(pd.Timestamp(r["datetime"]).hour), "temp_c": float(r["temperature_2m"]),
             "radiation_w_m2": float(r["shortwave_radiation"])} for _, r in rows.iterrows()]


def daily_et0(day: str) -> float:
    """FAO-56 reference evapotranspiration of the day (mm), as computed in the data pack."""
    rows = _day_rows(day)
    if rows.empty:
        raise ValueError(f"no weather for {day}")
    return float(rows.iloc[0]["daily_et0_fao_evapotranspiration"])


def daily_rain(day: str) -> float:
    rows = _day_rows(day)
    if rows.empty:
        raise ValueError(f"no weather for {day}")
    return float(rows.iloc[0]["daily_precipitation_sum"])


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


def basin_params() -> dict:
    b = get_store()[PUMPS]["storage_basin"]
    return {"id": b["id"], "capacity_m3": float(b["capacity_m3"]), "initial_level_m3": float(b["initial_level_m3"]),
            "evaporation_mm_d": float(b.get("evaporation_mm_d_summer", 0))}


def pv_kw(day: str, kwp: float) -> list[float]:
    """Solar power per hour (kW, equal to the kWh of the hour) of an array of `kwp`, from the 50 kWp estimate of the data pack."""
    df = get_store()[PV]
    rows = df[(df["datetime"].astype(str).str[:10] == day) & (df["period"] == "summer2026")].sort_values("datetime")
    if len(rows) != 24:
        raise ValueError(f"PV estimate for {day}: expected 24 hourly rows, found {len(rows)}")
    return [float(r["pv_kwh"]) * kwp / float(r["pv_kwp"]) for _, r in rows.iterrows()]


# ---------------------------------------------------------------- demand
def growing_farms(day: str) -> list[dict]:
    """Demo farms that need irrigation on `day`: crop in season for the month, not forbidden for treated water."""
    month = int(day[5:7])
    out = []
    for _, f in get_store()["sim_farms"].iterrows():
        crop = str(f["crop"])
        kc = needs.kc_for(crop, day)
        if kc is None or crop not in soil_inputs.CROP_SEASON_MONTHS or soil_inputs._blocked_reason(crop) is not None:
            continue
        if month not in soil_inputs._months(soil_inputs.CROP_SEASON_MONTHS[crop]):
            continue
        out.append({"farm_id": str(f["farm_id"]), "crop": crop, "area_ha": float(f["area_ha"]), "kc": float(kc)})
    return out


def farm_needs(day: str) -> list[dict]:
    """Daily water need of each growing farm (m3), with Dev A's formula (ET0 x Kc - effective rain)."""
    et0, rain = daily_et0(day), daily_rain(day)
    return [{**f, "need_m3": needs.water_need(et0, f["kc"], rain, f["area_ha"])["need_m3"]} for f in growing_farms(day)]


def daily_demand_m3(day: str) -> float:
    """Irrigation demand of the day: the farms' needs divided by the application efficiency (m3)."""
    return sum(f["need_m3"] for f in farm_needs(day)) / EFFICIENCY


def spread_demand(total_m3: float) -> list[float]:
    """A day's volume spread evenly over the working hours 06:00-20:00 (24 values, m3 per hour)."""
    per_hour = total_m3 / len(IRRIGATION_HOURS)
    return [per_hour if h in IRRIGATION_HOURS else 0.0 for h in range(24)]


def demand_profile(day: str) -> list[float]:
    """Irrigation demand per hour (m3), 24 values: the crop need of the day spread evenly over 06:00-20:00. ESTIMATE."""
    return spread_demand(daily_demand_m3(day))


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


# ---------------------------------------------------------------- the QATRA run
def qatra_run(day: str, demand_m3_by_hour: Optional[list[float]] = None, pump: Optional[dict] = None,
              basin_initial_m3: Optional[float] = None, pv_kwp: Optional[float] = None,
              batch_m3: Optional[float] = None) -> dict:
    """QATRA policy: a rule-based hourly plan on solar and the storage basin.

    Rules, applied hour by hour (pump TP1: flow and power are proportional, so a pump on part of the solar power
    delivers the matching part of its flow; gravity flow from the basin to the farms is not limited):
      1. Outside the outage, the pump irrigates on SOLAR first (up to the solar power of the hour).
      2. What solar cannot give is taken from the BASIN by gravity, as long as the basin keeps the reserve the outage
         will need (the demand of the outage hours still to come).
      3. Only what is left is pumped from the GRID (backup). The grid never runs during the outage.
      4. During the outage the farms are irrigated from the basin by gravity.
      5. Solar surplus (what the farms do not use) pumps treated water into the basin, never above its capacity.
    The plant supplies at most `batch_m3` of water in the day (None: no limit). Basin evaporation (8 mm/d) is not
    applied: the basin area is not in the data and 8 mm on a basin of ~1,000 m2 is under 10 m3 a day."""
    pump = pump or default_pump()
    basin = basin_params()
    cap = basin["capacity_m3"]
    level = basin["initial_level_m3"] if basin_initial_m3 is None else float(basin_initial_m3)
    demand = demand_profile(day) if demand_m3_by_hour is None else [float(x) for x in demand_m3_by_hour]
    if len(demand) != 24:
        raise ValueError("demand_m3_by_hour must have 24 values")
    kwp = float(get_store()[PUMPS]["pv_array"]["kWp"]) if pv_kwp is None else float(pv_kwp)
    solar = pv_kw(day, kwp)
    out_hours = set(outage_hours(day))
    k, flow = pump["kwh_per_m3"], pump["flow_m3_h"]
    plant_left = float("inf") if batch_m3 is None else float(batch_m3)
    hourly = []

    for h in range(24):
        d, outage = demand[h], h in out_hours
        reserve = sum(demand[x] for x in out_hours if x > h)  # outage water still to come today
        pv, direct_solar, from_basin, from_grid, pumped = solar[h], 0.0, 0.0, 0.0, 0.0
        if outage:
            from_basin = min(d, level)
        else:
            direct_solar = min(d, flow, pv / k, plant_left)  # 1. solar first
            rest = d - direct_solar
            if rest > EPS:
                from_basin = min(rest, max(0.0, level - reserve))  # 2. basin, keeping the outage reserve
                rest -= from_basin
            if rest > EPS:  # 3. grid backup (never in an outage)
                from_grid = min(rest, flow - direct_solar, plant_left - direct_solar)
                from_grid = max(0.0, from_grid)
        level -= from_basin
        pumped_for_farms = direct_solar + from_grid
        plant_left -= pumped_for_farms
        solar_for_farms = direct_solar * k
        # 5. solar surplus fills the basin
        spare_flow = flow - pumped_for_farms
        spare_pv = max(0.0, pv - solar_for_farms)
        fill = max(0.0, min(spare_pv / k, spare_flow, cap - level, plant_left))
        level += fill
        plant_left -= fill
        level = min(max(level, 0.0), cap)  # clamp before the hour is recorded (float noise must not show)
        solar_kw = solar_for_farms + fill * k
        grid_kw = from_grid * k
        delivered = direct_solar + from_basin + from_grid
        pump_kw = solar_kw + grid_kw
        source = "grid" if grid_kw > EPS else "basin" if from_basin > EPS else "solar" if solar_kw > EPS else "off"
        hourly.append({"hour": h, "outage": outage, "demand_m3": round(d, 3), "delivered_m3": round(delivered, 3),
                       "unserved_m3": round(d - delivered, 3), "grid_kw": round(grid_kw, 3), "solar_kw": round(solar_kw, 3),
                       "pump_kw": round(pump_kw, 3), "basin_m3": round(level, 3), "basin_out_m3": round(from_basin, 3),
                       "basin_in_m3": round(fill, 3), "source": source})

    solar_kwh, grid_kwh = sum(r["solar_kw"] for r in hourly), sum(r["grid_kw"] for r in hourly)
    return {
        "date": day, "policy": "qatra", "outage_hours": sorted(out_hours), "hourly": hourly,
        "hours_without_water": sum(1 for r in hourly if r["demand_m3"] > 0 and r["delivered_m3"] == 0),
        "demand_m3": round(sum(r["demand_m3"] for r in hourly), 1),
        "delivered_m3": round(sum(r["delivered_m3"] for r in hourly), 1),
        "unserved_m3": round(sum(r["unserved_m3"] for r in hourly), 1),
        "grid_kwh": round(grid_kwh, 1), "solar_kwh": round(solar_kwh, 1),
        "solar_share": round(solar_kwh / (solar_kwh + grid_kwh), 3) if solar_kwh + grid_kwh > EPS else 0.0,
        "basin_capacity_m3": cap, "basin_initial_m3": float(basin["initial_level_m3"] if basin_initial_m3 is None else basin_initial_m3),
        "basin_final_m3": round(level, 1), "pv_kwp": kwp, "demand_status": DEMAND_STATUS, "pump": pump,
        "tag": {"status": "SIMULATED", "source": TAG_SOURCE}, "caveat": CAVEAT,
    }


# ---------------------------------------------------------------- scenario result (POST /api/scenarios/heatwave)
SCHEDULE_NOTE = ("Hourly schedule: the heatwave model of this scenario (pump power proportional to its flow, farms irrigated from the "
                 "basin during the outage). The A-05 pump schedule is not used here: it calls solar only when the PV output reaches "
                 "the full pump power ({kw:g} kW) and the array peaks at {peak:.1f} kW this day, and it does not model farm draws.")


def heatwave_need(farm: Farm, day: str) -> Optional[needs.NeedItem]:
    """The need of one farm on a heatwave day, with Dev A's formula (engine/needs.py) on the summer weather.

    Dev A's forecast file does not cover this summer day, so the plan receives this function (plan.allocate need_fn)."""
    try:
        et0, rain = daily_et0(day), daily_rain(day)
    except ValueError:
        return None
    kc = needs.kc_for(farm.crop, day)
    if kc is None:
        return needs.NeedItem(date=day, farm_id=farm.id, et0_mm=round(et0, 2), effective_rain_mm=round(needs.RAIN_EFFICIENCY * rain, 2))
    n = needs.water_need(et0, kc, rain, farm.area_ha)
    return needs.NeedItem(date=day, farm_id=farm.id, et0_mm=round(et0, 2), kc=round(kc, 2), etc_mm=round(n["etc_mm"], 2),
                          effective_rain_mm=round(n["effective_rain_mm"], 2), need_mm=round(n["need_mm"], 2),
                          need_m3=round(n["need_m3"], 1))


def scenario_plan(sc: dict) -> tuple[Plan, list[str]]:
    """Dev A's rule-based allocation (legal status, soil cap, anti-rebound, sharing) of the scenario batch on its day.

    Only the farms growing that month are planned, plus the farms whose crop is forbidden for treated water (shown as
    blocked, 0 m3). Farms whose crop is not growing are left out and named in the notes."""
    day = sc["date"]
    batch = get_batch(sc["batch_id"])
    if batch is None:
        raise ValueError(f"scenario batch {sc['batch_id']} not found")
    growing = {f["farm_id"] for f in growing_farms(day)}
    ids, idle = [], []
    for _, f in get_store()["sim_farms"].iterrows():
        fid, crop = str(f["farm_id"]), str(f["crop"])
        blocked = crop in soil_inputs.CROP_SEASON_MONTHS and soil_inputs._blocked_reason(crop) is not None
        (ids if fid in growing or blocked else idle).append(fid)
    plan = allocate(batch, day, AllocateOptions(farm_ids=ids), need_fn=heatwave_need)
    notes = [f"Farms {', '.join(idle)} are not irrigated: their crop is not growing in this month."] if idle else []
    return plan, notes


def _series(run: dict, policy: str) -> dict:
    """The hourly series the UI draws for one policy, in one shape for both."""
    rows = []
    for r in run["hourly"]:
        rows.append({"hour": r["hour"], "outage": r["outage"], "demand_m3": r["demand_m3"], "delivered_m3": r["delivered_m3"],
                     "unserved_m3": r["unserved_m3"], "grid_kw": r["grid_kw"], "solar_kw": r.get("solar_kw", 0.0),
                     "basin_m3": r.get("basin_m3"), "source": r.get("source", "grid" if r["grid_kw"] > 0 else "off")})
    return {"policy": policy, "hours_without_water": run["hours_without_water"], "unserved_m3": run["unserved_m3"],
            "delivered_m3": run["delivered_m3"], "grid_kwh": run["grid_kwh"], "solar_kwh": run.get("solar_kwh", 0.0),
            "hourly": rows}


def run_scenario(scenario_id: str) -> dict:
    """Contract shape of POST /api/scenarios/heatwave: the QATRA plan against the naive one, hour by hour.

    Who gets how much comes from Dev A's plan (A-05a: legal block, soil cap, anti-rebound, sharing). Both policies then
    irrigate that allocated volume, spread over 06:00-20:00, so the two runs and the allocation always agree."""
    sc = get_scenario(scenario_id)  # KeyError for an unknown scenario
    day = sc["date"]
    plan, notes = scenario_plan(sc)
    demand = spread_demand(plan.total_allocated_m3)
    naive = naive_run(day, demand)
    qatra = qatra_run(day, demand, basin_initial_m3=sc.get("basin_initial_m3"), pv_kwp=sc.get("pv_kWp"),
                      batch_m3=sc.get("batch_volume_m3"))
    warnings = [*plan.warnings, *notes]
    if qatra["outage_hours"]:
        a, b = qatra["outage_hours"][0], qatra["outage_hours"][-1] + 1
        warnings.insert(0, f"Grid outage {a:02d}:00-{b:02d}:00: irrigation moved to solar hours and the basin; the grid never runs in the outage.")
    if qatra["unserved_m3"] > 0.05:
        warnings.append(f"{qatra['unserved_m3']:.1f} m3 of the allocated volume could not be delivered.")
    stored = sum(r["basin_in_m3"] for r in qatra["hourly"])
    if stored > 0.5:
        warnings.append(f"Solar surplus: {stored:.0f} m3 pumped into the basin and kept for the next days "
                        f"(basin {qatra['basin_initial_m3']:.0f} to {qatra['basin_final_m3']:.0f} m3). The plan's energy counts it.")
    pump = default_pump()
    warnings.append(SCHEDULE_NOTE.format(kw=pump["power_kW"], peak=max(pv_kw(day, qatra["pv_kwp"]))))
    warnings.append("Basin evaporation is not applied (basin area not in the data).")
    warnings.append(CAVEAT)
    schedule = [{"hour": r["hour"], "pump_kw": r["pump_kw"], "source": r["source"], "basin_m3": r["basin_m3"]} for r in qatra["hourly"]]
    items = [{"farm_id": i.farm_id, "status": i.status, "m3": i.m3, "cap_reason": i.cap_reason} for i in plan.items]
    allocation = {"batch_id": sc["batch_id"], "items": items, "schedule": schedule,
                  "energy_kwh": round(qatra["solar_kwh"] + qatra["grid_kwh"], 1), "solar_share": qatra["solar_share"],
                  "fresh_replaced_m3": qatra["delivered_m3"], "warnings": warnings}
    return {"scenario_id": sc["id"], "label": sc["label"], "date": day, "allocation": allocation,
            "baseline": {"energy_kwh": naive["grid_kwh"], "solar_share": 0.0},
            "naive": _series(naive, "naive"), "qatra": _series(qatra, "qatra"), "caveat": CAVEAT,
            "tag": {"status": "SIMULATED", "source": "data/simulated/sim_scenarios.json"}}
