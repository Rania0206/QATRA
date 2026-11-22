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
| `BusinessReport` | A-14c, response of `GET /api/business`: all `BusinessView` fields (for the Zaouiet-Sousse perimeter, 257 ha) plus `date?`, `adoption_rate` (0..1), `pilot`: `{date?, farms_total, farms_receiving, total_area_ha, pilot_ha, irrigation_days, seasons_per_year, farmers_net_tnd_per_ha_season, qatra_fee_tnd_per_ha_season, well_water_replaced_m3_per_ha_season, electricity_saved_kwh_per_ha_season, nitrogen_kg_per_ha_season, tag}`, `territory`: `[{id, key: "equipped_ha" \| "irrigated_ha" \| "perimeter_ha" \| "perimeters", label, value, unit, period, source, source_url, note?, tag}]` (REPORTED), `scenarios`: `[{id, label, kind: "pilot" \| "preset" \| "perimeter" \| "territory" \| "custom", ha, ha_tag, adoption_rate, farmers_saving_tnd_per_year, qatra_revenue_tnd_per_year, well_water_saved_m3_per_year, electricity_saved_kwh_per_year, nitrogen_kg_per_year, tag}]` (money, water, energy = PROJECTION: same saving per hectare as the pilot), `assumptions`: same as `SavingsReport` (TO_VERIFY ones inherited), `warnings`. Revenue only (QATRA fee), no profit |
| `SoilSimulation` | `farm_id`, `batch_id`, `crop`, `threshold_ece`, `ecw`, `years`: `[0..N]`, `naive`: `{series: number[], first_year_over: int \| null, water_used_m3_season, yield_loss_pct_30y: number \| null}`, `qatra`: same + `leaching_fraction`, legacy `series`: `[{day, ece}]` (= qatra curve, `day` = year x 365) and `leaching_fraction` (= `qatra.leaching_fraction`), `blocked_reason?` (string when the crop is forbidden for TWW, e.g. lettuce: the UI shows no simulation), `warning?`, `tag` |
| `Passport` | `batch_id`, `plant`, `date`, `volume_m3`, `analysis_status`, `risk_colour?`, `allowed_crops`, `blocked_crops`, `destinations`: `[{farm_id, m3}]`, `issued_at`, `qr_payload`, `tag` (original fields) + B-12a: `quality_summary`: `[{param, label, value?, unit, limit_min?, limit_max?, ok?, legal_ref, tag}]`, `checks`: `[{type, required, present, analysed_on?, valid_until?, validity_days, is_valid?, legal_ref}]`, `timeline`: `[{at, event}]` |
| `HeatwaveResult` | `scenario_id`, `label`, `date`, `dates`, `allocated_m3`, `allocation`: `Allocation`, `baseline`: `{energy_kwh, solar_share}`, `naive` and `qatra`: `{policy, hours_without_water, unserved_m3, delivered_m3, grid_kwh, solar_kwh, hourly: [{hour, outage, demand_m3, delivered_m3, unserved_m3, grid_kw, solar_kw, basin_m3?, source}] x24}`, `caveat`, `tag` |
| `Message` | `id`, `farm_id`, `direction`: `"in" \| "out"`, `channel` (`"sms"`), `at`, `text?` (incoming), `text_fr?`, `text_ar?`, `needs_human_review` (default false; true on every outgoing message while the Arabic is not approved), `batch_id?` and `status?` (outgoing: the batch of the allocation, whose passport is `/passport/{batch_id}`, and the plan status of the farm) |
| `Allocation` | `batch_id`, `date?` (the day the plan is for, YYYY-MM-DD), `items`: `[{farm_id, status, m3, cap_reason?}]`, `schedule`: `[{hour, pump_kw, source: "solar" \| "grid" \| "basin" \| "off", basin_m3}]`, `energy_kwh`, `solar_share` (0..1), `fresh_replaced_m3`, `warnings`: `string[]` |

Conventions used in mocks (free strings, agree before adding values):
- `Batch.status` (A-03b, compliance with NT 106.03 / Decree 89-1047): `compliant`, `conditional`, `non_compliant` (a measured value above a limit), `analysis_invalid` (analysis expired or missing).
- `AllocationItem.status`: `allocated`, `conditional`, `capped`, `blocked`.
- Faecal coliforms are stored in the `physico_chemical` analysis `values` (no separate microbiology type yet).

## Endpoints

| # | Method | Path | Owner | Request | Response | Mock |
|---|---|---|---|---|---|---|
| 1 | GET | `/api/health` | `main.py` | – | `{status, datasets: {name: rows}, errors}` | `health.json` |
| 2 | GET | `/api/meta/sources` | `meta` | – | `{sources: [{id, title, file, status, source_name, source_url, publication_date?, period_covered?, scope?, definition?}], safe_figures: [{id, label, value, unit, definition, status, source_name, source_url, as_of}]}`: `sources` = the 64 catalogue rows (status is the catalogue's own text, `source_url` null when there is none); A-17 adds the four optional fields (year, period, scope, what the dataset is) from the same catalogue row, `null` when its cell is empty; `safe_figures` = exactly the 5 figures of `data/README.md` section 4 (SF1 318 Mm³ produced, SF2 11.3 Mm³ in agriculture 2024, SF3 7,819 ha equipped, SF4 Water 2050 targets = PROJECTION, SF5 summer 2026 +2.9 °C), values read from `context_figures.csv`, each with its own definition. 22 % (all uses), 4 % (agriculture) and <10 % are not merged into them; the Court of Auditors 61 % (audit 2008-2011, published May 2014) is left out | `meta_sources.json` |
| 3 | GET | `/api/map/layers` | `plants` | – | `{layers: [{id, label, tag, features: [{id, name, lat, lon, ...}]}]}` | `map_layers.json` |
| 4 | GET | `/api/plants` | `plants` | – | `[{id, name, governorate, serves_perimeter, treatment_level, capacity_m3_d, lat, lon, tag}]` | `plants.json` |
| 5 | GET | `/api/batches` | `batches` | – | `Batch[]` | `batches.json` |
| 6 | GET | `/api/batches/{id}` | `batches` | – | `Batch` | `batches_id.json` |
| 7 | POST | `/api/batches` | `batches` | `Batch` without `analysis_status`, `status`, `risk_colour` | `Batch` | `post_batches.json` |
| 8 | GET | `/api/batches/{id}/passport` | `passport` | – | `Passport` (see below); 404 unknown batch | `batches_id_passport.json` |
| 9 | GET | `/api/batches/{id}/risk` | **CUT FROM MVP** (QATRA Lite) · `risk` | – | `{batch_id, risk_colour, score, factors: [{param, value, limit, ok}], tag}` | `batches_id_risk.json` |
| 10 | GET | `/api/farms` | `needs` | – | `Farm[]` | `farms.json` |
| 11 | GET | `/api/farms/{id}/compatibility?batch_id=` | `rules` | query `batch_id?` (default: latest batch whose status is not `analysis_invalid`) | `{farm_id, batch_id, decision: "compatible" \| "conditional" \| "blocked", results: RuleResult[], tag}` | `farms_id_compatibility.json` |
| 12 | GET | `/api/forecast/needs` | `needs` | query `start?` (any date; default: first forecast day; `kc` is the Kc of the month from the crop calendar, 0 when the crop is not growing), `days?` (default 7, max 14), `farm_id?` | `{start, days, items: [{date, farm_id, et0_mm, kc, need_m3, etc_mm?, effective_rain_mm?, need_mm?, weather_source?}], tag}`; need = max(0, ET0 x Kc - 0.7 x rain), need_m3 = need_mm x area_ha x 10; `weather_source` is `"forecast"` (the 7 forecast days) or `"historical"` (summer 2026 file for 1 Jun-31 Aug, else the 30-year average of that day of the year); `kc`/`etc_mm`/`need_mm`/`need_m3` are `null` for a crop without a Kc; 404 for an unknown `farm_id` or a `start` that is not a date | `forecast_needs.json` |
| 13 | GET | `/api/forecast/supply` | **CUT FROM MVP** (QATRA Lite) · `supply` | query `start?`, `days?` | `{start, days, items: [{date, plant_id, volume_m3, batch_id}], tag}` | `forecast_supply.json` |
| 14 | POST | `/api/allocate` | `optimiser` | `{batch_id?, date?, scenario?: "normal" \| "outage", farm_ids?, soil_ece?: {farm_id: dS/m}, volume_m3?}` (all optional; `volume_m3` (> 0, at most 100000) = judge override of the batch volume, the stored batch is not changed; `soil_ece` = judge override of a farm's soil salinity, each 0 to 30, else 422: the rules, the soil cap and the plan see it, used by the "break it" panel of the Soil tab; default batch = latest not `analysis_invalid`, default date = first forecast day, default scenario `normal`; any other date uses historical weather and adds a warning; `outage` = no grid 13:00-17:00, the pump may still run there on the sun alone at a reduced flow) | `Allocation` (404 unknown batch or unknown farm in `farm_ids`, 422 bad scenario or bad date: only `YYYY-MM-DD`, a real day, year 2020-2035). `date` is the day of the plan. `solar_share` = solar kWh / total kWh: within an hour the sun covers min(PV kW, pump kW) and the grid the rest | `post_allocate.json` |
| 15 | POST | `/api/soil/simulate` | `soil` | `{farm_id, batch_id, days?, years?, soil_ece?, ecw?}` | `SoilSimulation` (see below; `soil_ece` in the response is the salinity the simulation started from, the farm's or the override) | `post_soil_simulate.json` |
| 16 | POST | `/api/scenarios/heatwave` | `heatwave` | `{scenario_id, date?}` (`scenario_id` `"heatwave_outage"` or `"default"`; `date` one of the response `dates`, default the scenario's day) | `HeatwaveResult` (see below); 404 unknown scenario, 422 bad body or a day without outage window | `post_scenarios_heatwave.json` |
| 17 | GET | `/api/impact` | `impact` | – | `{period, tww_allocated_m3, fresh_water_saved_m3, energy_kwh, solar_share, co2_avoided_kg, farms_served, small_farms_served, batches_blocked, tag}`: totals over all 60 simulated batches, each run through the live allocator and pump schedule (no farm name); `co2_avoided_kg` is **null** until the grid emission factor is sourced (`energy_params.json`, TO_VERIFY); `batches_blocked` = batches that could not send any water; ESTIMATE | `impact.json` |
| 18 | POST | `/api/explain` | **CUT FROM MVP** (QATRA Lite) · `llm` | `{kind: "allocation" \| "compatibility", payload: object, lang?}` | `{text_en, text_fr, tag}` | `post_explain.json` |
| 19 | GET | `/api/messages` | `messages` | query `farm_id?` | `Message[]` (see below): one outgoing message per farm for the latest allocation, then the replies; 404 unknown farm | `messages.json` |
| 20 | POST | `/api/messages/reply` | `messages` | `{farm_id, text}` (text 1 to 500 characters): `1` accept, `2` refuse, `3` postpone, `4` call me (Arabic-Indic digits too); anything else gets a help reply | `Message`: **the reply of the service** (outgoing, 201); the farmer's own message is stored too and listed by `GET /api/messages`. 404 unknown farm, 422 empty text | `post_messages_reply.json` |
| 21 | POST | `/api/requests` | `requests` | `{farm_id, requested_m3, date}` (`requested_m3` > 0, `date` ISO): 404 unknown farm, 422 otherwise. **Formal request (A-18, optional, all together):** `applicant_name`, `applicant_capacity` (`owner` \| `tenant` \| `gda_representative`), `applicant_phone?`, `irrigation_method` (`drip` \| `surface` \| `sprinkler`), `date_end?` (not before `date`), `declarations` (**all five**: `not_eaten_raw`, `no_grazing`, `crop_on_list`, `water_limits`, `accuracy`), `signed_name`: a half-filled formal request is 422 | `{id, farm_id, requested_m3, date, status: "pending", created_at}` (201, id `REQ-001`, `REQ-002`, ...) plus, for a formal request, the fields above and `crop`, `area_ha` (the farm when the request was made); fields that were not given are absent from the answer | `post_requests.json` |
| 22 | GET | `/api/requests` | `requests` | query `status?` (`pending`, `approved` or `rejected`, 422 otherwise) | request object[], oldest first; kept in memory (lost at restart) | `requests.json` |
| 23 | PATCH | `/api/requests/{id}` | `requests` | `{status: "approved" \| "rejected"}` (422 for any other value) | request object; 404 unknown id, **409 if the request was already decided** (a decision is final) | `patch_requests_id.json` |
| 24 | GET | `/api/anomalies` | **CUT FROM MVP** (QATRA Lite) · `anomalies` | – | `[{batch_id, date, type: "stale_analysis" \| "quality", detail, severity: "warning" \| "critical", tag}]` | `anomalies.json` |
| 25 | GET | `/api/territory/layers` | `territory` | – | `{layers: [...]}` (same shape as #3) | `territory_layers.json` |
| 26 | POST | `/api/infrastructure` | `territory` | `{type, lat, lon, capacity_m3?}` | `{id, type, lat, lon, capacity_m3, status: "proposed", tag}` | `post_infrastructure.json` |
| 27 | POST | `/api/savings` | `savings` (Dev A) | `{batch_id?, date?, scenario?: "normal" \| "outage", farm_id?, overrides?: {fertiliser_price?, electricity_price?, treated_water_price?, availability_factor?, irrigation_days?, qatra_fee_pct?, seasons_per_year?}}` (A-14a; replaces the old single-farm body) | `SavingsReport` | `post_savings.json` |
| 28 | GET | `/api/business` | `business` (Dev A) | query `hectares?` (>= 0, one extra scenario), `adoption_rate?` (0..1, default 1) | `BusinessReport` (= `BusinessView` + pilot, territory, scenarios, assumptions, warnings; additive) | `business.json` |
| 29 | GET | `/api/compatibility?batch_id=` | `rules` | query `batch_id?` (same default as #11) | `{batch_id, batch_status, items: [{farm_id, batch_id, decision, results: RuleResult[], tag}] (one per farm, same order as #10), tag}` | `compatibility.json` |
| 30 | GET | `/api/rules` | `rules` | – | `[{rule_id, family, source_type, parameter, limit, limit_min, unit, batch_fields, crops, crops_to_verify, severity_if_failed, legal_ref, tag, text_en, text_fr}]` (see docs/rules.md) | `rules.json` |
| 31 | GET | `/api/allocation/current` | `messages` | – | `Allocation`: the plan as it stands after the farmers' answers (the first plan until a farm refuses, then the re-plan); 404 if there is no batch | `allocation_current.json` |

**QATRA Lite scope:** endpoints marked **CUT FROM MVP** (#9, #13, #18, #24) stay documented and their router stubs stay registered, but they are not built for the demo.
Router files `savings.py` (A-14a) and `business.py` (A-14c) exist.

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
- **`allocation.items` come from Dev A's plan (A-05a)**: legal block (lettuce 0), soil cap for every farm the soil model limits (alfalfa), anti-rebound (never more than the farm already takes from its own well that day, season volume / 180), sharing. The forecast file does not cover this summer day, so `plan.allocate` receives a `need_fn` (an optional parameter added to `engine/plan.py`, default unchanged) that gives the need of the heatwave day with Dev A's own formula (`needs.water_need`) on the summer weather. Only the farms growing that month are planned, plus the blocked ones; the others are named in `warnings`. "Growing" is `needs.is_growing(crop, day)` (the crop calendar `needs.CROP_CALENDAR`), the same rule `POST /api/allocate` uses, so the two screens plan the same farms and volumes for the same day and batch (410.8 m3 on 2026-08-26). On 2026-08-26: 410.8 m3 allocated (the farms' full need is ~874 m3).
- Both `naive` and `qatra` irrigate that allocated volume, spread evenly over 06:00-20:00 (ESTIMATE), so the allocation and the two hourly series always agree.
- **`allocation.schedule`, `energy_kwh`, `solar_share` are the heatwave model's**, not the A-05 pump schedule: that one fills the sunniest hours first, the grid tops up the rest of an hour, and it does not model farm draws (for the same 410.8 m3 on 2026-08-26 it gives a solar share of 0.97). `warnings` says so. `energy_kwh` counts the solar surplus pumped into the basin for the next days (also in `warnings`).
- Basin evaporation is not applied (basin area not in the data). `caveat` = "NASA POWER ~0.5 deg grid: coastal extremes smoothed".

### Messages to the farmers (endpoints 19 and 20, B-08a)
`engine/messages.py`. One outgoing message per farm for the latest allocation (`engine/plan.plan()`: default batch and day), from templates by status.
- **Languages**: `sim_farms` has no language column, so every outgoing message has `text_fr` and `text_ar` (French and Tunisian Arabic, Darija). **Every Arabic template is `needs_human_review: true`** until a Tunisian speaker approves it; the review sheet is `docs/messages-templates.md` (`cd backend && python -m app.engine.messages`).
- **Values**: only the Allocation's. `{m3}` is the farm's `m3` as returned. The delivery hours are the longest block of consecutive pump hours of the allocation's schedule (the pump may also run at other hours, which are not announced); if the pump never runs, no hour is given. The message is dated the evening before the plan's day ("demain" / "غدوة").
- **allocated**: volume, delivery window, "reply 1 to accept, 2 to refuse". **conditional**: the condition (wash the salt out of the soil, watch the soil salinity). **capped**: why the volume is limited (replaces the farm's own water, batch shared, soil salt), read from `cap_reason`. **blocked**: why in simple words (crop eaten raw, crop not on the allowed list, lab analysis, quality limit, direct grazing), safety first, never a fault of the farmer, **no number and no money**.
- **Saving line** ("About X TND saved this season (estimate)"): added only when Dev A's savings engine returns a value for the farm: `savings(plan, farm_id).season.farmer_net_tnd` (what the farmer keeps after the QATRA fee; `SAVING_FIELD` in the engine), printed exactly as returned, never computed in the messages. Left out when the value is missing, 0 or negative, or the farm is blocked. The season figure is a PROJECTION, hence "estimate".
- **Replies (B-08c)**: `1` accept (marks the offer confirmed), `2` refuse, `3` postpone, `4` call me. Digits are read after trimming (a final `.` or `!` is fine) and Arabic-Indic digits (٠-٩) count; `12`, `0`, `5` or any word is not an answer and gets a help reply that asks for 1 to 4, with no re-plan.
  - **Refusal**: the allocator (`engine/plan.plan`, the live function, no HTTP round trip) runs again for the same batch with `farm_ids` = the farms that were eligible (not blocked, not already refused) minus the refusing farm. The new plan is stored (`GET /api/allocation/current`): the refusing farm is `capped` with 0 m3 and `cap_reason` "refused by the farmer", blocked farms are unchanged and never receive the freed volume. Every farm that gets more water receives a new message ("+X m3 added, Y m3 in total, before: Z m3", `OUT-{batch}-{farm}-U{n}`). The difference is the new volume minus the old one, both from the Allocation.
  - **What a refusal changes depends on the batch**: Dev A's allocator never gives a farm more than its own need or anti-rebound cap. When the batch is larger than the total of those caps (the default batch, 1,500 m3 for about 390 m3 of needs on 21 Nov, and every real batch, 700 m3 at the least) nobody else can take more: the plan shows the volume as "not sent today: stays at the plant" and no farm gets a message. When the batch is the limit (a batch below the total need of the day, for example a 250 m3 operator batch on 21 Nov) the freed volume is shared between the others.
  - **Idempotent**: a second `2` from the same farm gets "already recorded" and does not re-plan or write to the other farms. `1` after a refusal is answered "you refused". A blocked farm, or a farm with no water, has nothing to accept or refuse (no re-plan). `3` and `4` are logged and kept (`log`), nothing is re-planned.
  - Replies, the new plan and the messages are kept in memory only (lost at restart). The A-05d fallback (a proportional redistribution inside `cap_volume`) was not needed: Dev A's plan is merged.
  - The Allocation screen (Dev A) still calls the stateless `POST /api/allocate`; it can read `GET /api/allocation/current` to show the plan after the answers.

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
(the batch is dated July, the weather forecast starts on 21 Nov: the date defaults to the first forecast day, returned in `date`, and does not have to match the batch;
farm A is limited by soil salinity, farm C (lettuce) is blocked, the cereals have just been sown so their need is small, 394 of the 1,200 m³ are allocated and the rest stays at the plant;
the sun covers most of the pumping at midday, hence a solar share above 0)
```json
{
  "batch_id": "SSUD-20260708",
  "date": "2026-11-21",
  "items": [
    {
      "farm_id": "A",
      "status": "conditional",
      "m3": 25.4,
      "cap_reason": "soil salinity: limited volume (alfalfa tolerates ECe 2 dS/m: only 49% of the water can be TWW (blend 2.31 dS/m, leaching fraction 0.30))"
    },
    {
      "farm_id": "B",
      "status": "allocated",
      "m3": 72.4,
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
      "hour": 12,
      "pump_kw": 44.6,
      "source": "solar",
      "basin_m3": 1350.0
    },
    {
      "hour": 13,
      "pump_kw": 44.6,
      "source": "solar",
      "basin_m3": 1500.0
    },
    {
      "hour": 14,
      "pump_kw": 27.9,
      "source": "solar",
      "basin_m3": 1593.7
    },
    "... 24 slots in all (hour 0..23); hours without pumping have source \"off\""
  ],
  "energy_kwh": 117.1,
  "solar_share": 0.64,
  "fresh_replaced_m3": 393.7,
  "warnings": [
    "806.3 m3 not sent today: stays at the plant."
  ]
}
```

Errors: FastAPI default `{"detail": "..."}` with 404 (unknown id) or 422 (bad input).
