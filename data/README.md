# QATRA+ data pack: Zaouiet-Sousse demo (collected 2026-11-21)

Every dataset and figure has a **status**:
- **REPORTED**: published by someone else
- **ESTIMATE**: our method, with stated uncertainty
- **PROJECTION**: official target or forecast
- **SIMULATED**: demo data
- **TO_VERIFY**: not confirmed

The full list is in `data_catalog.csv`, with one row per dataset or figure. Load anything with `scripts/load_data.py`.
To rebuild everything, run the scripts in `scripts/` in number order (`py -3.13 scripts/NN_*.py`). Raw downloads are cached in `data/raw/`.

## 1. What was found (REPORTED)

| Module | Result | File |
|---|---|---|
| 1 Plants | 54 wastewater plants mapped in OSM for Tunisia. Official Agridata table: **Zaouiet Sousse perimeter is fed by the Sousse Sud WWTP** (current capacity 10,000 m³/d, 257 ha equipped, 523,280 m³ distributed in 2023/24). | `plants_tunisia.geojson`, `plants_details.csv`, `tww_irrigated_areas.csv` |
| 1.4 data.gov.tn | No usable CKAN API, and robots.txt disallows `/api/` and query URLs. Two Ministry of Agriculture (Agridata) Excel files downloaded: *TWW-irrigated perimeters by region, campaigns 2021/22 to 2023/24* (114 rows) and *TWW consumption per perimeter, 1996/97 to 2021/22*. Dam datasets on the portal returned HTML error pages. | `tww_irrigated_areas.csv`, `tww_consumption_by_perimeter.csv` |
| 2 Pumps/storage | OSM within 20 km: 2 (both water wells; **0 pumping stations**) pumps/wells, 67 storage features (mostly basins and reservoirs), 70 pipes/canals, 0 solar generators. National pumping stations: only 18 `man_made=pumping_station` in a Tunisia bounding box (a bbox query was used because the country-area query kept timing out on Overpass). **No public official pumping-station list exists** (ONAS/SONEDE/CRDA). Pump and network data are fragmented and not open; the only public figure is "10 ONAS pumping stations in Sousse + Hammam Sousse, 99% equipped" (press, Oct 2026). | `pumps_*.geojson`, `storage_sousse.geojson`, `pumping_stations_official.csv` |
| 2.4 Elevation | SRTM 30 m elevations (OpenTopoData) for plants, pumps, storage, farmland centroids and demo farms. | `elevation_m` columns |
| 3 Farmland | 103 OSM farmland/orchard polygons within 20 km, with area (ha), centroid, and distance to the nearest plant and the nearest pump/well. | `farmland_sousse.geojson` |
| 4 Soils | SoilGrids 2.0 (clay, sand, silt, SOC, pH, CEC, bulk density at 0–30 and 30–60 cm) for a 4×4 grid, the demo centre and the 10 demo farms, plus USDA texture class. **SoilGrids has no salinity.** | `soilgrids_sousse.csv` |
| 5 Crops | FAO-56 Kc values and stage lengths. FAO-29 salt tolerance, water-quality guidelines and the leaching-requirement (LR) formula. Sousse is dominated by olive (~78,000 ha, press). | `crop_kc.csv`, `crop_salt_tolerance.csv`, `irrigation_water_quality_guidelines.csv`, `sousse_crops.csv` |
| 6 Regulation | **NT 106.03 limits transcribed from the Ministry of Environment slide (p.13)**, with EC = 7000 µS/cm from Benabdallah 2003 Table 10. **Decree 89-1047 read from the JORT scan (FAOLEX)**: monitoring frequency (monthly physico-chemical, every 15 days for parasite eggs, every semester for trace elements), ban on vegetables and raw-eaten crops (Art. 5), ban on direct grazing (Art. 6), sprinkler distance rule (Art. 10). Allowed-crop list: arrêté of 21 June 1994. | `nt106003_rules.json` |
| 7 Weather | Open-Meteo 7-day forecast. **Summer 2026 hourly data and the 30-year (1995–2024) daily baseline come from NASA POWER**, because Open-Meteo's archive returned "Daily API request limit exceeded". ET0 is computed with FAO-56 Penman-Monteith. 30-year mean: P ≈ 389 mm/yr, ET0 ≈ 1457 mm/yr. | `weather_*.csv`, `climate_30y_sousse.csv`, `pv_estimate_sousse.csv` |
| 8 Energy | E = 0.00272·H/η (physics). STEG 2025 average selling price is 290.7 millimes/kWh and production cost 456.3 (press). | `energy_params.json`, `steg_tariffs.csv` |
| 9 Pitch figures | 32 rows, one metric per row. | `context_figures.csv` |

## 2. What is SIMULATED (`data/simulated/`, files start with `sim_`)
- `sim_batches.csv`: 60 daily batches from Sousse Sud (2026-07-01 to 2026-08-29), drawn from `tww_quality_ranges.csv`. It contains 3 injected non-compliant days (high BOD5/COD/TSS on day 18, helminth eggs > 1/L on day 39, high BOD5 on day 52) and 6 batches whose analysis is older than 30 days (the decree requires monthly physico-chemical analysis).
- `sim_lab_history_weekly.csv`: 2 years of weekly analyses, for the uncertainty model.
- `sim_farms.csv`: 10 farms **placed on real OSM farmland polygons** near Zaouiet-Sousse.
  - A: alfalfa, 2 ha, ECe 1.9 (threshold 2.0). Expected: conditional.
  - B: olive, 4 ha, low ECe. Expected: compatible.
  - C: lettuce, 1 ha. Expected: blocked (Art. 5).
  - D–J: olive, fodder and cereals, including several small farms.
  - Phone numbers and the GDA are fake. ECe values are simulated within FAO-29 ranges; texture comes from SoilGrids.
- `sim_pumps_basin.json`: transfer pump head computed from SRTM elevations, plus basin, a 60 kWp PV array, and farm well pumps.
- `sim_scenarios.json`: default scenario (1,000 m³ batch, normal day) and the heatwave + 13:00–17:00 outage scenario (2026-08-26).
- `sim_outage_windows.csv`: 13:00–17:00 on every summer-2026 day with local Tmax ≥ 38 °C, based on HRW (Oct 2026). No official STEG schedule is published.

## 3. TO_VERIFY (be careful saying these on stage)
- Treatment level (secondary or tertiary) and exact coordinates of **Sousse Sud**. The OSM plant nearest the demo point (way 27944541, unnamed) is *assumed* to be it.
- No faecal-coliform limit exists in NT 106.03, which regulates only nematode eggs. The engine uses a WHO-derived fallback of 1,000 CFU/100 mL, **labelled TO_VERIFY**, which is not Tunisian law.
- The 1995 cahier des charges text was not found. The regulation is under revision (2026 press).
- Salt-tolerance thresholds for olive, pomegranate and oat: FAO-29 gives a rating but no number. Pomegranate Kc is not in FAO-56.
- Effluent EC, SAR and N ranges are literature ESTIMATES, not Sousse Sud lab data.
- STEG agricultural-pumping tariff: not found. Dam filling rate for August 2026: not found (ONAGRI stopped its daily bulletin in Oct 2025).
- Household-only water consumption: not found. The available figure is SONEDE's total consumption across all uses, 516 Mm³ in 2023.
- Water 2050 "national e-platform": not confirmed in the sources read.
- Soil salinity after 30+ years of TWW at Zaouiet: a study exists (Revue des Sciences de l'Eau, 2010) but no values were extracted. HWSD v2 was not downloaded. SoilFER Tunisia has no public maps yet (sampling done, maps planned by 2027).
- OSM coverage near Sousse is thin: 0 pumping stations, 2 wells and 0 solar generators within 20 km. **This is not a real-world absence.** Wells and pumps are simply unmapped, so every demo farm uses a `SIM-WELL-*` id.
- SoilGrids returns no data at the exact demo centre and at farm H (urban mask), and at 3 grid points over the sea. All valid points come out as **clay loam**, so farm B's "sandy loam" exists only in `soil_texture_demo`, flagged as a SIMULATED override.
- Weather reanalysis comes from NASA POWER (~0.5° cell), which smooths coastal extremes: local Tmax is 44.0 °C on 2026-08-26, while the national record was 49.7 °C in Kairouan.
- Process note: 6 search pages on data.gov.tn were fetched with query strings before I read its robots.txt (which disallows `/*?` and `/api/`). After that, only robots-allowed dataset pages and `/cms/download/` links were used.

## 4. Top 5 REPORTED figures safe to cite in the pitch
1. **318 million m³ of treated wastewater from 127 ONAS plants (2023).** Source: Rapport national du secteur de l'eau 2023, cited by A. Ben Rayana, allAfrica, 13 Jul 2025.
2. **Only 11.3 million m³ (3.8% of treated volume) used in agriculture in 2024.** Source: Rapport national sur le secteur de l'eau 2024, via Kapitalis, 23 Jun 2026. Another source labels the same figure as the 2023/24 campaign.
3. **7,819 ha equipped for TWW irrigation across 36 perimeters in 17 governorates, but only 2,778 ha actually irrigated (≈36%) as of July 2026.** Source: L'Economiste Maghrébin, 2 Sep 2026.
4. **Water 2050 strategy targets 70% agricultural valorisation of TWW: 450 of 560 million m³, 120 projects, 53% of strategy funds.** These are PROJECTIONS. Sources: La Presse, 18 Jul 2026; WebManagerCenter, 20 Jul 2026.
5. **Summer 2026 was Tunisia's hottest since 1950 (+2.9 °C vs 1991–2020, INM). Power outages were concentrated 13:00–17:00.** Sources: INM via La Presse, 22 Sep 2026; Human Rights Watch, 6 Oct 2026.

Local bonus figure: **Zaouiet Sousse perimeter, 257 ha equipped, fed by Sousse Sud WWTP, 523,280 m³ TWW distributed in 2023/24.** Source: Ministry of Agriculture / Agridata via data.gov.tn.

Do not merge these: "22% reused (all uses)" and "4% agriculture" (INRGREF, Aug 2026), "<10% exploited" (2025) and "3.8% agriculture" (2024) use **different definitions**. They are kept as separate rows (CF05–CF08).
Court of Auditors: 61% of treated water non-compliant and 33 plants meeting no standard. The audit covers **2008–2011** and was published in **May 2014**, so it is old. Cite it only with that date.
