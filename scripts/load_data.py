"""QATRA data loaders - one function per dataset.

    from scripts.load_data import *          # or: sys.path.insert(0, "scripts"); import load_data
    farms = sim_farms(); rules = nt106003_rules()

GeoJSON loaders return a GeoDataFrame if geopandas is installed, otherwise a pandas DataFrame of
feature properties (with lat/lon or centroid_lat/centroid_lon) plus a 'geometry' column holding the raw GeoJSON dict.
"""
import json
from pathlib import Path
import pandas as pd

DATA = Path(__file__).resolve().parents[1] / "data"
CLEAN, SIM = DATA / "clean", DATA / "simulated"

try:
    import geopandas as gpd
except ImportError:  # pragma: no cover
    gpd = None


def _csv(p, **kw): return pd.read_csv(p, **kw)
def _json(p): return json.loads(Path(p).read_text(encoding="utf-8"))


def _geo(p):
    if gpd is not None:
        return gpd.read_file(p)
    fc = _json(p)
    rows = [{**f["properties"], "geometry": f["geometry"]} for f in fc["features"]]
    return pd.DataFrame(rows)


# ---- Module 1: treated water sources
def plants_tunisia():            return _geo(CLEAN / "plants_tunisia.geojson")
def plants_sousse_osm():         return _geo(CLEAN / "plants_sousse_osm.geojson")
def plants_details():            return _csv(CLEAN / "plants_details.csv")
def tww_quality_ranges():        return _csv(CLEAN / "tww_quality_ranges.csv")
# ---- Module 2: pumps, pipes, storage
def pumps_tunisia():             return _geo(CLEAN / "pumps_tunisia.geojson")
def pumps_sousse():              return _geo(CLEAN / "pumps_sousse.geojson")
def storage_sousse():            return _geo(CLEAN / "storage_sousse.geojson")
def pipes_canals_sousse():       return _geo(CLEAN / "pipes_canals_sousse.geojson")
def solar_sousse():              return _geo(CLEAN / "solar_sousse.geojson")
def pumping_stations_official(): return _csv(CLEAN / "pumping_stations_official.csv")
def pump_specs_reference():      return _csv(CLEAN / "pump_specs_reference.csv")
# ---- Module 3: farms and irrigated areas
def farmland_sousse():           return _geo(CLEAN / "farmland_sousse.geojson")
def tww_irrigated_areas():       return _csv(CLEAN / "tww_irrigated_areas.csv")
def tww_consumption_by_perimeter(): return _csv(CLEAN / "tww_consumption_by_perimeter.csv")
# ---- Module 4: soils
def soilgrids_sousse():          return _csv(CLEAN / "soilgrids_sousse.csv")
def soil_salinity_reference():   return _csv(CLEAN / "soil_salinity_reference.csv")
# ---- Module 5: crops
def crop_kc():                   return _csv(CLEAN / "crop_kc.csv")
def crop_salt_tolerance():       return _csv(CLEAN / "crop_salt_tolerance.csv")
def irrigation_water_quality_guidelines(): return _csv(CLEAN / "irrigation_water_quality_guidelines.csv")
def sousse_crops():              return _csv(CLEAN / "sousse_crops.csv")
# ---- Module 6: regulation
def nt106003_rules():            return _json(CLEAN / "nt106003_rules.json")
# ---- Module 7: weather / solar
def weather_forecast_sousse():   return _csv(CLEAN / "weather_forecast_sousse.csv", parse_dates=["datetime"])
def weather_summer2026_sousse(): return _csv(CLEAN / "weather_summer2026_sousse.csv", parse_dates=["datetime"])
def climate_30y_sousse():        return _csv(CLEAN / "climate_30y_sousse.csv", parse_dates=["date"])
def pv_estimate_sousse():        return _csv(CLEAN / "pv_estimate_sousse.csv", parse_dates=["datetime"])
# ---- Module 8: energy
def energy_params():             return _json(CLEAN / "energy_params.json")
def steg_tariffs():              return _csv(CLEAN / "steg_tariffs.csv")
# ---- Module 9: pitch figures
def context_figures():           return _csv(CLEAN / "context_figures.csv")
# ---- Module 10: simulated
def sim_batches():               return _csv(SIM / "sim_batches.csv", parse_dates=["date", "analysis_date"])
def sim_lab_history_weekly():    return _csv(SIM / "sim_lab_history_weekly.csv", parse_dates=["date"])
def sim_farms():                 return _csv(SIM / "sim_farms.csv")
def sim_pumps_basin():           return _json(SIM / "sim_pumps_basin.json")
def sim_scenarios():             return _json(SIM / "sim_scenarios.json")
def sim_outage_windows():        return _csv(SIM / "sim_outage_windows.csv")
# ---- catalog
def data_catalog():              return _csv(DATA / "data_catalog.csv")


ALL = [n for n, f in list(globals().items()) if callable(f) and not n.startswith("_") and n not in ("Path",)
       and getattr(f, "__module__", None) == __name__]

if __name__ == "__main__":
    for name in ALL:
        try:
            obj = globals()[name]()
            print(f"OK   {name:38s} {len(obj) if hasattr(obj, '__len__') else ''}")
        except Exception as e:
            print(f"FAIL {name:38s} {e}")
