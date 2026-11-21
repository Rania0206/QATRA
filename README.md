# QATRA قطرة

Decision-support tool for reusing **treated wastewater (TWW)** in agriculture, demonstrated on the
**Zaouiet-Sousse** irrigation perimeter (Tunisia, fed by the Sousse Sud wastewater plant).

For each daily batch of treated water, QATRA answers four questions:

1. **Is the batch usable?** Is the lab analysis recent enough, and do the values respect Tunisian rules?
2. **Which farms can receive it?** Crop, soil salinity and legal restrictions decide.
3. **How much, and when to pump?** Allocation across farms, with pumping scheduled on solar hours and outside grid outages.
4. **What does it save?** Fresh water, energy and CO₂.

> **All operational data is SIMULATED.** The scenario is *inspired by* Zaouiet-Sousse and is not real operations.
> The app shows a permanent banner saying so. Real sources are labelled with a status tag (see [Status tags](#status-tags)).

---

## Contents
1. [Project status](#project-status)
2. [Repository layout](#repository-layout)
3. [Getting started](#getting-started)
4. [Architecture](#architecture)
5. [Status tags](#status-tags)
6. [Calculations and formulas](#calculations-and-formulas)
7. [Data](#data)
8. [API contract](#api-contract)
9. [Team workflow](#team-workflow)

---

## Project status

| Area | State |
|---|---|
| Data pipeline (`scripts/`, `data/`) | Done: raw downloads, cleaned reference tables, simulated scenario |
| Backend skeleton (FastAPI, in-memory store, 17 routers) | Done |
| **Batches** (`/api/batches`, validity of analyses) | Done (A-02) |
| Compatibility rules, needs, optimiser, soil, heatwave, impact, risk, passport, LLM explain | Router stubs only. The formulas below marked *planned* describe the intended model |
| Frontend shell (10 tabs, hash routing, banner) | Done (B-01a) |
| Shared UI: `TagChip`, `Loading`, `ErrorBox`, `useApi` | Done (B-01b) |
| Frontend tabs other than Batches | Placeholders |

Formulas below are labelled **Implemented** (in code today), **Data pipeline** (computed by a script to produce a dataset), or **Planned** (design agreed, not coded yet).

---

## Repository layout

```
QATRA/
├── backend/            FastAPI app (Python)
│   ├── app/
│   │   ├── main.py         app + router registration, /api/health
│   │   ├── store.py        loads every dataset once into memory
│   │   ├── schemas.py      Pydantic models (mirror of the API contract)
│   │   ├── engine/         business logic (batches.py today)
│   │   └── routers/        one file per feature, one owner per file
│   ├── tests/
│   └── requirements.txt
├── frontend/           React + TypeScript + Tailwind 4 + Vite
│   └── src/
│       ├── App.tsx         tab list (TABS) wired into the shell
│       ├── components/     Shell, TagChip, Loading, ErrorBox, Placeholder
│       ├── hooks/          useHashTab, useApi
│       ├── features/       one folder per tab
│       ├── api/            client.ts (real or mock), types.ts
│       └── mocks/          JSON responses used in mock mode
├── data/
│   ├── raw/                cached downloads (OSM, NASA POWER, data.gov.tn, SoilGrids, PDFs)
│   ├── clean/              reference tables and GeoJSON layers
│   ├── simulated/          sim_* files: the demo scenario
│   └── data_catalog.csv    one row per dataset, with source and status
├── scripts/            numbered pipeline 01 → 09, run_all.sh
└── docs/api-contract.md    every endpoint and shared object
```

---

## Getting started

### Backend
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Git Bash: source .venv/Scripts/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload          # http://localhost:8000  (docs at /docs)
pytest                                 # backend tests
```

### Frontend
Requires Node.js LTS.
```powershell
cd frontend
npm ci
npm run dev:mocks     # no backend needed: answers come from src/mocks/*.json
npm run dev           # talks to the backend at VITE_API_BASE_URL (default http://localhost:8000)
npm run build         # tsc + vite build
```
Tabs are addressable by URL hash: `http://localhost:5173/#/soil`, `#/batches`, and so on.

### Rebuild the data
Run the scripts in number order (`python scripts/NN_*.py`, or `scripts/run_all.sh`). Downloads are cached in `data/raw/`.
Details and caveats are in [data/README.md](data/README.md).

---

## Architecture

```
React (Vite)  ──HTTP/JSON──▶  FastAPI  ──▶  engine/*  ──▶  in-memory store  ◀──  data/clean + data/simulated
   │                                                                              (loaded once at startup)
   └── mock mode: client.ts reads src/mocks/*.json instead of calling the API
```

- The **store** loads all CSV/JSON/GeoJSON at startup. Nothing is written back to `data/`; operator-created batches live in memory only.
- The **engine** holds pure business logic. Routers stay thin.
- The **mock mapping** is deterministic: `GET /api/batches/{id}/risk` → `batches_id_risk.json`; non-GET methods get a `post_` / `patch_` prefix.
- The **API contract** ([docs/api-contract.md](docs/api-contract.md)) is shared by both sides. Change it only by agreement, updating `schemas.py`, `types.ts` and the matching mock together.

---

## Status tags

Every figure, dataset and API object carries a status, shown in the UI by the `TagChip` (colour **and** symbol, so it is readable without colour vision).

| Tag | Meaning | Chip |
|---|---|---|
| `REPORTED` | Published by someone else | green ✓ |
| `ESTIMATE` | Our method, with stated uncertainty | blue ≈ |
| `PROJECTION` | Official target or forecast | purple ↗ |
| `SIMULATED` | Demo data | amber ◆ |
| `TO_VERIFY` | Not confirmed | red, outlined ? |

---

## Calculations and formulas

### 1. Validity of a lab analysis — *Implemented* (`backend/app/engine/batches.py`)

A batch is only usable if its analyses are recent. The validity window comes from **Decree 89-1047, Art. 3** (read from `nt106003_rules.json`, with hard-coded fallbacks):

| Analysis type | Decree | Validity window |
|---|---|---|
| Physico-chemical (pH, BOD5, COD, TSS, chloride, EC…) | Art. 3a, at least monthly | **30 days** |
| Parasite eggs | Art. 3c, every 15 days | **15 days** |
| Metals (As, Cd, Cr, Cu, Hg, Ni, Pb, Zn…) | Art. 3b, at least per semester | **182 days** |

```
valid_until = analysis_date + validity_days(type)
is_valid    = batch_date ≤ valid_until
```

Batch-level status:
- `missing`: physico-chemical **or** parasite-eggs analysis is absent (metals are not required per batch).
- `expired`: all required types exist but at least one has `is_valid = false`.
- `valid`: otherwise.

A missing metals analysis only adds a non-blocking warning. This module checks **dates**, not legal **limits**; limit checks belong to the compatibility rules (see 2).

### 2. Legal limits and compatibility rules — *Planned* (`rules` router)

Inputs are the NT 106.03 (1989) limits in `data/clean/nt106003_rules.json`:

| Parameter | Limit | Parameter | Limit |
|---|---|---|---|
| pH | 6.5 – 8.5 | Boron | 3 mg/L |
| EC | 7000 µS/cm | Cadmium | 0.01 mg/L |
| COD | 90 mg O₂/L (24 h mean) | Arsenic, Cobalt, Chromium | 0.1 mg/L each |
| BOD5 | 30 mg O₂/L (24 h mean) | Copper | 0.5 mg/L |
| TSS | 30 mg/L | Iron | 5 mg/L |
| Chloride | 2000 mg/L | Fluoride | 3 mg/L |
| Organochlorines | 0.001 mg/L | | |

Faecal coliforms have **no limit** in NT 106.03. The engine uses a WHO-derived fallback of **1,000 CFU/100 mL**, tagged `TO_VERIFY`; it is not Tunisian law.

Each rule returns a `RuleResult {rule_id, passed, severity, reason_en, reason_fr, legal_ref}` with severity `block`, `condition` or `info`. The farm-level decision is:

```
decision = blocked      if any rule has severity=block and passed=false
         = conditional  else if any rule has severity=condition and passed=false
         = compatible   otherwise
```

Crop rules (QATRA interpretation of the decree and the arrêté of 21 June 1994, tagged `ESTIMATE`):
- **Blocked**: vegetables eaten raw (Art. 5) and direct grazing (Art. 6). Example: farm C (lettuce).
- **Allowed**: cereals, fodder (alfalfa, oat, barley), industrial crops, fruit trees without sprinklers, olive.

### 3. Crop water need — *Planned* (`needs` router); ET₀ itself is *Data pipeline*

**Reference evapotranspiration ET₀** is computed in `scripts/02_fetch_weather.py` with the **FAO-56 Penman-Monteith** equation (daily step), from NASA POWER inputs (Tmax, Tmin, mean RH, wind at 2 m, solar radiation):

```
ET₀ = [ 0.408·Δ·(Rn − G) + γ·(900 / (T + 273))·u₂·(es − ea) ] / [ Δ + γ·(1 + 0.34·u₂) ]      (G ≈ 0 at daily step)
```

with the supporting terms the script computes:

| Term | Formula |
|---|---|
| Mean temperature | `T = (Tmax + Tmin) / 2` |
| Atmospheric pressure | `P = 101.3 · ((293 − 0.0065·z) / 293)^5.26` (z = 20 m) |
| Psychrometric constant | `γ = 0.000665 · P` |
| Saturation vapour pressure | `e°(T) = 0.6108 · exp(17.27·T / (T + 237.3))` |
| Mean saturation pressure | `es = (e°(Tmax) + e°(Tmin)) / 2` |
| Actual vapour pressure | `ea = RH/100 · es` |
| Slope of vapour curve | `Δ = 4098 · e°(T) / (T + 237.3)²` |
| Inverse relative Earth–Sun distance | `dr = 1 + 0.033 · cos(2π·J/365)` (J = day of year) |
| Solar declination | `δ = 0.409 · sin(2π·J/365 − 1.39)` |
| Sunset hour angle | `ωs = arccos(−tan φ · tan δ)` (φ = latitude, radians) |
| Extraterrestrial radiation | `Ra = (24·60/π) · 0.0820 · dr · [ωs·sin φ·sin δ + cos φ·cos δ·sin ωs]` |
| Clear-sky radiation | `Rso = (0.75 + 2·10⁻⁵·z) · Ra` |
| Net shortwave | `Rns = 0.77 · Rs` |
| Net longwave | `Rnl = 4.903·10⁻⁹ · [(Tmax_K⁴ + Tmin_K⁴)/2] · (0.34 − 0.14·√ea) · (1.35·Rs/Rso − 0.35)` |
| Net radiation | `Rn = Rns − Rnl` |

Results are clipped to ≥ 0. Over 1995–2024 this gives a mean of **P ≈ 389 mm/yr** and **ET₀ ≈ 1457 mm/yr** at Sousse. The ET₀ is an `ESTIMATE` because it is computed locally from reanalysis inputs.

**Crop water need** (FAO-56 single crop coefficient) for the forecast endpoint:

```
ETc (mm/day)   = Kc × ET₀                     Kc from data/clean/crop_kc.csv (kc_ini / kc_mid / kc_end by stage)
need (m³/day)  = ETc (mm) × area (ha) × 10    (1 mm over 1 ha = 10 m³)
```

Seasonal volume used to parametrise the **simulated farms** (`scripts/07_simulate.py`):

```
season_m3 = area_ha × 10 × 1000 × Kc_mid × 0.6 / 0.9
            └ ~1000 mm seasonal ET₀ ┘        └ 0.6 effective deficit share, 0.9 application efficiency
```
rounded to the nearest 100 m³.

### 4. Salinity: yield loss and leaching — *Data pipeline* (parameters) / *Planned* (`soil` router)

**Yield response to soil salinity** (FAO-29, Maas–Hoffman), parameters per crop in `crop_salt_tolerance.csv`:

```
Y% = 100 − b · (ECe − a)       for ECe > a        (a = threshold in dS/m, b = % loss per dS/m)
Y% = 100                       for ECe ≤ a
```
Examples: alfalfa a = 2.0, b = 7.3; lettuce a = 1.3, b = 13.0; wheat a = 6.0, b = 7.1; barley a = 8.0, b = 5.0.
Olive and pomegranate have a rating (moderately tolerant) but no published threshold; 4.0 dS/m is an `ESTIMATE / TO_VERIFY` placeholder.

**Leaching requirement** (FAO-29), the extra fraction of water needed to keep soil salinity under the crop threshold:

```
LR = ECw / (5·ECe − ECw)        surface / sprinkler irrigation, ECe = crop threshold
LR = ECw / (2·max ECe)          drip / high-frequency irrigation
```
`ECw` is the irrigation-water EC. The soil simulation returns a `leaching_fraction` and the farm ECe series over time. When ECe is above the threshold, the allocated volume is **capped** (see 6).

**Steady-state soil salinity** rule of thumb used to set up the simulated farms: `ECe ≈ 1.5 × ECw` (FAO-29, leaching fraction 15–20 %). With ECw of 1–4 dS/m this gives 1.5–6 dS/m for TWW-irrigated coastal soils (`ESTIMATE / TO_VERIFY`).

**Water-quality guidelines** (`irrigation_water_quality_guidelines.csv`, FAO-29) classify the water on infiltration (SAR combined with ECw), sodium toxicity (SAR < 3 none, 3–9 moderate, > 9 severe) and salinity.

### 5. Energy: pumping and solar — *Data pipeline* (`07_simulate.py`) / *Planned* (`optimiser`)

**Pumping energy per m³** (hydraulic power, `P = ρ·g·Q·H / η`):

```
E (kWh/m³) = 0.00272 · H / η          0.00272 ≈ ρ·g / 3.6·10⁶ = 1000·9.81 / 3.6·10⁶ = 0.002725 kWh/(m³·m)
P (kW)     = 0.00272 · H / η · Q      Q in m³/h
```
- `H`: total head in m. `η`: wire-to-water efficiency (min 0.5, **typical 0.65**, max 0.75).
- The simulated transfer pump uses `Q = 150 m³/h`, `η = 0.65`; its standby unit uses `η = 0.60`.

**Pump head** for the simulated transfer line (plant → basin):

```
H = (basin_elevation − plant_elevation) + 3.0 × pipe_km + 5
     └ static lift from SRTM ┘            └ ~3 m/km friction ┘   └ 5 m residual pressure
```
where `basin_elevation` is the highest farm elevation + 5 m and `pipe_km` is the median plant-to-farm distance.

**Photovoltaic production** (`pv_estimate_sousse.csv`):

```
E_PV (kWh) = kWp × GHI (W/m²) / 1000 × PR × Δt (h)       PR = 0.8, Δt = 1 h
```
Uses horizontal irradiance, so it is conservative: a tilted array gains about 5–15 % per year. Demo arrays: 60 kWp (transfer station), 50 kWp default in the estimate file. Sizing rule of thumb: **array kWp = 1.2–1.5 × pump motor kW**.

**Hourly pumping schedule** (*planned*, solved as a linear programme with PuLP): each hour is assigned a source (`solar`, `grid`, `basin`, `off`) so that
```
solar_share = solar_kWh / total_energy_kWh
```
is maximised, subject to the basin volume balance (`basin_m3(t+1) = basin_m3(t) + inflow − pumped`), pump capacity, and **no grid use in outage windows**. Outage windows are simulated as **13:00–17:00 on every summer-2026 day with local Tmax ≥ 38 °C** (no official STEG schedule exists; basis: Human Rights Watch, Oct 2026).

**Cost reference:** STEG average selling price 2025 = 290.7 millimes/kWh, production cost 456.3 millimes/kWh (both `REPORTED`, press). The agricultural-pumping tariff was not found (`TO_VERIFY`).

### 6. Allocation of a batch across farms — *Planned* (`optimiser` router)

Per farm and batch, volume `m3` and status (`allocated`, `conditional`, `capped`, `blocked`) follow these constraints:

```
Σ m3_farm            ≤ batch volume_m3
m3_farm              ≤ crop need over the horizon             (formula 3)
m3_farm              = 0                if decision = blocked  (formula 2)
m3_farm              ≤ salinity cap     if ECe above threshold (formula 4, leaching limits the volume)
```
Outputs: `energy_kwh`, `solar_share`, and

```
fresh_replaced_m3 = Σ m3_allocated            (TWW volume substituting fresh-water supply)
```

### 7. Impact — *Planned* (`impact` router)

```
tww_allocated_m3      = Σ allocated volumes over the period
fresh_water_saved_m3  = tww_allocated_m3              (each m³ of TWW replaces a m³ of fresh water)
solar_share           = solar_kWh / energy_kWh
co2_avoided_kg        = avoided grid kWh × grid emission factor
```
The grid emission factor is **not sourced yet** (`null`, `TO_VERIFY` in `energy_params.json`; the Tunisian grid is roughly 70 % natural gas). Do not quote CO₂ figures until it is.

### 8. Geometry helpers — *Data pipeline* (`scripts/common.py`)

- **Distance between two points** (haversine, R = 6371.0088 km):
  `a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)`, `d = 2R · asin(√a)`.
  Used for farm-to-plant and farm-to-nearest-pump/well distances.
- **Polygon area:** approximate geodesic area of a lon/lat ring (spherical excess), giving hectares for OSM farmland.
- **Polygon centroid:** ring centroid of each farmland polygon.
- **Soil texture:** USDA triangle in simplified ordered rules from sand and clay (silt = 100 − sand − clay), e.g. `clay ≥ 40 → clay`, `27 ≤ clay < 40 → clay loam / silty clay loam / sandy clay loam`. SoilGrids values (0–30 and 30–60 cm) are matched to each farm by nearest point.

---

## Data

| Folder | Content |
|---|---|
| `data/raw/` | Cached downloads: OSM (Overpass), NASA POWER, Open-Meteo, data.gov.tn (Agridata), SoilGrids, PDFs (NT 106.03 slide, Decree 89-1047, Benabdallah 2003) |
| `data/clean/` | Reference tables: crop Kc, salt tolerance, water guidelines, STEG tariffs, pump specs, climate, PV estimate, GeoJSON layers (plants, pumps, storage, farmland, pipes) |
| `data/simulated/` | The demo scenario: 60 daily batches, 10 farms on real OSM farmland, pumps/basin/PV, scenarios, outage windows |

Highlights of the simulated scenario:
- **60 batches** from Sousse Sud (2026-07-01 → 2026-08-29), including 3 injected non-compliant days and 6 batches with analyses older than 30 days.
- **10 farms (A–J)**. A is alfalfa with ECe 1.9 (threshold 2.0, expected *conditional*); B is olive (expected *compatible*); C is lettuce (expected *blocked*, Art. 5).
- **2 scenarios**: a default day (1,000 m³ batch) and a **heatwave + 13:00–17:00 outage** (2026-08-26).

Full provenance is in [data/data_catalog.csv](data/data_catalog.csv) and the caveats (what is `TO_VERIFY`, what OSM does not cover) in [data/README.md](data/README.md). Two to remember:
- Sousse Sud's treatment level and exact coordinates are `TO_VERIFY`.
- OSM shows 0 pumping stations near Sousse. That reflects missing mapping, not absence, so demo wells use `SIM-WELL-*` ids.

---

## API contract

26 endpoints grouped by feature (batches, farms, compatibility, forecasts, allocation, soil, heatwave, impact, messages, requests, anomalies, territory, explain). The full table with request and response shapes and examples is in [docs/api-contract.md](docs/api-contract.md).

---

## Team workflow

- `main`: stable. `dev`: integration. Work happens on `feature/<ticket>-<name>` branches, merged into `dev` by pull request (for example `feature/A-02-batches`, `feature/B-01-shell`).
- One developer owns each router file and each `features/*` folder.
- Adding a tab is one line in the `TABS` array in `frontend/src/App.tsx`.
- Shared components live in `frontend/src/components/` (`TagChip`, `Loading`, `ErrorBox`, `Shell`); use them instead of local copies.
- Change the API contract only by agreement, and update `schemas.py`, `types.ts` and the mocks together.
