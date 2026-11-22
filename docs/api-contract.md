# QATRA API contract

Shared between backend (FastAPI, `backend/app`) and frontend (React, `frontend/src`).
**Change only by agreement** of both developers. When you change a shape, update all three:
`backend/app/schemas.py`, `frontend/src/api/types.ts`, and the matching file in `frontend/src/mocks/`.

- Base URL: `http://localhost:8000` (frontend: `VITE_API_BASE_URL`)
- All bodies are JSON. Dates are ISO strings (`2026-07-08`, `2026-07-08T06:30:00`).
- Every router uses `prefix="/api"`; write the full path below in your router file.
- **Owner** = the router file in `backend/app/routers/` that implements the endpoint (one developer per file).
- **Mock** = the file in `frontend/src/mocks/` returned when `VITE_USE_MOCKS=true`. It is the full response example.
  Naming: path without `/api`, ids replaced by `id`, joined with `_`; non-GET methods get a `post_` / `patch_` prefix.

## Shared objects

| Object | Fields |
|---|---|
| `Tag` | `status`: `"REPORTED" \| "ESTIMATE" \| "PROJECTION" \| "SIMULATED" \| "TO_VERIFY"`, `source?`: string |
| `Analysis` | `type`: `"physico_chemical" \| "parasite_eggs" \| "metals"`, `date`, `valid_until`, `is_valid`: bool, `values`: `{param: number}` |
| `Batch` | `id`, `plant_id`, `date`, `volume_m3`, `treatment_level`, `analyses`: `Analysis[]`, `analysis_status`: `"valid" \| "expired" \| "missing"`, `status`, `risk_colour?`: `"green" \| "amber" \| "red"`, `warnings?`: `string[]` (default `[]`), `tag` |
| `Farm` | `id`, `name`, `crop`, `area_ha`, `lat`, `lon`, `soil_texture`, `soil_ece`, `head_m` (null if no own pump), `distance_km`, `fresh_source`, `fresh_m3_season`, `is_small_farm`, `well_depth_m?` (null default), `pump_efficiency?` (0..1, null default), `tag` |
| `RuleResult` | `rule_id`, `passed`, `severity`: `"block" \| "condition" \| "info"`, `source_type?`: `"tunisian_law" \| "agronomic_advice"` (NT 106.03 / Decree 89-1047 / 1994 order vs FAO-29), `reason_en`, `reason_fr`, `legal_ref` |
| `SavingsResult` (legacy, no longer returned) | `water_need_m3`, `well_kwh_avoided`, `well_cost_avoided_tnd`, `treated_water_cost_tnd`, `nitrogen_kg`, `fertiliser_kg_ammonium_nitrate`, `fertiliser_saved_tnd`, `net_saving_tnd`, `kwh_off_grid`, `well_water_kept_m3`, `compatibility_status`, `breakdown`: `[{label, value, unit, tag}]` |
| `SavingsReport` | A-14a, response of `POST /api/savings`: `batch_id`, `date?`, `scenario`, `items`: `[{farm_id, status, m3, nitrogen_kg, well_kwh_saved, electricity_saved_tnd, fertiliser_value_tnd, water_cost_tnd, net_saving_tnd, qatra_fee_tnd, farmer_net_tnd, reason?, tag}]` (one per farm, or just `farm_id`), `day` / `season` / `year`: `{m3, electricity_saved_tnd, fertiliser_value_tnd, water_cost_tnd, net_saving_tnd, qatra_fee_tnd, farmer_net_tnd, tag}` (`day` ESTIMATE, `season` = day x irrigation_days and `year` = season x seasons_per_year are PROJECTION), `assumptions`: `[{name, value, unit, source, status}]`, `warnings`: `string[]`, `tag`. Blocked farm: all 0 and a `reason`. Fee = `qatra_fee_pct`% of the net saving, 0 if it is negative |
| `BusinessView` | `area_name`, `area_ha`, `farms`, `total_saving_tnd`, `qatra_share_pct`, `qatra_revenue_tnd`, `steg_kwh_avoided`, `steg_value_tnd`, `national_areas` (36), `tag` |
| `SoilSimulation` | `farm_id`, `batch_id`, `crop`, `threshold_ece`, `ecw`, `years`: `[0..N]`, `naive`: `{series: number[], first_year_over: int \| null, water_used_m3_season, yield_loss_pct_30y: number \| null}`, `qatra`: same + `leaching_fraction`, legacy `series`: `[{day, ece}]` (= qatra curve, `day` = year x 365) and `leaching_fraction` (= `qatra.leaching_fraction`), `blocked_reason?` (string when the crop is forbidden for TWW, e.g. lettuce: the UI shows no simulation), `warning?`, `tag` |
| `Passport` | `batch_id`, `plant`, `date`, `volume_m3`, `analysis_status`, `risk_colour?`, `allowed_crops`, `blocked_crops`, `destinations`: `[{farm_id, m3}]`, `issued_at`, `qr_payload`, `tag` (original fields) + B-12a: `quality_summary`: `[{param, label, value?, unit, limit_min?, limit_max?, ok?, legal_ref, tag}]`, `checks`: `[{type, required, present, analysed_on?, valid_until?, validity_days, is_valid?, legal_ref}]`, `timeline`: `[{at, event}]` |
| `HeatwaveResult` | `scenario_id`, `label`, `date`, `dates`, `allocated_m3`, `allocation`: `Allocation`, `baseline`: `{energy_kwh, solar_share}`, `naive` and `qatra`: `{policy, hours_without_water, unserved_m3, delivered_m3, grid_kwh, solar_kwh, hourly: [{hour, outage, demand_m3, delivered_m3, unserved_m3, grid_kw, solar_kw, basin_m3?, source}] x24}`, `caveat`, `tag` |
| `Allocation` | `batch_id`, `items`: `[{farm_id, status, m3, cap_reason?}]`, `schedule`: `[{hour, pump_kw, source: "solar" \| "grid" \| "basin" \| "off", basin_m3}]`, `energy_kwh`, `solar_share` (0..1), `fresh_replaced_m3`, `warnings`: `string[]` |

Conventions used in mocks (free strings, agree before adding values):
- `Batch.status` (A-03b, compliance with NT 106.03 / Decree 89-1047): `compliant`, `conditional`, `non_compliant` (a measured value above a limit), `analysis_invalid` (analysis expired or missing).
- `AllocationItem.status`: `allocated`, `conditional`, `capped`, `blocked`.
- Faecal coliforms are stored in the `physico_chemical` analysis `values` (no separate microbiology type yet).

## Endpoints

| # | Method | Path | Owner | Request | Response | Mock |
|---|---|---|---|---|---|---|
| 1 | GET | `/api/health` | `main.py` | – | `{status, datasets: {name: rows}, errors}` | `health.json` |
| 2 | GET | `/api/meta/sources` | `meta` | – | `[{id, title, file, status, source_name, source_url}]` | `meta_sources.json` |
| 3 | GET | `/api/map/layers` | `plants` | – | `{layers: [{id, label, tag, features: [{id, name, lat, lon, ...}]}]}` | `map_layers.json` |
| 4 | GET | `/api/plants` | `plants` | – | `[{id, name, governorate, serves_perimeter, treatment_level, capacity_m3_d, lat, lon, tag}]` | `plants.json` |
| 5 | GET | `/api/batches` | `batches` | – | `Batch[]` | `batches.json` |
| 6 | GET | `/api/batches/{id}` | `batches` | – | `Batch` | `batches_id.json` |
| 7 | POST | `/api/batches` | `batches` | `Batch` without `analysis_status`, `status`, `risk_colour` | `Batch` | `post_batches.json` |
| 8 | GET | `/api/batches/{id}/passport` | `passport` | – | `Passport` (see below); 404 unknown batch | `batches_id_passport.json` |
| 9 | GET | `/api/batches/{id}/risk` | **CUT FROM MVP** (QATRA Lite) · `risk` | – | `{batch_id, risk_colour, score, factors: [{param, value, limit, ok}], tag}` | `batches_id_risk.json` |
| 10 | GET | `/api/farms` | `needs` | – | `Farm[]` | `farms.json` |
| 11 | GET | `/api/farms/{id}/compatibility?batch_id=` | `rules` | query `batch_id?` (default: latest batch whose status is not `analysis_invalid`) | `{farm_id, batch_id, decision: "compatible" \| "conditional" \| "blocked", results: RuleResult[], tag}` | `farms_id_compatibility.json` |
| 12 | GET | `/api/forecast/needs` | `needs` | query `start?` (any date; default: first forecast day), `days?` (default 7, max 14), `farm_id?` | `{start, days, items: [{date, farm_id, et0_mm, kc, need_m3, etc_mm?, effective_rain_mm?, need_mm?, weather_source?}], tag}`; need = max(0, ET0 x Kc - 0.7 x rain), need_m3 = need_mm x area_ha x 10; `weather_source` is `"forecast"` (the 7 forecast days) or `"historical"` (summer 2026 file for 1 Jun-31 Aug, else the 30-year average of that day of the year); `kc`/`etc_mm`/`need_mm`/`need_m3` are `null` for a crop without a Kc; 404 for an unknown `farm_id` or a `start` that is not a date | `forecast_needs.json` |
| 13 | GET | `/api/forecast/supply` | **CUT FROM MVP** (QATRA Lite) · `supply` | query `start?`, `days?` | `{start, days, items: [{date, plant_id, volume_m3, batch_id}], tag}` | `forecast_supply.json` |
| 14 | POST | `/api/allocate` | `optimiser` | `{batch_id?, date?, scenario?: "normal" \| "outage", farm_ids?}` (all optional; default batch = latest not `analysis_invalid`, default date = first forecast day, default scenario `normal`; any other date uses historical weather and adds a warning; `outage` = no grid 13:00-17:00, the pump may still run there on the sun alone at a reduced flow) | `Allocation` (404 unknown batch, 422 bad scenario). `solar_share` = solar kWh / total kWh: within an hour the sun covers min(PV kW, pump kW) and the grid the rest | `post_allocate.json` |
| 15 | POST | `/api/soil/simulate` | `soil` | `{farm_id, batch_id, days?, years?, soil_ece?, ecw?}` | `SoilSimulation` (see below) | `post_soil_simulate.json` |
| 16 | POST | `/api/scenarios/heatwave` | `heatwave` | `{scenario_id, date?}` (`scenario_id` `"heatwave_outage"` or `"default"`; `date` one of the response `dates`, default the scenario's day) | `HeatwaveResult` (see below); 404 unknown scenario, 422 bad body or a day without outage window | `post_scenarios_heatwave.json` |
| 17 | GET | `/api/impact` | `impact` | – | `{period, tww_allocated_m3, fresh_water_saved_m3, energy_kwh, solar_share, co2_avoided_kg, farms_served, small_farms_served, batches_blocked, tag}` | `impact.json` |
| 18 | POST | `/api/explain` | **CUT FROM MVP** (QATRA Lite) · `llm` | `{kind: "allocation" \| "compatibility", payload: object, lang?}` | `{text_en, text_fr, tag}` | `post_explain.json` |
| 19 | GET | `/api/messages` | `messages` | query `farm_id?` | `[{id, farm_id, direction: "in" \| "out", channel, at, text? \| text_fr/text_ar}]` | `messages.json` |
| 20 | POST | `/api/messages/reply` | `messages` | `{farm_id, text}` | message object | `post_messages_reply.json` |
| 21 | POST | `/api/requests` | `requests` | `{farm_id, requested_m3, date}` | `{id, farm_id, requested_m3, date, status: "pending", created_at}` | `post_requests.json` |
| 22 | GET | `/api/requests` | `requests` | query `status?` | request object[] | `requests.json` |
| 23 | PATCH | `/api/requests/{id}` | `requests` | `{status: "approved" \| "rejected"}` | request object | `patch_requests_id.json` |
| 24 | GET | `/api/anomalies` | **CUT FROM MVP** (QATRA Lite) · `anomalies` | – | `[{batch_id, date, type: "stale_analysis" \| "quality", detail, severity: "warning" \| "critical", tag}]` | `anomalies.json` |
| 25 | GET | `/api/territory/layers` | `territory` | – | `{layers: [...]}` (same shape as #3) | `territory_layers.json` |
| 26 | POST | `/api/infrastructure` | `territory` | `{type, lat, lon, capacity_m3?}` | `{id, type, lat, lon, capacity_m3, status: "proposed", tag}` | `post_infrastructure.json` |
| 27 | POST | `/api/savings` | `savings` (Dev A) | `{batch_id?, date?, scenario?: "normal" \| "outage", farm_id?, overrides?: {fertiliser_price?, electricity_price?, treated_water_price?, availability_factor?, irrigation_days?, qatra_fee_pct?, seasons_per_year?}}` (A-14a; replaces the old single-farm body) | `SavingsReport` | `post_savings.json` |
| 28 | GET | `/api/business` | `business` (Dev A) | – | `BusinessView` | `business.json` |
| 29 | GET | `/api/compatibility?batch_id=` | `rules` | query `batch_id?` (same default as #11) | `{batch_id, batch_status, items: [{farm_id, batch_id, decision, results: RuleResult[], tag}] (one per farm, same order as #10), tag}` | `compatibility.json` |
| 30 | GET | `/api/rules` | `rules` | – | `[{rule_id, family, source_type, parameter, limit, limit_min, unit, batch_fields, crops, crops_to_verify, severity_if_failed, legal_ref, tag, text_en, text_fr}]` (see docs/rules.md) | `rules.json` |

**QATRA Lite scope:** endpoints marked **CUT FROM MVP** (#9, #13, #18, #24) stay documented and their router stubs stay registered, but they are not built for the demo.
Router file `savings.py` exists (A-14a); `business.py` does not exist yet (A-14c).

### Soil simulation (endpoint 15, B-03c)
Yearly steps (30 by default), ESTIMATE. `ecw` = EC of the batch (`EC_dS_m`), unless overridden. `soil_ece` overrides the farm's soil ECe.
`days` is accepted for backward compatibility and ignored. 404 unknown farm or batch; 422 bad input (`years` 1..100, `ecw` 0..20, `soil_ece` 0..30, or a batch without EC and no `ecw`).
- `naive`: no managed leaching, leaching fraction from rain only. Irrigation = the crop need.
- `qatra`: leaching fraction = max(LR, naive) capped at 0.5. `water_used_m3_season` includes the extra leaching water (rain credited).
- `first_year_over`: first year index with ECe above `threshold_ece`, `null` if never.
- `yield_loss_pct_30y` = slope x (ECe at the last year - threshold) clipped to [0, 100], using `yield_decline_pct_per_dS_m` of `crop_salt_tolerance.csv`. `null` when the slope is not published (olive, pomegranate, oat_fodder): never invented.
- `warning` lists: crop blocked for TWW, water too saline, leaching requirement above the cap, soil already above the threshold, TO_VERIFY thresholds.
- `tag.status` is `TO_VERIFY` when the crop threshold is a placeholder (olive, pomegranate, oat_fodder), else `ESTIMATE`.

### Passport (endpoint 8, B-12a)
Read from existing engines and the regulation pack; nothing is invented.
- `quality_summary` rows, in order: EC (dS/m, limit 7000 uS/cm = 7), BOD5, COD, TSS, pH (range 6.5 to 8.5), helminth eggs (limit 1 per litre), faecal coliforms. `value`/`ok` are `null` when not measured. Limits are NT 106.03 (`tag` REPORTED). **Faecal coliforms: NT 106.03 sets no limit.** The 1,000 CFU/100 mL limit is a WHO-derived fallback, `tag.status = TO_VERIFY`, not Tunisian law, and it does **not** drive `risk_colour`.
- `checks`: validity per analysis type from Decree 89-1047 Art.3 (physico-chemical 30 days, parasite eggs 15 days, metals 182 days). Metals are not required per batch: when absent, `required` is false and `is_valid` is `null`. A missing required analysis has `is_valid = false`.
- `risk_colour` follows the legal compliance of the batch (`compliant` green, `conditional` amber, `non_compliant` and `analysis_invalid` red) until the risk model (A-08) gives its own score.
- `allowed_crops`: the 21 June 1994 order (fruit trees only "no sprinkler"; olive and alfalfa flagged "(to verify)"). Empty when the batch is not usable (red). `blocked_crops`: crops eaten raw (Decree 89-1047 Art.5) and direct grazing (Art.6).
- `destinations`: from the allocation (A-05). Until it exists the real endpoint returns `[]` (the mock keeps an illustrative list). The "delivered" timeline event is only added when there are destinations.
- `timeline` dates: sampling = analysis date; checked = batch date; issued = `issued_at` (`{batch date}T07:00:00`, simulated convention). `qr_payload` = `qatra:passport:{id}`.

### Heatwave scenario (endpoint 16, B-05b, day picker B-06b)
The QATRA plan against the naive one, hour by hour (`engine/heatwave.py`). Extension of the original shape by agreement: `naive` and `qatra` (the hourly series the UI draws, with `hours_without_water`) and `caveat`; `allocation`, `baseline` and `tag` are unchanged.
- **Day picker (B-06b)**: the optional `date` moves the scenario to another day of `sim_outage_windows.csv` (12 days, listed in `dates`): that day's weather, outage window and batch (`SSUD-yyyymmdd`) are used; the PV array, the basin starting level (600 m3) and the pump stay. A date outside `dates` is a 422. `allocated_m3` is what Dev A's plan allocated that day. **On 3 days (12, 18 and 19 July) the batch cannot be used** (analysis expired or a limit exceeded): the plan allocates nothing, `allocated_m3` is 0, both policies have 0 hours without water, and `allocation.warnings` says why. The UI must not present that as a QATRA win.
- `naive`: irrigates from the grid on demand, no basin, no solar. During the outage nothing is delivered, so `hours_without_water` is the outage hours where water was demanded (4 on 2026-08-26). `basin_m3` is `null`.
- `qatra`: rule-based plan. Outside the outage: solar first, then the basin by gravity (keeping the reserve the outage needs), then the grid as backup. During the outage: the basin by gravity, **no grid**. Solar surplus fills the basin (never above its 3,000 m3). `hours_without_water` is 0 on 2026-08-26.
- `allocation.schedule`: 24 slots. `pump_kw` is the electric power the pump draws (solar plus grid). `source`: `grid` if the grid runs, else `basin` if the farms are irrigated from the basin by gravity (the pump may still be filling it with solar), else `solar`, else `off`. `basin_m3` is the level at the end of the hour.
- `baseline`: the naive run (`energy_kwh` = its grid energy, `solar_share` = 0). `allocation.energy_kwh` and `solar_share` are the QATRA plan.
- **`allocation.items` come from Dev A's plan (A-05a)**: legal block (lettuce 0), soil cap for conditional farms (alfalfa), anti-rebound (never more than the farm already takes from its own well that day, season volume / 180), sharing. The forecast file does not cover this summer day, so `plan.allocate` receives a `need_fn` (an optional parameter added to `engine/plan.py`, default unchanged) that gives the need of the heatwave day with Dev A's own formula (`needs.water_need`) on the summer weather. Only the farms growing that month are planned, plus the blocked ones; the others are named in `warnings`. On 2026-08-26: 410.8 m3 allocated (the farms' full need is ~874 m3).
- Both `naive` and `qatra` irrigate that allocated volume, spread evenly over 06:00-20:00 (ESTIMATE), so the allocation and the two hourly series always agree.
- **`allocation.schedule`, `energy_kwh`, `solar_share` are the heatwave model's**, not the A-05 pump schedule: that one calls solar only when the PV output reaches the full pump power (44.6 kW) and the array peaks at 44.3 kW on 2026-08-26 (7 % solar there), and it does not model farm draws. `warnings` says so. `energy_kwh` counts the solar surplus pumped into the basin for the next days (also in `warnings`).
- Basin evaporation is not applied (basin area not in the data). `caveat` = "NASA POWER ~0.5 deg grid: coastal extremes smoothed".

## Examples

`GET /api/batches/SSUD-20260708` → `Batch`
```json
{
  "id": "SSUD-20260708",
  "plant_id": "w27944541",
  "date": "2026-07-08",
  "volume_m3": 1200.0,
  "treatment_level": "secondary (assumed; Sousse Sud level TO_VERIFY)",
  "analyses": [
    {"type": "physico_chemical", "date": "2026-07-04", "valid_until": "2026-08-03", "is_valid": true,
     "values": {"EC_dS_m": 3.66, "BOD5_mg_L": 23.5, "COD_mg_L": 68.8, "TSS_mg_L": 19.3, "pH": 7.34}},
    {"type": "parasite_eggs", "date": "2026-07-04", "valid_until": "2026-07-19", "is_valid": true,
     "values": {"helminth_eggs_per_L": 0.76}}
  ],
  "analysis_status": "valid",
  "status": "received",
  "risk_colour": "green",
  "tag": {"status": "SIMULATED", "source": "data/simulated/sim_batches.csv"}
}
```

`GET /api/farms/C/compatibility?batch_id=SSUD-20260708` → blocked (excerpt: 2 of 13 results; full list in the mock)
```json
{
  "farm_id": "C", "batch_id": "SSUD-20260708", "decision": "blocked",
  "results": [
    {"rule_id": "R-CROP-ALLOWED", "passed": false, "severity": "block", "source_type": "tunisian_law",
     "reason_en": "lettuce: not on the list of crops allowed by the 1994 order.",
     "reason_fr": "lettuce : absent de la liste des cultures autorisees (arrete de 1994).",
     "legal_ref": "Arrete du Ministre de l'Agriculture du 21 juin 1994 (Decree 89-1047 Art.7)"},
    {"rule_id": "R-RAW-EATEN", "passed": false, "severity": "block", "source_type": "tunisian_law",
     "reason_en": "lettuce is a vegetable eaten raw: treated wastewater is prohibited.",
     "reason_fr": "lettuce est un legume consomme cru : les eaux usees traitees sont interdites.",
     "legal_ref": "Decree 89-1047 Art.5"}
  ],
  "tag": {"status": "ESTIMATE", "source": "rules_config: NT 106.03, Decree 89-1047, 1994 order, FAO-29"}
}
```
Decision: any failed `block` → `blocked`; else any failed `condition` → `conditional`; else `compatible`. `info` results always pass. Rule list: `GET /api/rules`, `docs/rules.md`.

`POST /api/allocate` with `{"batch_id": "SSUD-20260708"}` → `Allocation` (real output, abbreviated: 3 of the 10 farms, only the pumping hours)
(the batch is dated July, the weather forecast starts on 21 Nov: the date defaults to the first forecast day and does not have to match the batch;
farm A is limited by soil salinity, farm C (lettuce) is blocked, 800 of the 1,200 m³ are allocated and the rest stays in the basin;
the sun covers part of the pumping at midday, hence a solar share above 0)
```json
{
  "batch_id": "SSUD-20260708",
  "items": [
    {
      "farm_id": "A",
      "status": "conditional",
      "m3": 35.7,
      "cap_reason": "soil salinity: limited volume (alfalfa tolerates ECe 2 dS/m: only 49% of the water can be TWW (blend 2.31 dS/m, leaching fraction 0.30))"
    },
    {
      "farm_id": "B",
      "status": "allocated",
      "m3": 75.0,
      "cap_reason": null
    },
    {
      "farm_id": "C",
      "status": "blocked",
      "m3": 0.0,
      "cap_reason": "Lettuce is eaten raw: forbidden (Decree 89-1047 Art. 5)"
    },
    "..."
  ],
  "schedule": [
    {
      "hour": 6,
      "pump_kw": 44.6,
      "source": "grid",
      "basin_m3": 1350.0
    },
    {
      "hour": 11,
      "pump_kw": 44.6,
      "source": "solar",
      "basin_m3": 1500.0
    },
    {
      "hour": 12,
      "pump_kw": 44.6,
      "source": "solar",
      "basin_m3": 1650.0
    },
    {
      "hour": 13,
      "pump_kw": 44.6,
      "source": "solar",
      "basin_m3": 1800.0
    },
    {
      "hour": 14,
      "pump_kw": 44.6,
      "source": "solar",
      "basin_m3": 1950.0
    },
    {
      "hour": 18,
      "pump_kw": 14.9,
      "source": "grid",
      "basin_m3": 2000.0
    },
    "... 24 slots in all (hour 0..23); hours without pumping have source \"off\""
  ],
  "energy_kwh": 238.0,
  "solar_share": 0.41,
  "fresh_replaced_m3": 800.0,
  "warnings": [
    "400 m3 not allocated: kept in the basin."
  ]
}
```

Errors: FastAPI default `{"detail": "..."}` with 404 (unknown id) or 422 (bad input).
