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

_Last updated: 2026-11-22. Updated by whoever merges into `dev`; keep it current after every task._

**The two developers**
- **Dev A** (GitHub `malak584`): batches, legal rules and compatibility, QATRA Lite scope, English/French/Arabic, farmer view.
- **Dev B** (GitHub `Rania0206`): app shell and shared UI, plants and map, soil model, batch passport.

### Done and merged in `dev`

| Task | Owner | What it is |
|---|---|---|
| Data pipeline (`scripts/`, `data/`) | shared | Raw downloads, cleaned reference tables, simulated scenario |
| A-02 | Dev A | Batches: `GET/POST /api/batches`, validity of lab analyses (Decree 89-1047), batches table and detail drawer |
| A-03 | Dev A | Legal rules engine (NT 106.03, Decree 89-1047, 1994 crop list, FAO-29 advice), `GET /api/farms`, `GET /api/farms/{id}/compatibility`, `GET /api/compatibility`, compatibility screen |
| QATRA Lite | Dev A | Reduced scope for the demo: contract, Savings and Business shapes, next-version tabs |
| A-15 | Dev A | English / French / Arabic (RTL), farmer sees only their own farm (farm code or SMS link), plain-language farm panel, day picker |
| Restyle, farm code, operator view | Dev A | Map and Soil in the new look, farm-code fixes, hidden operator view with all farms (`#/compatibility?view=operator`) |
| A-04 | Dev A | Daily water need per farm (`engine/needs.py`: ET0 × Kc − 0.7 × rain), `GET /api/forecast/needs` |
| A-05 | Dev A | Rule-based allocation per farm (`engine/plan.py`: legal block, soil cap, anti-rebound, sharing) and the 24-hour pump schedule (`engine/schedule.py`), `POST /api/allocate` |
| A-14a | Dev A | Savings engine (`engine/savings.py`): well electricity saved, fertiliser value of the nitrogen in treated water, water cost, QATRA fee; `POST /api/savings` |
| B-01 | Dev B | App shell (hash tabs, demo banner), shared `TagChip`, `Loading`, `ErrorBox`, `useApi` |
| B-13 | Dev B | `GET /api/plants`, `GET /api/map/layers` (plants, irrigated area, OSM plants, farmland, farms, basin) |
| B-02 | Dev B | Map tab: Esri satellite and OSM basemaps, plant popup with tag, farmland polygons |
| B-03 | Dev B | Soil engine: `engine/soil.py`, `engine/soil_inputs.py` (`cap_volume`), `POST /api/soil/simulate` (naive vs managed leaching over 30 years) |
| B-04 | Dev B | Soil tab: chart, year slider with Play, summary cards, blocked-by-law state |
| B-05 | Dev B | Heatwave and grid outage: `engine/heatwave.py` (naive policy: 4 hours without water on 2026-08-26; QATRA policy on solar and the basin: 0) and `POST /api/scenarios/heatwave`. Volumes come from Dev A's plan (A-05) through an optional `need_fn` added to `plan.allocate` |
| B-06 | Dev B | Heatwave tab: "Without QATRA" and "With QATRA" 24-hour panels (pump power by source, basin level, outage shading, shared axes), a day picker over the 12 outage days and a very large animated "hours without irrigation" counter. `POST /api/scenarios/heatwave` takes an optional `date` and returns `dates` and `allocated_m3`. English, French, Arabic |
| B-12 | Dev B | `GET /api/batches/{id}/passport` (quality summary, analysis checks, crops, timeline), passport page `/passport/{id}` for phones, reusable `<PassportQR>`, LAN scripts |

### In progress (on a branch, not merged yet)

| Task | Owner | State |
|---|---|---|
| B-08a, B-08b, B-08c | Dev B | Messages to the farmers: `engine/messages.py` (templates allocated, conditional, capped, blocked in French and Tunisian Arabic, saving line from Dev A's savings engine), `GET /api/messages`, the Messages tab (phone mockup, farm selector, FR / AR toggle, passport link, quick replies 1 / 2), and the answers: `POST /api/messages/reply` reads 1 accept, 2 refuse, 3 postpone, 4 call me; a refusal runs Dev A's allocator again without that farm and stores the new plan (`GET /api/allocation/current`). The Arabic waits for a Tunisian speaker (`docs/messages-templates.md`). Branch `feature/B-08-messages` |
| B-10a, B-10b | Dev B | `GET /api/meta/sources` (`routers/meta.py`): the 64 catalogue rows plus `safe_figures`, the 5 figures of `data/README.md` section 4 (318 Mm³, 11.3 Mm³ = 3.8 % in 2024, 7,819 / 2,778 ha, Water 2050 targets as PROJECTION, +2.9 °C), values read from `context_figures.csv`, one definition each (22 % / 4 % / <10 % kept apart, Court of Auditors 61 % left out). Branch `feature/B-10-meta-sources` | The Public tab (B-10b) shows 5 large aggregated numbers from `/api/impact` (fresh water replaced, treated water allocated, solar share, farms served, batches blocked; each with its status chip, no farm name or phone number) and a Sources screen listing the 5 safe figures with definition, status, date and link. `/api/impact` is still an empty stub on the real server (the tab works in mock mode).
| B-11a, B-11b | Dev B | Demo role selector in the header (ONAS, Lab, CRDA, GDA, Public): the menu highlights the sections of the role and dims the others, nothing is blocked. The role lives in the URL hash (`#/batches?role=onas`) and follows tab changes; a visible note says it is a demo switch, not a login. CRDA and GDA also highlight the Requests tab (B-11b). Branch `feature/B-11-roles` | Water requests (B-11b): `POST /api/requests` (farm must exist, `requested_m3` > 0, else 404 / 422), `GET /api/requests?status=`, `PATCH /api/requests/{id}` approved or rejected (404 unknown id, 409 once decided), in memory. A new **Requests** tab (one line in `App.tsx` and one in `i18n.tsx`, tell Dev A) has the form, the list with Approve / Reject buttons and a status chip Pending, Approved or Rejected. Branch `feature/B-11-requests` |
| Fix | Dev B | `GET /api/impact` is now real (`engine/impact.py`): totals over the 60 simulated batches, each run through Dev A's allocator and pump schedule, no farm name; `co2_avoided_kg` is null until the grid emission factor is sourced. The Public tab now works on the real server, not only in mock mode. CORS accepts any local dev port (`localhost` or `127.0.0.1`), not only 5173. Branch `fix/impact-endpoint` |

### Not done yet

| Area | State |
|---|---|
| Allocation tab | Next. The API exists (`POST /api/allocate`), the tab is still a placeholder |
| A-05 solar threshold | Open point for Dev A: the pump schedule calls solar only if PV ≥ the full pump power (44.6 kW); the 60 kWp array peaks at 44.3 kW on the heatwave day, so it plans 7 % solar there (`SOLAR_MIN_FRACTION`). The heatwave model uses a pump power proportional to its flow |
| Supply forecast (cut from the MVP), risk score (A-08), anomalies, messages, territory, LLM explain | Router stubs. The Impact tab only shows a small example |
| Territory tab (Allocation, Savings and Business are built by Dev A, Public by Dev B) | Placeholder. The Savings API exists (`POST /api/savings`), the business view (A-14c) does not |
| Passport `destinations` | Still empty: it can now be filled from `POST /api/allocate` (A-05) |
| Map: the version with all farms coloured by decision (B-02b) | Not merged: `dev` deliberately shows only the farmer's own farm. The code is in git history (`b733d53`, branch `feature/B-02b-map-farms`) |
| Map and Soil texts | English, French and Arabic. Passport page: English only |

Tests: 356 backend tests with the impact fix (`pytest`), frontend build (`npm run build`) passes.

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
│   │   ├── engine/         business logic: batches, rules, compatibility, farms, soil, soil_inputs, passport
│   │   └── routers/        one file per feature, one owner per file
│   ├── tests/
│   └── requirements.txt
├── frontend/           React + TypeScript + Tailwind 4 + Vite
│   └── src/
│       ├── App.tsx         tab list (TABS) wired into the shell
│       ├── components/     Shell, TagChip, Loading, ErrorBox, PassportQR, shared UI
│       ├── hooks/          useHashTab, useApi
│       ├── i18n.tsx        English / French / Arabic
│       ├── features/       one folder per tab, plus passport/ (page outside the tabs)
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

### Open the batch passport on a phone
The passport page is `/passport/{batch id}` (for example `/passport/SSUD-20260708`): no tabs, made for a phone. Every batch drawer (Batches tab) shows its QR code.

```powershell
cd frontend
npm run dev:mocks:lan     # or: npm run dev:lan  (real API)
```
Vite prints several `Network:` addresses. Use the one marked **Wi-Fi** (the `192.168.x.x` VMware ones are not reachable from a phone), for example `http://172.17.11.238:5173`.
1. Phone and laptop must be on the same Wi-Fi.
2. On the laptop, open QATRA through that same Wi-Fi address (not `localhost`): the QR code is built from the address of the page that shows it, so a `localhost` QR cannot be opened from a phone (the drawer warns about it).
3. Scan the QR code, or type `http://<laptop-ip>:5173/passport/SSUD-20260708` on the phone.
4. If the phone cannot connect, allow Node.js on private networks when Windows Firewall asks.

With the real API (`dev:lan`), the backend must also run (`uvicorn app.main:app --host 0.0.0.0`) and `VITE_API_BASE_URL` must point to the laptop address, not `localhost`. The mock mode needs none of this.

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

### 2. Legal limits and compatibility rules — *Implemented* (A-03: `engine/rules.py`, `engine/rules_config.py`)

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

Faecal coliforms have **no limit** in NT 106.03, so the rules engine has no coliform rule. The batch passport shows a WHO-derived fallback of **1,000 CFU/100 mL**, tagged `TO_VERIFY`; it is not Tunisian law and never decides a batch's colour.

Each rule returns a `RuleResult {rule_id, passed, severity, reason_en, reason_fr, legal_ref}` with severity `block`, `condition` or `info`. A **soil-salinity condition** applies per crop: it fails when the soil ECe is at least **80 %** of the crop threshold (FAO-29, a QATRA choice). The farm-level decision is:

```
decision = blocked      if any rule has severity=block and passed=false
         = conditional  else if any rule has severity=condition and passed=false
         = compatible   otherwise
```

Crop rules (QATRA interpretation of the decree and the arrêté of 21 June 1994, tagged `ESTIMATE`):
- **Blocked**: vegetables eaten raw (Art. 5) and direct grazing (Art. 6). Example: farm C (lettuce).
- **Allowed**: cereals, fodder (alfalfa, oat, barley), industrial crops, fruit trees without sprinklers, olive.

### 3. Crop water need — *Implemented* (A-04: `engine/needs.py`); ET₀ itself is *Data pipeline*

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

### 4. Salinity: yield loss, leaching and TWW volume cap — *Implemented* (B-03: `engine/soil.py`, `engine/soil_inputs.py`)

All assumptions below are `ESTIMATE`. Crop thresholds that FAO-29 does not publish (olive, pomegranate: 4.0 dS/m; oat fodder: 6.0 dS/m) are `TO_VERIFY` placeholders and tag the result `TO_VERIFY`.

**Leaching requirement and equilibrium** (FAO-29). `ECw` = water EC, `ECe_thr` = crop threshold, `LF` = leaching fraction in (0, 1]:

```
LR     = ECw / (5·ECe_thr − ECw)          infinite (flag "water too saline for this crop") when 5·ECe_thr ≤ ECw
ECe_eq = ECw · (1 + LF) / (5 · LF)        so LF = LR gives ECe_eq = ECe_thr
```

**Yearly trajectory** (30 years, relaxation time τ = 3 years):

```
ECe[t+1] = ECe[t] + (ECe_eq − ECe[t]) · (1 − exp(−1/τ))
```

The series moves monotonically from the starting ECe to `ECe_eq`, so it stays under the threshold exactly when `ECe0 ≤ thr` and `ECe_eq ≤ thr`.

**Two policies** (`POST /api/soil/simulate`):

```
naive : LF = LF_naive                      no managed leaching, rain only
qatra : LF = max(LR, LF_naive), capped at 0.5
LF_naive = Pe / (Pe + ETc)                 bounded to (0.02, 0.5]
Pe  = 0.7 × mean annual precipitation      effective rain, 30-year mean (~272 mm/yr)
ETc = Kc_mid × ET0 of the growing season   mm, 30-year mean; seasons: perennials Apr–Oct, winter cereals and fodder Nov–May
```

Irrigation water per season (`need = ETc × area_ha × 10` m³): naive applies exactly `need`; QATRA applies `need × (1/(1−LF) − LF_naive/(1−LF_naive))`, which credits the rain that already leaches (equal to `need` when `LF = LF_naive`).

**Yield loss at the last year** (FAO-29, Maas–Hoffman), slope `b` from `crop_salt_tolerance.csv`:

```
loss% = clip( b · (ECe_year30 − a), 0, 100 )      null when the crop has no published slope (olive, pomegranate, oat): never invented
```
Examples: alfalfa a = 2.0, b = 7.3; wheat a = 6.0, b = 7.1; barley a = 8.0, b = 5.0.

**Maximum TWW volume per season per farm** (`cap_volume(farm, ecw)`): the largest volume of treated water that keeps the 30-year ECe under the threshold, never above the crop need, 0 for crops forbidden by law. The water is mixed with fresh water of EC `ECf = 1.0 dS/m` (ESTIMATE):

```
ECw_max = thr · 5·LF_max / (1 + LF_max)           LF_max = 0.3, a practical ceiling (ESTIMATE)
f       = clip( (ECw_max − ECf) / (ECw − ECf), 0, 1 )   share of the water that can be TWW
LF      = min( max(LR(ECw_mix), LF_naive), LF_max )
volume  = min( f · need / (1 − LF), need )
```
`limiting_reason` is `crop_need`, `salinity`, `blocked` or `infeasible`. Example at ECw = 3.5 dS/m: farm A (alfalfa) 15,728 of 21,048 m³ (salinity), farm B (olive) its full need, farm C (lettuce) 0 (blocked).

**Steady-state rule of thumb** used to set up the simulated farms: `ECe ≈ 1.5 × ECw` (FAO-29, leaching fraction 15–20 %). With ECw of 1–4 dS/m this gives 1.5–6 dS/m for TWW-irrigated coastal soils (`ESTIMATE / TO_VERIFY`).

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

### 6. Allocation of a batch across farms — *Implemented* (A-05: `engine/plan.py`, `engine/schedule.py`); the hourly energy optimisation is *Planned*

Simple readable rules, no optimiser (A-05a), applied per farm in this order. Status is `allocated`, `conditional`, `capped` or `blocked`:

```
1. legal status          m3_farm = 0                       if the farm is blocked (formula 2)
2. need                  need = max(0, ET0·Kc − 0.7·rain) × area × 10      (formula 3)
3. soil cap              conditional farms limited by cap_volume (formula 4)
4. anti-rebound          m3_farm ≤ fresh_m3_season / 180  never more than the farm already takes from its own well that day
5. sharing               everybody gets the capped need if the total fits in the batch,
                         otherwise the batch is shared in proportion to the capped needs
6. leftover              what is not allocated stays in the basin (a warning says how much)
```
Volumes are rounded down to 0.1 m³. **Pump schedule** (A-05b, 24 hourly slots): hours are filled with solar first (an hour counts as solar when PV ≥ the pump power of 44.6 kW, 07:00-12:00 first), then the grid at 06:00 and 18:00-21:00, then the other daytime hours as a last resort; during an outage the grid is never used. Outputs: `energy_kwh`, `solar_share`, and

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

### 9. Batch passport — *Implemented* (B-12: `engine/passport.py`)

Read from the existing engines and the regulation pack; nothing is invented.
- **Quality summary** (7 rows): EC (limit 7000 µS/cm shown as 7 dS/m), BOD5 30, COD 90, TSS 30 mg/L, pH 6.5–8.5, helminth eggs 1 per litre (NT 106.03, `REPORTED`), faecal coliforms 1,000 CFU/100 mL (WHO fallback, `TO_VERIFY`, not law). A value that is not measured has `ok = null`.
- **Analysis checks**: `valid_until = analysis date + validity`, validity from Decree 89-1047 Art. 3: physico-chemical 30 days, parasite eggs 15 days, metals 182 days (not required per batch).
- **Colour**: `compliant` is green, `conditional` amber, `non_compliant` and `analysis_invalid` red, from the legal compliance of the batch until the risk model (A-08) exists.
- **Crops**: allowed = the 21 June 1994 order (fruit trees only without sprinklers; olive and alfalfa flagged "to verify"); empty when the batch is red. Blocked = crops eaten raw (Art. 5) and direct grazing (Art. 6).
- **QR code**: encodes `{page origin}/passport/{batch id}`.

### 10. Heatwave and grid outage — *Implemented* (B-05 and B-06: `engine/heatwave.py`, Heatwave tab)

The naive policy irrigates straight from the grid on demand: **no storage basin and no solar shifting**. Hours are hour-start labels: hour 13 is 13:00 to 14:00, so the window 13:00-17:00 covers hours 13 to 16. Outage days come from `sim_outage_windows.csv` (hot days, based on Human Rights Watch Oct 2026; no official STEG schedule exists) and from the scenario file.

**Irrigation demand profile** (ESTIMATE):

```
need_i     = max(0, ET0_day × Kc_i − 0.7 × rain) × area_i × 10       Dev A's formula (engine/needs.py)
daily_m3   = Σ need_i / 0.9                                          crop-need profile of the naive run on its own (B-05a)
per hour   = daily_m3 / 14   for hours 06:00-20:00, else 0           farmers irrigate during the working day
```
Only the demo farms that grow in the month of the day count (olive and alfalfa in August; winter cereals do not), and lettuce is excluded (forbidden for treated water). On 2026-08-26: ET0 = 7.88 mm, crop need 874 m³ (971 m³ with the 0.9 efficiency). **In the scenario the demand is the volume Dev A's plan allocates** (see below): 410.8 m³, 29.3 m³ per hour.

**Naive policy** (B-05a), with transfer pump TP1 (150 m³/h, 44.6 kW, so 0.2973 kWh/m³):

```
delivered_m3 = 0                      during an outage hour (the pump cannot run)
             = min(demand, 150)       otherwise
grid_kw      = delivered_m3 × 0.2973
unserved_m3  = demand − delivered
hours_without_water = hours with demand > 0 and nothing delivered
```
Result on 2026-08-26, scenario volume of 410.8 m³: **4 hours without water** (13:00 to 17:00), 117.4 m³ unserved, 87 kWh from the grid (with the crop-need profile of 971 m³ alone: 277.6 m³ unserved, 206 kWh). A day without outage (2026-07-08) gives 0. The result is tagged `SIMULATED` with the caveat "NASA POWER ~0.5 deg grid: coastal extremes smoothed" (local Tmax 44.0 °C against the national record of 49.7 °C).

**Choosing the day** (B-06b): the scenario can run on any of the 12 days of `sim_outage_windows.csv` (`date` in the request, `dates` in the response). That day's weather, outage and batch (`SSUD-yyyymmdd`) are used; the PV array, the 600 m³ basin starting level and the pump stay. On 3 days (12, 18 and 19 July) the batch cannot be used (analysis expired or a limit exceeded), so Dev A's plan allocates nothing: both policies have 0 hours without water and the tab says so instead of showing a QATRA win. On the 9 other days the naive policy has 4 hours without water and QATRA 0.

**QATRA policy** (B-05b, `qatra_run`): an hourly rule-based plan on the 60 kWp array (the 50 kWp estimate of `pv_estimate_sousse.csv` × 60/50) and the 3,000 m³ basin (600 m³ at the start of the scenario). The pump power is proportional to its flow, so a pump on part of the solar power delivers that part of its flow. Rules, hour by hour:

```
outside the outage:  1. irrigate on solar first:   direct = min(demand, 150 m³/h, PV_kW / 0.2973)
                     2. the rest from the basin by gravity, keeping the reserve the outage still needs
                     3. only what is left from the grid (backup)
during the outage:   4. irrigate from the basin by gravity, NO grid
every hour:          5. solar surplus pumps water into the basin, never above 3,000 m³
```
The plant supplies at most the batch of the day (1,800 m³). Basin evaporation (8 mm/d) is not applied: the basin area is not in the data. Result on 2026-08-26: **0 hours without water**, 0 kWh from the grid, 325 kWh of solar (share 100 %; it includes the surplus pumped into the basin for the next days), basin level between 583 and 1,339 m³, against 87 kWh of grid and 117.4 m³ unserved for the naive policy.

`POST /api/scenarios/heatwave` returns both hourly series, the 24-slot schedule (`solar`, `grid`, `basin` or `off`) and the naive run as `baseline`. **`allocation.items` are Dev A's plan** (A-05a): lettuce blocked (0), alfalfa conditional (soil cap), anti-rebound caps on the others, only the farms growing in August (A, B, D, H, I). It receives the need of the heatwave day through the optional `need_fn` of `plan.allocate`, because the forecast file does not cover that summer day. The hourly schedule is the heatwave model's, not the A-05 pump schedule (whose solar rule needs PV ≥ 44.6 kW, above the 44.3 kW peak of that day).

### 11. Savings per farm — *Implemented* (A-14a: `engine/savings.py`)

For each farm and one day of the plan (the m³ per farm come from the allocation, formula 6). A blocked farm gets 0 and a reason; a conditional farm uses its capped m³; a farm on the public network has no pump of its own and saves no electricity.

```
well_kwh_per_m³       = 0.00272 × well_depth_m / pump_efficiency
electricity_saved     = m³ × well_kwh_per_m³ × electricity_price             the farm stops pumping that water
N_kg                  = m³ × N_mg_per_L / 1000                               1 mg/L = 1 g/m³
fertiliser_value      = N_kg / 0.335 × fertiliser_price × availability       ammonium nitrate is 33.5 % N; availability 0.5 (ESTIMATE)
water_cost            = m³ × treated_water_price
net_saving            = electricity_saved + fertiliser_value − water_cost
qatra_fee             = qatra_fee_pct % × net_saving                         only when net_saving > 0 (10 %, ESTIMATE)
farmer_net            = net_saving − qatra_fee
```
The electricity price (290.7 millimes/kWh, STEG average sale price) and the nitrogen of the water come from the data pack. The fertiliser price (1.0 TND/kg) and the treated-water tariff (0.020 TND/m³) are `TO_VERIFY` assumptions. Season and year figures are `PROJECTION`s (daily total × 150 irrigation days × 1 season per year) and are never mixed with the daily ones. Prices can be overridden in the request.

### 12. Messages to the farmers — *Implemented, not merged* (B-08a: `engine/messages.py`)

No formula: templates by allocation status, filled with values that already exist. One message per farm for the latest allocation, in **French and Tunisian Arabic** (no language column in `sim_farms`).

```
allocated    "{m3} m³ available, delivery tomorrow {first hour}-{last hour}, reply 1 to accept, 2 to refuse"
conditional  same, with the condition: wash the salt out of the soil and watch the soil salinity
capped       same, with why the volume is limited (replaces the farm's own water, batch shared, soil salt)
blocked      why in simple words, safety first, never a fault of the farmer; NO number and NO money
saving line  "About {X} TND saved this season (estimate)"  only if Dev A's savings engine returns X > 0 for the farm
```
`{m3}` is the farm's volume in the Allocation; the delivery hours are the longest block of consecutive pump hours of the allocation's schedule (the pump may run at other hours too, which are not announced). `{X}` is `savings(plan, farm_id).season.farmer_net_tnd`, printed exactly as returned and never computed in the messages. **Every Arabic template has `needs_human_review: true`** until a Tunisian speaker approves it: the review sheet is `docs/messages-templates.md`.

**The tab** (B-08b): a phone mockup (status bar, QATRA contact, chat bubbles: outgoing green on the right, the farmer's replies grey on the left, timestamps). A farm selector and a FR / AR / FR + AR toggle; the Arabic is shown right to left. Under a message with water, "View water passport" opens `/passport/{batch_id}`. Buttons "1 · Accept" and "2 · Refuse" call `POST /api/messages/reply`; they are not shown when no water is offered (blocked farm). Buttons 3 and 4 will come once their meaning is defined. A visible note says "Mockup: no real message is sent". Next to the phone, a live table "Today's water plan" shows the plan and how it moved since it was first shown.

**Answers** (B-08c): `1` accept, `2` refuse, `3` postpone, `4` call me; Arabic-Indic digits work; any other text gets a help reply and changes nothing. A refusal runs `plan()` (Dev A's allocator, in process) again for the same batch without that farm, stores the new allocation and writes to the farms that got more water ("+X m³ added"). Blocked farms never receive the freed volume; a second `2` does nothing more. Note: Dev A's allocator never gives a farm more than its own need or anti-rebound cap, so on the default batch (1,500 m³ for about 800 m³ of needs) a refusal frees water that nobody else can use and it stays in the basin; on a limited batch such as SSUD-20260827 (700 m³) it is shared between the other farms.

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
