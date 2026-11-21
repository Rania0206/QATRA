"""Module 3.3 - straight-line distance from each farmland centroid to nearest WWTP and nearest pump/well (km).
Re-run after 01_fetch_osm.py: py -3.13 scripts/09_farmland_distances.py
"""
import json
from common import *


def main():
    p = CLEAN / "farmland_sousse.geojson"
    fc = json.loads(p.read_text(encoding="utf-8"))
    plants = json.loads((CLEAN / "plants_tunisia.geojson").read_text(encoding="utf-8"))["features"]
    pumps = json.loads((CLEAN / "pumps_sousse.geojson").read_text(encoding="utf-8"))["features"]
    pl = [(f["properties"]["osm_id"], f["properties"]["lat"], f["properties"]["lon"]) for f in plants]
    pu = [(f["properties"]["osm_id"], f["properties"]["lat"], f["properties"]["lon"]) for f in pumps]
    for f in fc["features"]:
        a, b = f["properties"]["centroid_lat"], f["properties"]["centroid_lon"]
        for key, lst in (("plant", pl), ("pump_or_well", pu)):
            if lst:
                i, d = min(((i, haversine_km(a, b, la, lo)) for i, la, lo in lst), key=lambda t: t[1])
                f["properties"][f"nearest_{key}_id"] = i; f["properties"][f"dist_to_{key}_km"] = round(d, 3)
    p.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print("farmland distances added:", len(fc["features"]))


if __name__ == "__main__":
    main()
