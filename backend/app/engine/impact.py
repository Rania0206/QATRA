"""Aggregated impact over every simulated batch (GET /api/impact): totals only, no farm name.

For each batch the live allocator plan() runs on the default day (Dev A's allocator and pump schedule); the answers are added up.
"""
from functools import lru_cache
from typing import Optional

from pydantic import BaseModel

from app.engine.batches import list_batches
from app.engine.farms import list_farms
from app.engine.plan import plan
from app.schemas import Tag
from app.store import get_store


class ImpactSummary(BaseModel):
    period: str  # first and last batch date, "YYYY-MM-DD/YYYY-MM-DD"
    tww_allocated_m3: float
    fresh_water_saved_m3: float
    energy_kwh: float
    solar_share: float  # solar kWh / total kWh over all the pumping, 0..1
    co2_avoided_kg: Optional[float] = None  # null while the grid emission factor is TO_VERIFY (energy_params.json)
    farms_served: int
    small_farms_served: int
    batches_blocked: int  # batches that could not send any water (analysis or compatibility)
    tag: Tag


def _emission_factor() -> Optional[float]:
    v = get_store()["energy_params"].get("grid_emission_factor_kgCO2_kWh", {}).get("value")
    return float(v) if v is not None else None


@lru_cache(maxsize=1)
def _summary() -> ImpactSummary:
    batches = list_batches()
    small = {f.id for f in list_farms() if f.is_small_farm}
    served: set[str] = set()
    tww = fresh = energy = solar_kwh = 0.0
    blocked = 0
    for b in batches:
        a = plan(b.id)
        if a is None:
            continue
        sent = sum(i.m3 for i in a.items)
        if sent <= 0:
            blocked += 1
            continue
        tww += sent
        fresh += a.fresh_replaced_m3
        energy += a.energy_kwh
        solar_kwh += a.solar_share * a.energy_kwh
        served |= {i.farm_id for i in a.items if i.m3 > 0}
    factor = _emission_factor()
    dates = sorted(b.date[:10] for b in batches)
    grid_kwh_avoided = solar_kwh  # solar kWh are kWh the grid does not have to supply
    return ImpactSummary(
        period=f"{dates[0]}/{dates[-1]}" if dates else "",
        tww_allocated_m3=round(tww, 1),
        fresh_water_saved_m3=round(fresh, 1),
        energy_kwh=round(energy, 1),
        solar_share=round(solar_kwh / energy, 3) if energy else 0.0,
        co2_avoided_kg=round(grid_kwh_avoided * factor, 1) if factor is not None else None,
        farms_served=len(served),
        small_farms_served=len(served & small),
        batches_blocked=blocked,
        tag=Tag(status="ESTIMATE", source="SIMULATED batches x allocation (Dev A's allocator and pump schedule)"),
    )


def impact() -> ImpactSummary:
    return _summary()
