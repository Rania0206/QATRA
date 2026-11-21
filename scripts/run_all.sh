#!/usr/bin/env bash
# Rebuild the whole QATRA data pack. Raw downloads are cached in data/raw (add --refresh to 01/02 to re-download).
set -e
cd "$(dirname "$0")"
PY="${PY:-py -3.13}"
$PY 01_fetch_osm.py                 # OSM (Overpass) - plants, pumps, storage, pipes, farmland
$PY 02_fetch_weather.py             # Open-Meteo forecast + NASA POWER archive/climate + PV
$PY 03_fetch_datagov.py || true     # data.gov.tn CKAN probe (no API; downloads were done from dataset pages)
$PY 04_clean_datagov.py             # Agridata TWW perimeters/consumption
$PY 05_build_reference.py           # regulation, FAO tables, pitch figures, etc.
$PY 06_fetch_soil_elevation.py elev # SRTM elevations on OSM layers
$PY 09_farmland_distances.py        # farm -> plant / pump distances
$PY 07_simulate.py                  # sim_* files (farms on real polygons)
$PY 06_fetch_soil_elevation.py soil # SoilGrids grid + demo farms (slow: fair-use 5 req/min)
$PY 07_simulate.py                  # re-run so farms pick up their own SoilGrids texture
$PY 08_catalog_map_summary.py       # data_catalog.csv, map_preview.html, summary
$PY load_data.py                    # smoke-test every loader
