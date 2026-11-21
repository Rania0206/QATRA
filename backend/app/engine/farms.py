"""A-03b: demo farms (data/simulated/sim_farms) as shared Farm objects, read through the store.

- head_m and pump_efficiency come from sim_pumps_basin["farm_well_pumps"] (per-farm well pump).
- well_depth_m: no well-depth column exists in the data (head_m is the pumping head, not the well
  depth), so it stays None; the savings engine uses editable defaults.
"""
import math
from typing import Optional

import pandas as pd

from app.schemas import Farm, Tag
from app.store import get_store

FARMS_DATASET = "sim_farms"
PUMPS_DATASET = "sim_pumps_basin"
SOURCE = "data/simulated/sim_farms"


def _num(v) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def _well_pumps() -> dict[str, dict]:
    pumps = get_store().get(PUMPS_DATASET) or {}
    return {str(p["farm_id"]): p for p in pumps.get("farm_well_pumps", [])}


def _row_to_farm(row: pd.Series, pumps: dict[str, dict]) -> Farm:
    fid = str(row["farm_id"])
    pump = pumps.get(fid, {})
    # soil_texture_demo may carry a note: "sandy loam (SIMULATED override ...)" -> "sandy loam"
    texture = str(row.get("soil_texture_demo") or row["soil_texture"]).split(" (")[0]
    return Farm(
        id=fid,
        name=str(row["name"]),
        crop=str(row["crop"]),
        area_ha=float(row["area_ha"]),
        lat=float(row["lat"]),
        lon=float(row["lon"]),
        soil_texture=texture,
        soil_ece=float(row["soil_ECe_dS_m"]),
        head_m=_num(pump.get("head_m")),
        distance_km=float(row["distance_to_plant_km"]),
        fresh_source=str(row["current_fresh_water_source"]),
        fresh_m3_season=float(row["current_fresh_water_m3_per_season"]),
        is_small_farm=bool(row["is_small_farm"]),
        well_depth_m=None,
        pump_efficiency=_num(pump.get("efficiency")),
        tag=Tag(status="SIMULATED", source=SOURCE),
    )


def list_farms() -> list[Farm]:
    pumps = _well_pumps()
    return [_row_to_farm(row, pumps) for _, row in get_store()[FARMS_DATASET].iterrows()]


def get_farm(farm_id: str) -> Optional[Farm]:
    return next((f for f in list_farms() if f.id == str(farm_id)), None)
