"""Module 10 - SIMULATED demo data. Every file starts with sim_ and every row is status=SIMULATED.

Ranges come from data/clean/tww_quality_ranges.csv, nt106003_rules.json, crop_salt_tolerance.csv,
pump_specs_reference.csv, tww_irrigated_areas.csv (Zaouiet Sousse perimeter) and real OSM farmland polygons.
Re-run: py -3.13 scripts/07_simulate.py   (seeded -> reproducible)
"""
import json, math
import numpy as np, pandas as pd
from common import *

rng = np.random.default_rng(2026)
SIMS = "SIMULATED"


def load_fc(name):
    p = CLEAN / name
    return json.loads(p.read_text(encoding="utf-8"))["features"] if p.exists() else []


# ------------------------------------------------------------------ plant used in demo
def demo_plant():
    plants = load_fc("plants_tunisia.geojson") + load_fc("plants_sousse_osm.geojson")
    plants = [p for p in plants if p["properties"].get("man_made", "wastewater_plant") in (None, "wastewater_plant")]
    if plants:
        best = min(plants, key=lambda f: haversine_km(DEMO_LAT, DEMO_LON, f["properties"]["lat"], f["properties"]["lon"]))
        pr = best["properties"]
        return {"osm_id": pr["osm_id"], "name_osm": pr.get("name"), "lat": pr["lat"], "lon": pr["lon"],
                "elevation_m": pr.get("elevation_m"),
                "assumed_identity": "Sousse Sud WWTP (serves Zaouiet Sousse perimeter per Agridata) - nearest OSM wastewater_plant to demo point; identity TO_VERIFY"}
    return {"osm_id": None, "name_osm": None, "lat": 35.775, "lon": 10.63, "elevation_m": 10, "assumed_identity": "SIMULATED location"}


# ------------------------------------------------------------------ 10.1 batches
def sim_batches(plant):
    q = pd.read_csv(CLEAN / "tww_quality_ranges.csv")
    def rng_of(par, lvl="secondary"):
        r = q[(q.parameter == par) & (q.treatment_level == lvl)].iloc[0]; return r.low, r.typical, r.high
    days = pd.date_range("2026-07-01", periods=60, freq="D")
    rows = []
    last_analysis = days[0] - pd.Timedelta(days=3)
    stale_days = set(rng.choice(range(10, 60), 6, replace=False))
    noncompliant = {17: "BOD5/COD/TSS above NT 106.03", 38: "helminth eggs > 1/L", 51: "BOD5 above NT 106.03"}
    for i, d in enumerate(days):
        if d - last_analysis >= pd.Timedelta(days=7) and i not in stale_days:
            last_analysis = d - pd.Timedelta(days=int(rng.integers(0, 2)))
        analysis = last_analysis if i not in stale_days else d - pd.Timedelta(days=int(rng.integers(32, 45)))
        summer = 1 + 0.15 * math.sin((d.dayofyear - 150) / 365 * 2 * math.pi)
        ec = float(np.clip(rng.normal(3.2 * summer, 0.35), 1.8, 5.5))
        bod = float(np.clip(rng.normal(22, 4), 8, 29)); cod = float(np.clip(bod * rng.normal(3.3, 0.3), 40, 88))
        tss = float(np.clip(rng.normal(22, 4), 8, 29)); helm = float(np.clip(rng.exponential(0.25), 0, 0.9))
        if i == 17: bod, cod, tss = 41.0, 128.0, 44.0
        if i == 38: helm = 2.4
        if i == 51: bod = 36.0
        rows.append(dict(batch_id=f"SSUD-{d:%Y%m%d}", plant_osm_id=plant["osm_id"], date=d.date(),
                         volume_m3=int(round(float(np.clip(rng.normal(1500, 350), 700, 2600)), -1)),
                         treatment_level="secondary (assumed; Sousse Sud level TO_VERIFY)",
                         EC_dS_m=round(ec, 2), SAR=round(float(np.clip(rng.normal(6.5, 1.2), 3, 11)), 2),
                         BOD5_mg_L=round(bod, 1), COD_mg_L=round(cod, 1), TSS_mg_L=round(tss, 1),
                         faecal_coliforms_cfu_100mL=int(10 ** rng.normal(5.0, 0.4)),
                         helminth_eggs_per_L=round(helm, 2), total_N_mg_L=round(float(np.clip(rng.normal(30, 8), 10, 60)), 1),
                         Cl_mg_L=int(np.clip(rng.normal(700, 120), 350, 1200)), pH=round(float(rng.normal(7.6, 0.2)), 2),
                         analysis_date=analysis.date(), analysis_age_days=(d - analysis).days,
                         analysis_valid=(d - analysis).days <= 30,
                         injected_issue=noncompliant.get(i, "stale analysis (>30 d, decree 89-1047 monthly frequency)" if i in stale_days else ""),
                         status=SIMS))
    df = pd.DataFrame(rows)
    df.to_csv(SIM / "sim_batches.csv", index=False)

    # 2-year weekly lab history for uncertainty model
    weeks = pd.date_range("2024-07-01", "2026-06-29", freq="W-MON")
    h = []
    for d in weeks:
        s = 1 + 0.15 * math.sin((d.dayofyear - 150) / 365 * 2 * math.pi)
        bod = float(np.clip(rng.normal(23, 6), 6, 55))
        h.append(dict(sample_id=f"SSUD-W{d:%Y%m%d}", date=d.date(), EC_dS_m=round(float(np.clip(rng.normal(3.2 * s, 0.4), 1.5, 6)), 2),
                      SAR=round(float(np.clip(rng.normal(6.5, 1.3), 2.5, 12)), 2), BOD5_mg_L=round(bod, 1),
                      COD_mg_L=round(bod * float(rng.normal(3.3, 0.35)), 1), TSS_mg_L=round(float(np.clip(rng.normal(23, 7), 5, 60)), 1),
                      faecal_coliforms_cfu_100mL=int(10 ** rng.normal(5.0, 0.5)),
                      helminth_eggs_per_L=round(float(np.clip(rng.exponential(0.35), 0, 4)), 2),
                      total_N_mg_L=round(float(np.clip(rng.normal(30, 9), 8, 65)), 1), status=SIMS))
    pd.DataFrame(h).to_csv(SIM / "sim_lab_history_weekly.csv", index=False)
    return df


# ------------------------------------------------------------------ 10.2 farms
def nearest(feats, lat, lon):
    best, dmin = None, 1e9
    for f in feats:
        d = haversine_km(lat, lon, f["properties"]["lat"], f["properties"]["lon"])
        if d < dmin: best, dmin = f, d
    return best, dmin


def sim_farms(plant):
    farmland = [f for f in load_fc("farmland_sousse.geojson")
                if haversine_km(DEMO_LAT, DEMO_LON, f["properties"]["centroid_lat"], f["properties"]["centroid_lon"]) < 10]
    pumps = load_fc("pumps_sousse.geojson")
    soil = pd.read_csv(CLEAN / "soilgrids_sousse.csv") if (CLEAN / "soilgrids_sousse.csv").exists() else None
    spec = [  # farm_id, name, crop, area, ECe, want_landuse, current source, small
        ("A", "Ferme A - Luzerne", "alfalfa", 2.0, 1.9, "farmland", "well", True),
        ("B", "Ferme B - Oliveraie", "olive", 4.0, 1.1, "orchard", "borehole", False),
        ("C", "Ferme C - Laitue", "lettuce", 1.0, 1.4, "farmland", "network", True),
        ("D", "Ferme D - Oliviers Chemlali", "olive", 6.5, 2.6, "orchard", "borehole", False),
        ("E", "Ferme E - Orge fourragere", "barley_fodder", 3.0, 3.8, "farmland", "well", False),
        ("F", "Ferme F - Ble dur", "wheat", 5.0, 2.2, "farmland", "well", False),
        ("G", "Ferme G - Avoine fourragere", "oat_fodder", 0.8, 2.9, "farmland", "well", True),
        ("H", "Ferme H - Petite oliveraie", "olive", 0.6, 1.6, "orchard", "network", True),
        ("I", "Ferme I - Luzerne", "alfalfa", 1.5, 1.2, "farmland", "borehole", True),
        ("J", "Ferme J - Orge", "barley", 8.0, 4.5, "farmland", "borehole", False),
    ]
    used = set(); rows = []
    kc = pd.read_csv(CLEAN / "crop_kc.csv").set_index("crop")
    for fid, name, crop, area, ece, lu, src, small in spec:
        cands = [f for f in farmland if f["properties"]["osm_id"] not in used and
                 (f["properties"]["landuse"] == lu or (lu == "orchard" and f["properties"].get("trees") == "olive_trees"))]
        if not cands: cands = [f for f in farmland if f["properties"]["osm_id"] not in used]
        if cands:
            # prefer polygons whose area is >= farm area and closest to the demo point
            cands.sort(key=lambda f: (f["properties"]["area_ha"] < area,
                                      haversine_km(DEMO_LAT, DEMO_LON, f["properties"]["centroid_lat"], f["properties"]["centroid_lon"])))
            pick = cands[int(rng.integers(0, min(4, len(cands))))]
            used.add(pick["properties"]["osm_id"])
            lat, lon, poly = pick["properties"]["centroid_lat"], pick["properties"]["centroid_lon"], pick["properties"]["osm_id"]
            poly_area = pick["properties"]["area_ha"]
        else:
            lat, lon = DEMO_LAT + rng.normal(0, 0.02), DEMO_LON + rng.normal(0, 0.02); poly, poly_area = "SIMULATED", None
        texture = None
        if soil is not None and "texture_0_30" in soil:
            s2 = soil.dropna(subset=["texture_0_30"]).copy()
            if len(s2):
                s2["d"] = [haversine_km(lat, lon, a, b) for a, b in zip(s2.lat, s2.lon)]
                texture = s2.sort_values("d").iloc[0]["texture_0_30"]
        pw, dpw = nearest(pumps, lat, lon) if pumps else (None, 1e9)
        kcm = kc.loc[crop.replace("barley_fodder", "barley"), "kc_mid"] if crop.replace("barley_fodder", "barley") in kc.index else 0.8
        season_m3 = round(area * 10 * 1000 * kcm * 0.6 / 0.9, -2)  # ~1000 mm ET0 season * Kc * 0.6 eff.deficit / 0.9 eff
        rows.append(dict(farm_id=fid, name=name, crop=crop, area_ha=area, lat=round(lat, 6), lon=round(lon, 6),
                         osm_polygon_id=poly, osm_polygon_area_ha=poly_area, soil_ECe_dS_m=ece,
                         soil_texture=texture or "TO_VERIFY",
                         soil_texture_demo=("sandy loam (SIMULATED override for scenario B; SoilGrids says " + str(texture) + ")") if fid == "B" else texture,
                         elevation_m=None,
                         distance_to_plant_km=round(haversine_km(lat, lon, plant["lat"], plant["lon"]), 2),
                         nearest_pump_or_well_id=pw["properties"]["osm_id"] if pw is not None and dpw <= 5 else f"SIM-WELL-{fid}",
                         nearest_pump_or_well_km=round(dpw, 2) if dpw < 1e8 else None,
                         current_fresh_water_source=src, current_fresh_water_m3_per_season=season_m3,
                         is_small_farm=small, gda_name="GDA Zaouia Al-Khadra (fictional)", farmer_phone="+216 00 000 000",
                         expected_decision={"A": "conditional", "B": "compatible", "C": "blocked"}.get(fid, ""),
                         status=SIMS + " (location on real OSM farmland polygon; attributes simulated)"))
    df = pd.DataFrame(rows)
    try:  # SRTM elevation for each farm (same helper as scripts/06)
        import importlib; el = importlib.import_module("06_fetch_soil_elevation")
        df["elevation_m"], _ = el.elevations(list(zip(df.lat, df.lon)))
    except Exception as e:
        print("elevation lookup failed:", e)
    df.to_csv(SIM / "sim_farms.csv", index=False)
    return df


# ------------------------------------------------------------------ 10.3 pumps / basin / PV
def sim_infra(plant, farms):
    storage = load_fc("storage_sousse.geojson")
    plant_el = plant.get("elevation_m") or 10
    farm_el = farms["elevation_m"].dropna()
    basin_el = (float(farm_el.max()) if len(farm_el) else 30) + 5
    pipe_km = float(farms["distance_to_plant_km"].median())
    H = round((basin_el - plant_el) + 3.0 * pipe_km + 5, 1)  # static + ~3 m/km friction + 5 m residual
    eta = 0.65; Q = 150
    kw = round(0.00272 * H / eta * Q, 1)
    real_basin = None
    if storage:
        b, d = nearest(storage, DEMO_LAT, DEMO_LON)
        real_basin = {"osm_id": b["properties"]["osm_id"], "distance_km": round(d, 2), "name": b["properties"].get("name")}
    infra = {
        "status": SIMS,
        "based_on": ["pump_specs_reference.csv", "energy_params.json", "SRTM elevations", "OSM storage_sousse.geojson"],
        "plant": plant,
        "transfer_pumps": [{"id": "TP1", "flow_m3_h": Q, "head_m": H, "efficiency": eta, "power_kW": kw,
                            "energy_kWh_per_m3": round(0.00272 * H / eta, 4),
                            "head_method": "basin_elev - plant_elev + 3 m/km * median distance + 5 m residual"},
                           {"id": "TP2 (standby)", "flow_m3_h": Q, "head_m": H, "efficiency": 0.6, "power_kW": round(0.00272 * H / 0.6 * Q, 1)}],
        "storage_basin": {"id": "BASIN-1", "capacity_m3": 3000, "initial_level_m3": 1200, "elevation_m": basin_el,
                          "nearest_real_osm_storage": real_basin, "evaporation_mm_d_summer": 8},
        "pv_array": {"kWp": 60, "performance_ratio": 0.8, "note": "~1.3x of 45 kW pumping load; see pv_estimate_sousse.csv"},
        "farm_well_pumps": [{"farm_id": r.farm_id, "source": r.current_fresh_water_source, "head_m": int(rng.integers(40, 110)) if r.current_fresh_water_source != "network" else None,
                             "flow_m3_h": int(rng.integers(8, 25)), "efficiency": round(float(rng.uniform(0.45, 0.6)), 2)}
                            for r in farms.itertuples()],
    }
    for w in infra["farm_well_pumps"]:
        w["energy_kWh_per_m3"] = round(0.00272 * w["head_m"] / w["efficiency"], 3) if w["head_m"] else None
    (SIM / "sim_pumps_basin.json").write_text(json.dumps(infra, indent=1, default=str), encoding="utf-8")
    return infra


# ------------------------------------------------------------------ 10.4 scenarios
def sim_scenarios():
    sc = {"status": SIMS, "scenarios": [
        {"id": "default", "label": "Normal day - 1,000 m3 batch", "date": "2026-07-08", "batch_id": "SSUD-20260708",
         "batch_volume_m3": 1000, "weather_source": "weather_summer2026_sousse.csv (date row)", "grid_outage_windows": [],
         "pv_kWp": 60, "basin_initial_m3": 1200},
        {"id": "heatwave_outage", "label": "Summer 2026 heatwave + 13:00-17:00 grid outage", "date": "2026-08-26",
         "batch_id": "SSUD-20260826", "batch_volume_m3": 1800, "weather_source": "weather_summer2026_sousse.csv (2026-08-26, hottest local day in series)",
         "grid_outage_windows": [["13:00", "17:00"]], "pv_kWp": 60, "basin_initial_m3": 600,
         "basis": "HRW 2026-10-06: outages concentrated 13:00-17:00 (CF26); INM: hottest summer since 1950 (CF23)"}]}
    (SIM / "sim_scenarios.json").write_text(json.dumps(sc, indent=1), encoding="utf-8")

    # 8.2 outage windows: heatwave days = local Tmax >= 38 C in summer-2026 replay
    w = pd.read_csv(CLEAN / "weather_summer2026_sousse.csv")
    hot = w.groupby("date")["temperature_2m"].max()
    hot = hot[hot >= 38].index.tolist()
    pd.DataFrame([{"date": d, "start": "13:00", "end": "17:00", "trigger": "Tmax>=38C (NASA POWER hourly)",
                   "basis": "HRW Oct 2026 reporting (outages concentrated 13:00-17:00); no official STEG schedule published", "status": SIMS}
                  for d in hot]).to_csv(SIM / "sim_outage_windows.csv", index=False)
    print("outage days", len(hot))


def main():
    plant = demo_plant(); print("demo plant", plant)
    b = sim_batches(plant); print("batches", b.shape, "invalid analyses", (~b.analysis_valid).sum())
    f = sim_farms(plant); print(f[["farm_id", "crop", "area_ha", "osm_polygon_id", "soil_texture", "distance_to_plant_km", "nearest_pump_or_well_id"]].to_string())
    sim_infra(plant, f); sim_scenarios()


if __name__ == "__main__":
    main()
