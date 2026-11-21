"""Module 1.1, 2.1, 3.1 - OpenStreetMap extracts via Overpass API.

Status: REPORTED but INCOMPLETE (OSM is volunteered data, not an official inventory).
Re-run: py -3.13 scripts/01_fetch_osm.py   (raw responses cached in data/raw/osm/)
"""
import json, sys
from common import *

OVERPASS = ["https://overpass.private.coffee/api/interpreter",
            "https://overpass-api.de/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"]
FAILED = []
AROUND = f"(around:{RADIUS_KM*1000},{DEMO_LAT},{DEMO_LON})"
TN = 'area["ISO3166-1"="TN"][admin_level=2]->.tn;'

QUERIES = {
    "plants_tunisia": f"""[out:json][timeout:180];{TN}
      (nwr["man_made"="wastewater_plant"](area.tn););out center tags;""",
    "pumps_tunisia": f"""[out:json][timeout:120];
      nwr["man_made"="pumping_station"](30.2,7.5,37.6,11.6);out center tags;""",  # bbox (faster than area); may include a few border features
    "sousse_points": f"""[out:json][timeout:180];
      (nwr["man_made"~"^(pumping_station|water_well|borehole|water_tower|reservoir_covered|storage_tank|wastewater_plant|water_works)$"]{AROUND};
       nwr["landuse"="reservoir"]{AROUND};
       nwr["water"~"^(reservoir|basin|pond)$"]{AROUND};
       nwr["power"="generator"]["generator:source"="solar"]{AROUND};
       nwr["power"="plant"]["plant:source"="solar"]{AROUND};);out center tags;""",
    "sousse_lines": f"""[out:json][timeout:180];
      (way["man_made"="pipeline"]{AROUND};
       way["waterway"="canal"]{AROUND};way["waterway"="ditch"]{AROUND};way["waterway"="drain"]{AROUND};);out geom tags;""",
    "sousse_farmland": f"""[out:json][timeout:240];
      (way["landuse"~"^(farmland|orchard|meadow|greenhouse_horticulture|vineyard|plant_nursery)$"]{AROUND};
       relation["landuse"~"^(farmland|orchard|meadow|greenhouse_horticulture|vineyard)$"]{AROUND};
       way["irrigation"]{AROUND};);out geom tags;""",
}


def run(name, q):
    cache = RAW / "osm" / f"{name}.json"
    if cache.exists() and "--refresh" not in sys.argv:
        return json.loads(cache.read_text(encoding="utf-8"))
    for ep in OVERPASS:
        try:
            r = requests.post(ep, data={"data": q}, headers=UA, timeout=200)
            if r.status_code != 200:
                print(f"  {name}: {ep} HTTP {r.status_code}"); time.sleep(5); continue
            js = r.json()
            cache.write_text(r.text, encoding="utf-8")
            print(f"  {name}: {len(js['elements'])} elements from {ep}")
            time.sleep(5)
            return js
        except Exception as e:
            print(f"  {name}: {ep} failed: {str(e)[:120]}")
    FAILED.append(name)
    return {"elements": []}


def point_features(data, keep=None):
    feats = []
    for el in data["elements"]:
        t = el.get("tags", {})
        if "lat" in el:
            lat, lon = el["lat"], el["lon"]
        elif "center" in el:
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        props = {"osm_id": f"{el['type'][0]}{el['id']}", "osm_type": el["type"],
                 "name": t.get("name") or t.get("name:fr") or t.get("name:ar"),
                 "name_ar": t.get("name:ar"), "operator": t.get("operator"),
                 "lat": round(lat, 6), "lon": round(lon, 6)}
        for k in (keep or []):
            props[k.replace(":", "_")] = t.get(k)
        props["status"] = "REPORTED (OSM, incomplete)"
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
                      "properties": props})
    return feats


def classify_point(t):
    mm = t.get("man_made")
    if mm == "pumping_station": return "pumping_station"
    if mm in ("water_well", "borehole"): return "well"
    if mm in ("water_tower", "reservoir_covered", "storage_tank") or t.get("landuse") == "reservoir" \
       or t.get("water") in ("reservoir", "basin", "pond"): return "storage"
    if t.get("power") in ("generator", "plant"): return "solar"
    if mm in ("wastewater_plant", "water_works"): return mm
    return "other"


def main():
    meta = {"source": "OpenStreetMap contributors via Overpass API (ODbL)",
            "status": "REPORTED but INCOMPLETE - OSM is not an official inventory"}
    # 1.1 plants
    d = run("plants_tunisia", QUERIES["plants_tunisia"])
    f = point_features(d, ["wastewater_plant", "start_date", "capacity", "operator:type"])
    write_geojson(CLEAN / "plants_tunisia.geojson", f, meta); print("plants_tunisia", len(f))

    # 2.1 pumps all Tunisia
    d = run("pumps_tunisia", QUERIES["pumps_tunisia"])
    f = point_features(d, ["pumping_station", "substance", "pumping_station:type"])
    write_geojson(CLEAN / "pumps_tunisia.geojson", f, meta); print("pumps_tunisia", len(f))

    # 2.1 Sousse points
    d = run("sousse_points", QUERIES["sousse_points"])
    keep = ["man_made", "pumping_station", "substance", "content", "landuse", "water",
            "power", "generator:source", "generator:output:electricity", "plant:output:electricity",
            "capacity", "volume", "depth", "pump", "drinking_water"]
    allf = point_features(d, keep)
    by = {}
    for ft, el in zip(allf, [e for e in d["elements"] if "lat" in e or "center" in e]):
        ft["properties"]["category"] = classify_point(el.get("tags", {}))
        by.setdefault(ft["properties"]["category"], []).append(ft)
    pumps = by.get("pumping_station", []) + by.get("well", [])
    for ft in pumps:
        ft["properties"]["distance_to_demo_km"] = round(haversine_km(DEMO_LAT, DEMO_LON, ft["properties"]["lat"], ft["properties"]["lon"]), 2)
    write_geojson(CLEAN / "pumps_sousse.geojson", pumps, meta)
    write_geojson(CLEAN / "storage_sousse.geojson", by.get("storage", []), meta)
    write_geojson(CLEAN / "solar_sousse.geojson", by.get("solar", []), meta)
    write_geojson(CLEAN / "plants_sousse_osm.geojson", by.get("wastewater_plant", []) + by.get("water_works", []), meta)
    print({k: len(v) for k, v in by.items()})

    # 2.1 lines
    d = run("sousse_lines", QUERIES["sousse_lines"])
    lf = []
    for el in d["elements"]:
        if "geometry" not in el: continue
        t = el.get("tags", {})
        coords = [[p["lon"], p["lat"]] for p in el["geometry"]]
        L = sum(haversine_km(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]) for i in range(len(coords)-1))
        lf.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": coords},
                   "properties": {"osm_id": f"w{el['id']}", "name": t.get("name"),
                                  "man_made": t.get("man_made"), "waterway": t.get("waterway"),
                                  "substance": t.get("substance"), "location": t.get("location"),
                                  "length_km": round(L, 3), "status": "REPORTED (OSM, incomplete)"}})
    write_geojson(CLEAN / "pipes_canals_sousse.geojson", lf, meta); print("lines", len(lf))

    # 3.1 farmland polygons (ways only; multipolygon relations -> outer ring of first member)
    d = run("sousse_farmland", QUERIES["sousse_farmland"])
    ff = []
    for el in d["elements"]:
        t = el.get("tags", {})
        if el["type"] == "way" and "geometry" in el:
            ring = [[p["lon"], p["lat"]] for p in el["geometry"]]
        elif el["type"] == "relation":
            outers = [m for m in el.get("members", []) if m.get("role") == "outer" and "geometry" in m]
            if not outers: continue
            ring = [[p["lon"], p["lat"]] for p in max(outers, key=lambda m: len(m["geometry"]))["geometry"]]
        else:
            continue
        if len(ring) < 4 or ring[0] != ring[-1]:
            continue  # not a closed polygon
        area_ha = ring_area_m2(ring) / 1e4
        clat, clon = ring_centroid(ring[:-1])
        ff.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [ring]},
                   "properties": {"osm_id": f"{el['type'][0]}{el['id']}", "landuse": t.get("landuse"),
                                  "trees": t.get("trees"), "crop": t.get("crop"), "produce": t.get("produce"),
                                  "irrigation": t.get("irrigation"), "name": t.get("name"),
                                  "area_ha": round(area_ha, 3), "centroid_lat": round(clat, 6),
                                  "centroid_lon": round(clon, 6),
                                  "status": "REPORTED (OSM, incomplete); area/centroid = ESTIMATE (spherical calc)"}})
    write_geojson(CLEAN / "farmland_sousse.geojson", ff, meta); print("farmland", len(ff))


if __name__ == "__main__":
    main()
    if FAILED:
        print("FAILED queries (TO_VERIFY, re-run later):", FAILED)
