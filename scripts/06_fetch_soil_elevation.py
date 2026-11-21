"""Module 4.1 SoilGrids (ISRIC REST v2.0) + Module 2.4 elevation (OpenTopoData SRTM 30 m; Open-Meteo fallback).

SoilGrids fair-use: max 5 requests/min -> 13 s sleep. Each point cached in data/raw/soilgrids/.
Usage:
  py -3.13 scripts/06_fetch_soil_elevation.py soil      # coarse grid + demo farms (if sim_farms.csv exists)
  py -3.13 scripts/06_fetch_soil_elevation.py elev      # add elevation_m to all point/farm layers
"""
import json, sys, time
import pandas as pd
import requests
from common import *

PROPS = ["clay", "sand", "silt", "soc", "phh2o", "cec", "bdod"]
DEPTHS = ["0-5cm", "5-15cm", "15-30cm", "30-60cm"]
# SoilGrids mapped-unit conversion factors -> conventional units
CONV = {"clay": (10, "%"), "sand": (10, "%"), "silt": (10, "%"), "soc": (10, "g/kg"), "phh2o": (10, "pH"),
        "cec": (10, "cmol(c)/kg"), "bdod": (100, "g/cm3")}


def soil_point(pid, lat, lon):
    cache = RAW / "soilgrids" / f"{pid}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    params = [("lon", lon), ("lat", lat)] + [("property", p) for p in PROPS] + [("depth", d) for d in DEPTHS] + [("value", "mean")]
    for i in range(3):
        try:
            r = requests.get("https://rest.isric.org/soilgrids/v2.0/properties/query", params=params, headers=UA, timeout=90)
            if r.status_code == 200:
                cache.write_text(r.text); time.sleep(13); return r.json()
            print("  soilgrids", pid, r.status_code); time.sleep(30)
        except requests.RequestException as e:
            print("  soilgrids", pid, e); time.sleep(30)
    return None


def texture_class(sand, clay):
    silt = 100 - sand - clay
    # USDA texture triangle (simplified ordered rules)
    if clay >= 40: return "clay" if silt < 40 and sand <= 45 else ("silty clay" if silt >= 40 else "sandy clay")
    if clay >= 35 and sand > 45: return "sandy clay"
    if clay >= 27: return "clay loam" if 20 < sand <= 45 else ("silty clay loam" if sand <= 20 else "sandy clay loam")
    if clay >= 20 and sand > 45 and silt < 28: return "sandy clay loam"
    if silt >= 80 and clay < 12: return "silt"
    if silt >= 50: return "silt loam"
    if sand >= 85 and silt + 1.5 * clay < 15: return "sand"
    if sand >= 70 and silt + 2 * clay < 30: return "loamy sand"
    if sand > 52 or (clay < 7 and silt < 50): return "sandy loam"
    return "loam"


def parse(pid, lat, lon, js, kind):
    rows = {"point_id": pid, "kind": kind, "lat": lat, "lon": lon}
    if not js:
        rows["status"] = "TO_VERIFY (SoilGrids request failed)"; return rows
    for layer in js["properties"]["layers"]:
        name = layer["name"]; f, unit = CONV[name]
        vals = {d["label"]: d["values"]["mean"] for d in layer["depths"]}
        def v(lbl): return None if vals.get(lbl) is None else vals[lbl] / f
        top = [(v("0-5cm"), 5), (v("5-15cm"), 10), (v("15-30cm"), 15)]
        top = [(a, w) for a, w in top if a is not None]
        rows[f"{name}_0_30"] = round(sum(a * w for a, w in top) / sum(w for _, w in top), 2) if top else None
        rows[f"{name}_30_60"] = None if v("30-60cm") is None else round(v("30-60cm"), 2)
    if rows.get("sand_0_30") is not None and rows.get("clay_0_30") is not None:
        rows["texture_0_30"] = texture_class(rows["sand_0_30"], rows["clay_0_30"])
    rows["status"] = "ESTIMATE (SoilGrids 2.0 250 m model prediction, depth-weighted mean)"
    return rows


def run_soil():
    pts = []
    for i, la in enumerate([35.72, 35.765, 35.81, 35.855]):
        for j, lo in enumerate([10.54, 10.585, 10.63, 10.675]):
            pts.append((f"grid_{i}{j}", la, lo, "grid"))
    sf = SIM / "sim_farms.csv"
    if sf.exists():
        for _, f in pd.read_csv(sf).iterrows():
            pts.append((f"farm_{f.farm_id}", f.lat, f.lon, "farm"))
    pts.insert(0, ("demo_centre", DEMO_LAT, DEMO_LON, "demo"))
    rows = []
    for pid, la, lo, kind in pts:
        rows.append(parse(pid, la, lo, soil_point(pid, la, lo), kind))
        print(" ", pid, rows[-1].get("texture_0_30"), rows[-1].get("clay_0_30"))
    df = pd.DataFrame(rows)
    df["units"] = "clay/sand/silt %, soc g/kg, phh2o pH, cec cmol(c)/kg, bdod g/cm3; SoilGrids has NO salinity"
    df.to_csv(CLEAN / "soilgrids_sousse.csv", index=False); print("soilgrids", df.shape)


# ------------------------------------------------------------------ elevation
def elevations(latlons):
    out = []
    for k in range(0, len(latlons), 100):
        chunk = latlons[k:k + 100]
        loc = "|".join(f"{a:.6f},{b:.6f}" for a, b in chunk)
        try:
            r = requests.get("https://api.opentopodata.org/v1/srtm30m", params={"locations": loc}, headers=UA, timeout=60)
            r.raise_for_status(); out += [x["elevation"] for x in r.json()["results"]]; src = "OpenTopoData SRTM30m"
        except Exception as e:
            print("  opentopodata failed:", e, "-> Open-Meteo elevation")
            r = requests.get("https://api.open-meteo.com/v1/elevation",
                             params={"latitude": ",".join(str(a) for a, _ in chunk), "longitude": ",".join(str(b) for _, b in chunk)}, timeout=60)
            out += r.json().get("elevation", [None] * len(chunk)); src = "Open-Meteo elevation (Copernicus DEM 90m)"
        time.sleep(1.5)
    return out, src


def run_elev():
    log = {}
    for fn in ["plants_tunisia.geojson", "pumps_sousse.geojson", "storage_sousse.geojson", "plants_sousse_osm.geojson", "farmland_sousse.geojson"]:
        p = CLEAN / fn
        if not p.exists(): continue
        fc = json.loads(p.read_text(encoding="utf-8"))
        feats = fc["features"]
        if fn == "plants_tunisia.geojson":
            feats = [f for f in feats if haversine_km(DEMO_LAT, DEMO_LON, f["properties"]["lat"], f["properties"]["lon"]) < 40]
        ll = [(f["properties"].get("lat", f["properties"].get("centroid_lat")), f["properties"].get("lon", f["properties"].get("centroid_lon"))) for f in feats]
        if not ll: continue
        el, src = elevations(ll)
        for f, e in zip(feats, el):
            f["properties"]["elevation_m"] = e; f["properties"]["elevation_source"] = src
        p.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
        log[fn] = (len(feats), src); print(fn, len(feats), src)
    sf = SIM / "sim_farms.csv"
    if sf.exists():
        df = pd.read_csv(sf)
        el, src = elevations(list(zip(df.lat, df.lon)))
        df["elevation_m"] = el; df.to_csv(sf, index=False); print("sim_farms elevation", src)
    (RAW / "elevation" / "log.json").write_text(json.dumps(log))


if __name__ == "__main__":
    if "soil" in sys.argv: run_soil()
    if "elev" in sys.argv: run_elev()
