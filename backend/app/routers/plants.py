"""Treatment plants and map layers (B-13). Everything comes from the in-memory store."""
import math
from typing import Any

import pandas as pd
from fastapi import APIRouter

from app.schemas import MapLayer, MapLayersResponse, Plant, Tag
from app.store import get_store

router = APIRouter(prefix="/api", tags=["plants"])

# Id used by Dev A's batches and by frontend/src/mocks/plants.json. Do NOT slugify this one.
SOUSSE_SUD_ID = "w27944541"
SOUSSE_SUD_NAME = "Sousse Sud"
SOUSSE_SUD_SOURCE = "nearest OSM plant, identity assumed"
CAPACITY_NOTE = "capacity != volume available to farmers"
OSM_SOURCE = "OpenStreetMap contributors via Overpass (ODbL): incomplete, not an official inventory"
IRRIGATED_SOURCE = "Ministere de l'Agriculture / Agridata via data.gov.tn (tww_irrigated_areas)"
PERIMETER = "Zaouiet Sousse"


# ---------------------------------------------------------------- helpers
def _clean(v: Any) -> Any:
    """NaN / pandas NA -> None, numpy scalars -> python."""
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v.item() if hasattr(v, "item") else v


def _num(v: Any) -> float | None:
    v = _clean(v)
    if v is None:
        return None
    f = float(v)
    return None if math.isnan(f) else f


def _slug(name: str) -> str:
    return name.lower().replace(" ", "_")


def _status(raw: str) -> str:
    """'REPORTED (capacity...) / TO_VERIFY (...)' -> first known status word. Unknown -> TO_VERIFY."""
    first = str(raw).strip().split(" ")[0].strip("(),/")
    return first if first in ("REPORTED", "ESTIMATE", "PROJECTION", "SIMULATED", "TO_VERIFY") else "TO_VERIFY"


# ---------------------------------------------------------------- plants
def _sousse_sud_position() -> tuple[float | None, float | None]:
    """The CSV has no coordinates for Sousse Sud: use the assumed OSM plant from the simulated pack."""
    try:
        p = get_store()["sim_pumps_basin"]["plant"]
        if p.get("osm_id") == SOUSSE_SUD_ID:
            return _num(p["lat"]), _num(p["lon"])
    except (KeyError, TypeError):
        pass
    return None, None


def build_plants() -> list[Plant]:
    out: list[Plant] = []
    for _, r in get_store()["plants_details"].iterrows():
        name = str(r["plant"])
        capacity = _num(r["capacity_current_m3_d"])
        lat, lon = _num(r["lat"]), _num(r["lon"])
        if name == SOUSSE_SUD_NAME:
            pid = SOUSSE_SUD_ID
            lat, lon = _sousse_sud_position()
            tag = Tag(status="TO_VERIFY", source=f"{SOUSSE_SUD_SOURCE}; {CAPACITY_NOTE}")
        else:
            pid = _slug(name)
            src = _clean(r["source"])
            if capacity is not None:
                src = f"{src}; {CAPACITY_NOTE}" if src else CAPACITY_NOTE
            tag = Tag(status=_status(r["status"]), source=src)
        out.append(Plant(id=pid, name=name, governorate=str(r["governorate"]),
                         serves_perimeter=_clean(r["serves_perimeter"]),
                         treatment_level=str(r["treatment_level"]),
                         capacity_m3_d=capacity, lat=lat, lon=lon, tag=tag))
    return out


@router.get("/plants", response_model=list[Plant])
def list_plants():
    return build_plants()


# ---------------------------------------------------------------- map layers
def _plant_layer() -> MapLayer:
    lat, lon = _sousse_sud_position()
    return MapLayer(
        id="plants", label="Treatment plants",
        tag=Tag(status="TO_VERIFY", source=f"{SOUSSE_SUD_SOURCE}; {CAPACITY_NOTE}"),
        features=[{"id": SOUSSE_SUD_ID, "name": "Sousse Sud WWTP", "lat": lat, "lon": lon}])


def _irrigated_layer() -> MapLayer:
    """Zaouiet-Sousse perimeter. The data has an area, not a location: lat/lon stay null."""
    df = get_store()["tww_irrigated_areas"]
    rows = df[(df["perimeter"] == PERIMETER) & (~df["is_total_row"].astype(bool))]
    feats = []
    if not rows.empty:
        r = rows.sort_values("campaign").iloc[-1]  # latest campaign
        feats.append({"id": "zaouiet_sousse", "name": f"{PERIMETER} perimeter", "lat": None, "lon": None,
                      "area_ha": _num(r["area_equipped_ha"]), "wwtp": _clean(r["wwtp"]),
                      "campaign": _clean(r["campaign"]),
                      "tww_distributed_m3_yr": _num(r["tww_volume_distributed_m3_yr"])})
    return MapLayer(id="irrigated_areas", label="TWW irrigated area",
                    tag=Tag(status="REPORTED", source=IRRIGATED_SOURCE), features=feats)


def _osm_plants_layer() -> MapLayer:
    df = get_store()["plants_sousse_osm"]
    feats = []
    for _, r in df.iterrows():
        osm_id = str(r["osm_id"])
        if osm_id == SOUSSE_SUD_ID:
            continue  # already in the "plants" layer
        name = _clean(r.get("name")) or _clean(r.get("name_osm")) or f"Unnamed OSM wastewater plant ({osm_id})"
        feats.append({"id": osm_id, "name": name, "lat": _num(r["lat"]), "lon": _num(r["lon"])})
    return MapLayer(id="osm_plants", label="OSM wastewater plants near Sousse",
                    tag=Tag(status="REPORTED", source=OSM_SOURCE), features=feats)


def _farms_layer() -> MapLayer:
    df = get_store()["sim_farms"]
    feats = [{"id": str(r["farm_id"]), "name": str(r["name"]), "lat": _num(r["lat"]), "lon": _num(r["lon"]),
              "crop": str(r["crop"])} for _, r in df.iterrows()]
    return MapLayer(id="farms", label="Demo farms",
                    tag=Tag(status="SIMULATED", source="data/simulated/sim_farms.csv"), features=feats)


def _basin_layer() -> MapLayer:
    """The simulated basin has no coordinates of its own: it sits on the nearest real OSM reservoir."""
    store = get_store()
    basin = store["sim_pumps_basin"]["storage_basin"]
    osm_id = (basin.get("nearest_real_osm_storage") or {}).get("osm_id")
    storage = store["storage_sousse"]
    match = storage[storage["osm_id"] == osm_id] if osm_id else storage.iloc[0:0]
    lat, lon = (_num(match.iloc[0]["lat"]), _num(match.iloc[0]["lon"])) if len(match) else (None, None)
    cap = basin["capacity_m3"]
    return MapLayer(id="basin", label="Storage basin",
                    tag=Tag(status="SIMULATED", source="data/simulated/sim_pumps_basin.json; location = nearest OSM reservoir"),
                    features=[{"id": basin["id"], "name": f"Basin {cap} m3", "lat": lat, "lon": lon,
                               "capacity_m3": cap}])


@router.get("/map/layers", response_model=MapLayersResponse)
def map_layers():
    return MapLayersResponse(layers=[_plant_layer(), _irrigated_layer(), _osm_plants_layer(),
                                     _farms_layer(), _basin_layer()])
