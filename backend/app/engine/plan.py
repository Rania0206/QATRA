"""A-05a: rule-based allocation of one batch of treated water between the farms.

Simple, readable rules (no optimiser, no ML), applied in this order, per farm:
  1. Legal status (engine/rules.evaluate): a BLOCKED farm gets 0 m3 (its status is kept for display).
  2. Need: engine/needs.daily_need(farm, date).need_m3.
  3. CONDITIONAL farms are capped by the soil salinity model (engine/soil.cap_volume).
  4. Anti-rebound (always on): never more than the farm already takes from its own well / network that day.
  5. Sharing: if all capped needs fit in the batch, everybody gets them; otherwise the batch is shared
     in proportion to the capped needs.
  6. Whatever is left stays in the basin (a warning says how much).

DATE NOTE (demo data): the demo batches are dated July 2026, but the weather forecast in the data pack starts on
21 Nov 2026. The allocation date therefore defaults to the first forecast day and does NOT have to match the batch
date. Any other date works too (A-05e): its needs use the summer 2026 weather file, or the 30-year average of that
day (engine/needs.weather_for), and a warning says the weather is historical. The soil model uses long-term climate.
"""
import math
from typing import Callable, Optional

from pydantic import BaseModel

from app.engine import soil
from app.engine.batches import get_batch
from app.engine.compatibility import default_batch
from app.engine.farms import list_farms
from app.engine.needs import NeedItem, daily_need, forecast_dates
from app.engine.rules import evaluate
from app.engine.schedule import Scenario, schedule
from app.schemas import Allocation, AllocationItem, Batch, Farm

# Anti-rebound: a farm's current fresh-water use is stored per SEASON (sim_farms.current_fresh_water_m3_per_season,
# built in scripts/07_simulate.py from ~1000 mm of ET0 per season). 1000 mm of ET0 is about 180 days at the
# 5-6 mm/day of an irrigation season, so the daily well use is season / 180 (ESTIMATE, adjustable).
SEASON_DAYS = 180

# Volumes are rounded DOWN to 0.1 m3, so the rounded items can never add up to more than the batch.
STEP = 0.1


class AllocateOptions(BaseModel):
    farm_ids: Optional[list[str]] = None  # only these farms (default: all)
    soil_ece: Optional[dict[str, float]] = None  # judge override of a farm's soil ECe (dS/m), by farm id: "break it" demo


class PlanItem(AllocationItem):
    """Contract AllocationItem (farm_id, status, m3, cap_reason?) plus the working, for display and tests."""

    compat_status: str  # compatible | conditional | blocked, from engine/rules
    need_m3: float  # daily need of the crop (ET0 x Kc - effective rain)
    capped_m3: float  # after the legal block, the soil cap and the anti-rebound rule, before sharing


class Plan(BaseModel):
    date: str
    batch_id: str
    batch_volume_m3: float
    items: list[PlanItem]
    total_allocated_m3: float
    fresh_replaced_m3: float  # = total allocated: every m3 of treated water replaces a m3 of well water
    warnings: list[str]


def _floor(x: float) -> float:
    return math.floor(x / STEP + 1e-9) * STEP


def _batch_ec(batch: Batch) -> Optional[float]:
    for a in batch.analyses:
        if "EC_dS_m" in a.values:
            return a.values["EC_dS_m"]
    return None


def _soil_cap(farm: Farm, need_m3: float, ecw: Optional[float], warnings: list[str]) -> tuple[float, Optional[str]]:
    """Daily volume a conditional farm may take without pushing its soil over the crop's salt threshold."""
    if ecw is None:
        warnings.append(f"Farm {farm.id}: batch EC unknown, soil cap not applied.")
        return need_m3, None
    try:
        cap = soil.cap_volume(
            {"id": farm.id, "crop": farm.crop, "area_ha": farm.area_ha, "soil_ece": farm.soil_ece, "soil_texture": farm.soil_texture},
            ecw,
        )
    except (KeyError, ValueError) as e:  # crop unknown to the soil model: no cap, say so
        warnings.append(f"Farm {farm.id}: soil cap not computed ({e}).")
        return need_m3, None
    season_need = cap["need_m3_season"]
    ratio = 1.0 if season_need <= 0 else min(1.0, cap["max_m3_season"] / season_need)
    if ratio >= 1.0:
        return need_m3, None
    return need_m3 * ratio, f"soil salinity: limited volume ({cap['reason_text']})"


def _blocked_reason(results) -> str:
    """The most specific failed legal rule: "eaten raw" first, then the others in rule order."""
    failed = [r for r in results if not r.passed and r.severity == "block"]
    failed.sort(key=lambda r: r.rule_id != "R-RAW-EATEN")
    return failed[0].reason_en if failed else "blocked by the rules"


NeedFn = Callable[[Farm, str], Optional[NeedItem]]


def allocate(batch: Batch, date: Optional[str] = None, options: Optional[AllocateOptions] = None,
             need_fn: NeedFn = daily_need) -> Plan:
    """need_fn(farm, day) gives the farm's need of that day (default: the forecast need of engine/needs). A scenario on a
    day the forecast does not cover (the summer heatwave) passes its own need function; the rules stay the same."""
    options = options or AllocateOptions()
    dates = forecast_dates()
    day = date or (dates[0] if dates else "")
    farms = [f for f in list_farms() if options.farm_ids is None or f.id in options.farm_ids]
    if options.soil_ece:  # the rules, the soil cap and the plan all see the overridden salinity
        farms = [f.model_copy(update={"soil_ece": options.soil_ece[f.id]}) if f.id in options.soil_ece else f for f in farms]
    ecw = _batch_ec(batch)
    warnings: list[str] = []

    if batch.analysis_status != "valid":
        warnings.append(f"Batch {batch.id}: analysis {batch.analysis_status}, so no farm can receive it (Decree 89-1047 Art. 3).")
    elif batch.status == "non_compliant":
        warnings.append(f"Batch {batch.id}: a measured value is above an NT 106.03 limit, so no farm can receive it.")

    rows = []  # one dict per farm: the working
    sources: set[str] = set()
    for farm in farms:
        ev = evaluate(farm, batch)
        n = need_fn(farm, day)
        if getattr(n, "weather_source", None):  # a custom need_fn may return items without it
            sources.add(n.weather_source)
        need = (n.need_m3 or 0.0) if n else 0.0
        if n is None:
            warnings.append(f"Farm {farm.id}: no weather for {day}, need taken as 0.")
        elif n.need_m3 is None:
            warnings.append(f"Farm {farm.id}: crop {farm.crop} has no Kc, need taken as 0.")

        reason: Optional[str] = None
        if ev["status"] == "blocked":
            capped, reason = 0.0, _blocked_reason(ev["results"])
        else:
            capped = need
            if ev["status"] == "conditional":  # 3. soil cap
                capped, reason = _soil_cap(farm, need, ecw, warnings)
            well_per_day = farm.fresh_m3_season / SEASON_DAYS  # 4. anti-rebound
            if capped > well_per_day:
                capped, reason = well_per_day, f"anti-rebound: not more than the {well_per_day:.1f} m3/day already taken from the {farm.fresh_source}"
        rows.append({"farm": farm, "status": ev["status"], "need": need, "capped": capped, "reason": reason})

    if "historical" in sources:
        warnings.append(f"Weather for {day}: historical data (not a forecast).")

    requested = sum(r["capped"] for r in rows)  # 5. sharing
    share = 1.0 if requested <= batch.volume_m3 else batch.volume_m3 / requested
    items = []
    for r in rows:
        alloc = _floor(r["capped"] * share)
        reason = r["reason"]
        if share < 1.0 and r["capped"] > 0:
            reason = "shared in proportion: the batch is smaller than the total need" + (f" (also {reason})" if reason else "")
        if r["status"] == "blocked":
            status = "blocked"
        elif r["status"] == "conditional":
            status = "conditional"
        else:
            status = "capped" if alloc < r["need"] - 0.05 else "allocated"
        items.append(PlanItem(
            farm_id=r["farm"].id, status=status, m3=round(alloc, 1), cap_reason=reason,
            compat_status=r["status"], need_m3=round(r["need"], 1), capped_m3=round(r["capped"], 1),
        ))

    total = round(sum(i.m3 for i in items), 1)
    leftover = round(batch.volume_m3 - total, 1)
    if leftover > max(1.0, STEP * len(items)):  # 6. leftover (rounding down loses up to 0.1 m3 per farm: not worth a warning)
        warnings.append(f"{leftover:g} m3 not allocated: kept in the basin.")
    return Plan(date=day, batch_id=batch.id, batch_volume_m3=batch.volume_m3, items=items,
                total_allocated_m3=total, fresh_replaced_m3=total, warnings=warnings)


# ---------------------------------------------------------------- A-05d: allocation + pump schedule = the contract Allocation
def plan(batch_id: Optional[str] = None, date: Optional[str] = None, scenario: Scenario = "normal",
         farm_ids: Optional[list[str]] = None, need_fn: NeedFn = daily_need,
         soil_ece: Optional[dict[str, float]] = None) -> Optional[Allocation]:
    """Who gets how much (allocate) and when the pump runs (schedule). None if the batch does not exist.

    Default batch: the latest one that is not analysis_invalid (the same default as the compatibility screen).
    """
    batch = get_batch(batch_id) if batch_id else default_batch()
    if batch is None:
        return None
    p = allocate(batch, date, AllocateOptions(farm_ids=farm_ids, soil_ece=soil_ece), need_fn)
    s = schedule(p.total_allocated_m3, p.date, scenario)
    return Allocation(
        batch_id=batch.id,
        items=[AllocationItem(farm_id=i.farm_id, status=i.status, m3=i.m3, cap_reason=i.cap_reason) for i in p.items],
        schedule=s.slots,
        energy_kwh=s.energy_kwh,
        solar_share=s.solar_share,
        fresh_replaced_m3=s.pumped_m3,  # what actually reaches the farms
        warnings=p.warnings + s.warnings,
    )
