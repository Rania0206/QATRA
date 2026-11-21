"""Final step - data_catalog.csv, map_preview.html (plain Leaflet), summary table.
Re-run: py -3.13 scripts/08_catalog_map_summary.py
"""
import json
import pandas as pd
from common import *

OSM_NOTE = "OpenStreetMap is volunteered data: REPORTED but INCOMPLETE, not an official inventory (ODbL)."
D = [  # id, title, file, status, source_name, source_url, pub_date, period, scope, unit, definition, method, notes
    ("D01", "Wastewater plants (OSM)", "clean/plants_tunisia.geojson", "REPORTED (incomplete)", "OpenStreetMap / Overpass", "https://overpass-api.de", "2026-11-21 extract", "current", "Tunisia", "-", "man_made=wastewater_plant", "scripts/01_fetch_osm.py", OSM_NOTE),
    ("D02", "Plant details incl. Sousse Sud", "clean/plants_details.csv", "REPORTED / TO_VERIFY", "Agridata (data.gov.tn), EIB, African Manager", "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees", "2021-2024", "2021/22-2023/24", "Sousse", "m3/d", "capacity = treatment capacity (not volume available to farmers)", "scripts/05_build_reference.py", "Treatment level & coordinates of Sousse Sud TO_VERIFY"),
    ("D03", "TWW quality ranges", "clean/tww_quality_ranges.csv", "REPORTED (ONAS means) + ESTIMATE (ranges)", "Benabdallah 2003 (ONAS data); general literature", "https://www.files.ethz.ch/isn/27892/2003-11.pdf", "2003", "~2002", "Tunisia", "mg/L, dS/m, CFU/100mL", "effluent concentration", "scripts/05_build_reference.py", "Replace with Sousse Sud lab data"),
    ("D04", "data.gov.tn search", "raw/datagov/", "REPORTED", "data.gov.tn (CKAN, API disallowed by robots.txt)", "https://catalog.data.gov.tn", "2026-11-21", "-", "Tunisia", "-", "-", "scripts/03_fetch_datagov.py + manual dataset-page fetch", "No CKAN API; 6 query-string search pages fetched before robots.txt check (disallows /*?) - stopped; only dataset pages + /cms/download used afterwards"),
    ("D05", "Pumping stations (OSM)", "clean/pumps_tunisia.geojson; clean/pumps_sousse.geojson", "REPORTED (incomplete)", "OpenStreetMap", "https://overpass-api.de", "2026-11-21", "current", "Tunisia / 20 km Zaouiet-Sousse", "-", "man_made=pumping_station|water_well|borehole", "scripts/01_fetch_osm.py", OSM_NOTE),
    ("D06", "Storage (OSM)", "clean/storage_sousse.geojson", "REPORTED (incomplete)", "OpenStreetMap", "https://overpass-api.de", "2026-11-21", "current", "20 km", "-", "water tower/tank/reservoir/basin/pond", "scripts/01_fetch_osm.py", OSM_NOTE),
    ("D07", "Pipes & canals (OSM)", "clean/pipes_canals_sousse.geojson", "REPORTED (incomplete)", "OpenStreetMap", "https://overpass-api.de", "2026-11-21", "current", "20 km", "km", "man_made=pipeline, waterway=canal|ditch|drain", "scripts/01_fetch_osm.py", OSM_NOTE),
    ("D08", "Solar generators (OSM)", "clean/solar_sousse.geojson", "REPORTED (incomplete)", "OpenStreetMap", "https://overpass-api.de", "2026-11-21", "current", "20 km", "-", "generator:source=solar", "scripts/01_fetch_osm.py", OSM_NOTE),
    ("D09", "Official pumping-station list", "clean/pumping_stations_official.csv", "NOT FOUND / REPORTED (press)", "ONAS via La Presse", "https://www.lapresse.tn/?p=4365046", "2026-10", "-", "Sousse", "stations", "-", "web search", "No public official inventory; data fragmented"),
    ("D10", "Pump specs reference", "clean/pump_specs_reference.csv", "ESTIMATE", "Hydraulics; FAO/GIZ SPIS toolbox", "https://energypedia.info/wiki/Toolbox_on_SPIS", "-", "-", "generic", "m3/h, m, kW", "-", "scripts/05_build_reference.py", "TO_VERIFY with manufacturer datasheets"),
    ("D11", "Farmland polygons (OSM)", "clean/farmland_sousse.geojson", "REPORTED (incomplete); area=ESTIMATE", "OpenStreetMap", "https://overpass-api.de", "2026-11-21", "current", "20 km", "ha", "landuse=farmland|orchard|meadow|greenhouse_horticulture|vineyard", "scripts/01_fetch_osm.py + 09_distances", OSM_NOTE + " Includes dist_to_plant_km and dist_to_pump_or_well_km (straight line)."),
    ("D12", "TWW irrigated perimeters (official)", "clean/tww_irrigated_areas.csv", "REPORTED", "Ministere de l'Agriculture / Agridata via data.gov.tn", "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees", "TO_VERIFY", "2021/22-2023/24", "Tunisia, by perimeter", "ha; m3/yr", "equipped / operated / irrigated area; TWW distributed", "scripts/04_clean_datagov.py", "Zaouiet Sousse = 257 ha, Sousse Sud WWTP"),
    ("D13", "TWW consumption per perimeter 1996-2022", "clean/tww_consumption_by_perimeter.csv", "REPORTED", "Agridata via data.gov.tn", "https://catalog.data.gov.tn/fr/dataset/evolution-de-la-consommation-des-eaux-usees-traitees-par-perimetre-en-m3", "TO_VERIFY", "1996/97-2021/22", "Tunisia", "m3/campaign", "TWW consumed", "scripts/04_clean_datagov.py", "2021/22 Zaouiet value (921,582) differs from D12 (658,480): different datasets"),
    ("D14", "SoilGrids properties", "clean/soilgrids_sousse.csv", "ESTIMATE", "ISRIC SoilGrids 2.0", "https://rest.isric.org", "2020 model", "-", "grid + demo farms", "%, g/kg, pH, cmol/kg, g/cm3", "0-30 & 30-60 cm", "scripts/06_fetch_soil_elevation.py", "Model predictions at 250 m; no salinity. demo_centre point (35.79,10.62) returns no data (urban/no-data mask in SoilGrids)"),
    ("D15", "Soil salinity reference", "clean/soil_salinity_reference.csv", "REPORTED (qualitative) / ESTIMATE / TO_VERIFY", "various", "", "-", "-", "Tunisia", "dS/m", "ECe", "literature", "HWSD v2 not downloaded; SoilFER no public maps"),
    ("D16", "FAO-56 crop coefficients", "clean/crop_kc.csv", "REPORTED (pomegranate ESTIMATE)", "FAO Irrigation & Drainage Paper 56", "https://www.fao.org/4/x0490e/x0490e00.htm", "1998", "-", "generic", "-", "Kc, stage lengths, root depth", "transcribed", "Spot-check vs tables"),
    ("D17", "FAO-29 salt tolerance", "clean/crop_salt_tolerance.csv", "REPORTED (olive/pomegranate/oat TO_VERIFY)", "FAO-29 Ayers & Westcot 1985", "https://www.fao.org/4/t0234e/t0234e00.htm", "1985", "-", "generic", "dS/m; %/dS/m", "ECe threshold, slope", "transcribed", ""),
    ("D18", "Irrigation water quality guidelines + LR", "clean/irrigation_water_quality_guidelines.csv", "REPORTED", "FAO-29 Table 1", "https://www.fao.org/4/t0234e/t0234e00.htm", "1985", "-", "generic", "various", "degree of restriction", "transcribed", ""),
    ("D19", "Sousse crops", "clean/sousse_crops.csv", "REPORTED (press) / TO_VERIFY", "CRDA Sousse via press", "https://en.africanmanager.com/?p=238901", "various", "-", "Sousse governorate", "ha, t", "-", "web search", "Non-olive crop areas TO_VERIFY"),
    ("D20", "NT 106.03 + Decree 89-1047 rules", "clean/nt106003_rules.json", "REPORTED (faecal coliforms: no Tunisian limit; fallback TO_VERIFY)", "Min. Environnement presentation p.13; JORT 1989 (FAOLEX); Benabdallah 2003", "https://faolex.fao.org/docs/pdf/tun204032.pdf", "1989/1994", "-", "Tunisia", "mg/L etc.", "max concentration", "PDF text extraction", "Cahier des charges 1995 TO_VERIFY; regulation under revision (2026)"),
    ("D21", "Weather forecast 7 d", "clean/weather_forecast_sousse.csv", "PROJECTION", "Open-Meteo forecast API", "https://open-meteo.com", "2026-11-21", "next 7 days", "35.79N 10.62E", "degC, %, W/m2, mm", "-", "scripts/02_fetch_weather.py", ""),
    ("D22", "Summer 2026 hourly replay", "clean/weather_summer2026_sousse.csv", "REPORTED (reanalysis); ET0 ESTIMATE", "NASA POWER (Open-Meteo archive quota exceeded)", "https://power.larc.nasa.gov", "2026-11-21", "2026-06-01..2026-08-31", "35.79N 10.62E (~0.5 deg cell)", "degC, %, W/m2, mm", "hourly LST", "scripts/02_fetch_weather.py", "Coarse grid smooths coastal extremes; local Tmax 44.0C on 2026-08-26"),
    ("D23", "30-year climate baseline", "clean/climate_30y_sousse.csv", "REPORTED (reanalysis); ET0 ESTIMATE", "NASA POWER daily", "https://power.larc.nasa.gov", "2026-11-21", "1995-2024", "35.79N 10.62E", "mm/d", "daily rain, FAO-56 PM ET0", "scripts/02_fetch_weather.py", ""),
    ("D24", "PV output estimate", "clean/pv_estimate_sousse.csv", "ESTIMATE", "derived", "", "-", "summer 2026 + forecast", "50 kWp demo", "kWh/h", "E = kWp*GHI/1000*PR", "scripts/02_fetch_weather.py", "PR 0.8, horizontal irradiance"),
    ("D25", "Energy parameters", "clean/energy_params.json", "REPORTED (physics) / ESTIMATE (eta)", "hydraulics; STEG via press", "", "-", "-", "-", "kWh/m3", "E = 0.00272 H / eta", "scripts/05_build_reference.py", ""),
    ("D26", "STEG tariffs", "clean/steg_tariffs.csv", "TO_VERIFY (agri tariff) / REPORTED (averages)", "STEG via press", "https://www.steg.com.tn", "2025", "2025", "Tunisia", "millimes/kWh", "-", "web search", "Agricultural pumping tariff not found"),
    ("D27", "Context figures for pitch", "clean/context_figures.csv", "REPORTED / PROJECTION / TO_VERIFY per row", "see file", "", "see file", "see file", "Tunisia", "see file", "one metric per row", "web search", ""),
    ("S01", "Simulated batches (60 d) + weekly 2-yr lab history", "simulated/sim_batches.csv; simulated/sim_lab_history_weekly.csv", "SIMULATED", "-", "", "-", "2026-07-01..2026-08-29; 2024-07..2026-06", "Sousse Sud (assumed)", "mg/L etc.", "-", "scripts/07_simulate.py", "3 injected non-compliant days, 6 stale analyses (>30 d)"),
    ("S02", "Simulated farms (10)", "simulated/sim_farms.csv", "SIMULATED (on real OSM polygons)", "-", "", "-", "-", "Zaouiet-Sousse", "-", "-", "scripts/07_simulate.py", "A conditional / B compatible / C blocked"),
    ("S03", "Simulated pumps, basin, PV", "simulated/sim_pumps_basin.json", "SIMULATED", "-", "", "-", "-", "-", "-", "-", "scripts/07_simulate.py", "head from SRTM elevations"),
    ("S04", "Scenarios", "simulated/sim_scenarios.json", "SIMULATED", "-", "", "-", "-", "-", "-", "-", "scripts/07_simulate.py", "default + heatwave/outage"),
    ("S05", "Outage windows", "simulated/sim_outage_windows.csv", "SIMULATED", "based on HRW 2026-10-06", "https://www.hrw.org/news/2026/10/06/tunisia-power-water-shortages-endanger-rights", "-", "summer 2026", "-", "-", "13:00-17:00 on days with Tmax>=38C", "scripts/07_simulate.py", "No STEG schedule published"),
]
COLS = ["id", "title", "file", "status", "source_name", "source_url", "publication_date", "period_covered", "scope", "unit", "definition", "method_or_assumptions", "notes"]


def nrows(f):
    tot = 0
    for part in f.split(";"):
        p = ROOT / "data" / part.strip()
        if not p.exists() or p.is_dir(): continue
        if p.suffix == ".csv": tot += len(pd.read_csv(p))
        elif p.suffix == ".geojson": tot += len(json.loads(p.read_text(encoding="utf-8"))["features"])
        elif p.suffix == ".json": tot += 1
    return tot


def catalog():
    cat = pd.DataFrame(D, columns=COLS)
    cf = pd.read_csv(CLEAN / "context_figures.csv")
    figs = pd.DataFrame({"id": cf["id"], "title": cf["metric"].fillna("").astype(str) + " = " + cf["value"].fillna("n/a").astype(str) + " " + cf["unit"].fillna("").astype(str),
                         "file": "clean/context_figures.csv", "status": cf["status"], "source_name": cf["source_name"],
                         "source_url": cf["source_url"], "publication_date": cf["publication_date"], "period_covered": cf["period"],
                         "scope": cf["scope"], "unit": cf["unit"], "definition": cf["definition"], "method_or_assumptions": "web search; value as published", "notes": ""})
    cat = pd.concat([cat, figs], ignore_index=True)
    cat.to_csv(ROOT / "data" / "data_catalog.csv", index=False, encoding="utf-8")
    return cat


def map_preview():
    def fc(name, maxdist=None):
        p = CLEAN / name
        if not p.exists(): return {"type": "FeatureCollection", "features": []}
        g = json.loads(p.read_text(encoding="utf-8"))
        if maxdist:
            def ll(f):
                pr = f["properties"]; return pr.get("lat", pr.get("centroid_lat")), pr.get("lon", pr.get("centroid_lon"))
            g["features"] = [f for f in g["features"] if haversine_km(DEMO_LAT, DEMO_LON, *ll(f)) <= maxdist]
        g.pop("metadata", None)
        return g
    farms = pd.read_csv(SIM / "sim_farms.csv")
    farm_fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [r.lon, r.lat]},
         "properties": {"farm_id": r.farm_id, "name": r.name, "crop": r.crop, "area_ha": r.area_ha, "expected": r.expected_decision if isinstance(r.expected_decision, str) else "",
                        "soil_ECe": r.soil_ECe_dS_m, "texture": r.soil_texture, "status": "SIMULATED"}} for r in farms.itertuples()]}
    layers = {"plants": fc("plants_tunisia.geojson", 25), "pumps": fc("pumps_sousse.geojson"), "storage": fc("storage_sousse.geojson"),
              "pipes": fc("pipes_canals_sousse.geojson"), "farmland": fc("farmland_sousse.geojson", 12), "solar": fc("solar_sousse.geojson"), "farms": farm_fc}
    html = """<!doctype html><html><head><meta charset="utf-8"><title>QATRA+ data map</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{height:100%;margin:0;font-family:system-ui,sans-serif}.lg{background:#fff;padding:8px 10px;border-radius:6px;font-size:12px;line-height:1.5;box-shadow:0 1px 4px #0003}
.lg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}</style></head><body><div id="m"></div><script>
const L_=__LAYERS__;
const m=L.map('m').setView([__LAT__,__LON__],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(m);
function pop(p){return Object.entries(p).filter(([k,v])=>v!==null&&v!==''&&k!=='status').map(([k,v])=>`<b>${k}</b>: ${v}`).join('<br>')+`<br><i>${p.status||''}</i>`}
function pts(fc,color,r){return L.geoJSON(fc,{pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:r,color:color,fillColor:color,fillOpacity:.8,weight:1}),onEachFeature:(f,l)=>l.bindPopup(pop(f.properties))})}
const C={farmland:'#8bc34a',orchard:'#558b2f'};
const ov={
 'Farmland (OSM)':L.geoJSON(L_.farmland,{style:f=>({color:C[f.properties.landuse]||'#9e9d24',weight:1,fillOpacity:.25}),onEachFeature:(f,l)=>l.bindPopup(pop(f.properties))}).addTo(m),
 'Pipes/canals (OSM)':L.geoJSON(L_.pipes,{style:{color:'#0288d1',weight:2}}).addTo(m),
 'WWTP (OSM)':pts(L_.plants,'#6a1b9a',9).addTo(m),
 'Pumps & wells (OSM)':pts(L_.pumps,'#e65100',5).addTo(m),
 'Storage (OSM)':pts(L_.storage,'#00838f',6).addTo(m),
 'Solar (OSM)':pts(L_.solar,'#fbc02d',5).addTo(m),
 'Demo farms (SIMULATED)':L.geoJSON(L_.farms,{pointToLayer:(f,ll)=>L.marker(ll,{title:f.properties.farm_id}).bindTooltip(f.properties.farm_id,{permanent:true,direction:'right'}),onEachFeature:(f,l)=>l.bindPopup(pop(f.properties))}).addTo(m)};
L.control.layers(null,ov,{collapsed:false}).addTo(m);
const lg=L.control({position:'bottomleft'});lg.onAdd=()=>{const d=L.DomUtil.create('div','lg');d.innerHTML='<b>QATRA+ data preview</b><br><i style="background:#6a1b9a"></i>WWTP<br><i style="background:#e65100"></i>pump / well<br><i style="background:#00838f"></i>storage<br><i style="background:#fbc02d"></i>solar<br>Pins = 10 SIMULATED demo farms<br><small>OSM = REPORTED but incomplete</small>';return d};lg.addTo(m);
</script></body></html>"""
    html = html.replace("__LAYERS__", json.dumps(layers)).replace("__LAT__", str(DEMO_LAT)).replace("__LON__", str(DEMO_LON))
    (ROOT / "data" / "map_preview.html").write_text(html, encoding="utf-8")
    return {k: len(v["features"]) for k, v in layers.items()}


def main():
    cat = catalog()
    print("map layers:", map_preview())
    ds = cat[~cat["id"].str.startswith("CF")].copy()
    ds["rows"] = ds["file"].map(nrows)
    pd.set_option("display.width", 220); pd.set_option("display.max_colwidth", 60)
    print(ds[["id", "title", "status", "rows", "file"]].to_string(index=False))
    tv = cat[cat["status"].str.contains("TO_VERIFY", na=False)]
    print("\nTO_VERIFY items:", len(tv)); print(tv[["id", "title"]].to_string(index=False))


if __name__ == "__main__":
    main()
