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
| `Farm` | `id`, `name`, `crop`, `area_ha`, `lat`, `lon`, `soil_texture`, `soil_ece`, `head_m` (null if no own pump), `distance_km`, `fresh_source`, `fresh_m3_season`, `is_small_farm`, `tag` |
| `RuleResult` | `rule_id`, `passed`, `severity`: `"block" \| "condition" \| "info"`, `reason_en`, `reason_fr`, `legal_ref` |
| `Allocation` | `batch_id`, `items`: `[{farm_id, status, m3, cap_reason?}]`, `schedule`: `[{hour, pump_kw, source: "solar" \| "grid" \| "basin" \| "off", basin_m3}]`, `energy_kwh`, `solar_share` (0..1), `fresh_replaced_m3`, `warnings`: `string[]` |

Conventions used in mocks (free strings, agree before adding values):
- `Batch.status`: `received`, `on_hold` (analysis expired), `blocked` (quality fails), `allocated`.
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
| 8 | GET | `/api/batches/{id}/passport` | `passport` | – | `{batch_id, plant, date, volume_m3, analysis_status, risk_colour, allowed_crops, blocked_crops, destinations, issued_at, qr_payload, tag}` | `batches_id_passport.json` |
| 9 | GET | `/api/batches/{id}/risk` | `risk` | – | `{batch_id, risk_colour, score, factors: [{param, value, limit, ok}], tag}` | `batches_id_risk.json` |
| 10 | GET | `/api/farms` | `needs` | – | `Farm[]` | `farms.json` |
| 11 | GET | `/api/farms/{id}/compatibility?batch_id=` | `rules` | query `batch_id` | `{farm_id, batch_id, decision: "compatible" \| "conditional" \| "blocked", results: RuleResult[], tag}` | `farms_id_compatibility.json` |
| 12 | GET | `/api/forecast/needs` | `needs` | query `start?`, `days?` (default 7) | `{start, days, items: [{date, farm_id, et0_mm, kc, need_m3}], tag}` | `forecast_needs.json` |
| 13 | GET | `/api/forecast/supply` | `supply` | query `start?`, `days?` | `{start, days, items: [{date, plant_id, volume_m3, batch_id}], tag}` | `forecast_supply.json` |
| 14 | POST | `/api/allocate` | `optimiser` | `{batch_id, date?, farm_ids?}` | `Allocation` | `post_allocate.json` |
| 15 | POST | `/api/soil/simulate` | `soil` | `{farm_id, batch_id, days}` | `{farm_id, series: [{day, ece}], leaching_fraction, warning?, tag}` | `post_soil_simulate.json` |
| 16 | POST | `/api/scenarios/heatwave` | `heatwave` | `{scenario_id: "heatwave_outage"}` | `{scenario_id, label, date, allocation: Allocation, baseline: {energy_kwh, solar_share}, tag}` | `post_scenarios_heatwave.json` |
| 17 | GET | `/api/impact` | `impact` | – | `{period, tww_allocated_m3, fresh_water_saved_m3, energy_kwh, solar_share, co2_avoided_kg, farms_served, small_farms_served, batches_blocked, tag}` | `impact.json` |
| 18 | POST | `/api/explain` | `llm` | `{kind: "allocation" \| "compatibility", payload: object, lang?}` | `{text_en, text_fr, tag}` | `post_explain.json` |
| 19 | GET | `/api/messages` | `messages` | query `farm_id?` | `[{id, farm_id, direction: "in" \| "out", channel, at, text? \| text_fr/text_ar}]` | `messages.json` |
| 20 | POST | `/api/messages/reply` | `messages` | `{farm_id, text}` | message object | `post_messages_reply.json` |
| 21 | POST | `/api/requests` | `requests` | `{farm_id, requested_m3, date}` | `{id, farm_id, requested_m3, date, status: "pending", created_at}` | `post_requests.json` |
| 22 | GET | `/api/requests` | `requests` | query `status?` | request object[] | `requests.json` |
| 23 | PATCH | `/api/requests/{id}` | `requests` | `{status: "approved" \| "rejected"}` | request object | `patch_requests_id.json` |
| 24 | GET | `/api/anomalies` | `anomalies` | – | `[{batch_id, date, type: "stale_analysis" \| "quality", detail, severity: "warning" \| "critical", tag}]` | `anomalies.json` |
| 25 | GET | `/api/territory/layers` | `territory` | – | `{layers: [...]}` (same shape as #3) | `territory_layers.json` |
| 26 | POST | `/api/infrastructure` | `territory` | `{type, lat, lon, capacity_m3?}` | `{id, type, lat, lon, capacity_m3, status: "proposed", tag}` | `post_infrastructure.json` |

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

`GET /api/farms/C/compatibility?batch_id=SSUD-20260708` → one blocking `RuleResult`
```json
{
  "farm_id": "C", "batch_id": "SSUD-20260708", "decision": "blocked",
  "results": [
    {"rule_id": "R04_crop_allowed", "passed": false, "severity": "block",
     "reason_en": "Lettuce is a vegetable eaten raw: irrigation with treated wastewater is prohibited.",
     "reason_fr": "La laitue est un legume consomme cru : l'irrigation par EUT est interdite.",
     "legal_ref": "Decret 89-1047 Art.5; Arrete MA 21/06/1994"}
  ],
  "tag": {"status": "ESTIMATE"}
}
```

`POST /api/allocate` with `{"batch_id": "SSUD-20260708"}` → `Allocation`
(the default scenario in `sim_scenarios.json` allocates 1,000 m³ of this 1,200 m³ batch)
```json
{
  "batch_id": "SSUD-20260708",
  "items": [
    {"farm_id": "B", "status": "allocated", "m3": 320.0},
    {"farm_id": "J", "status": "capped", "m3": 100.0, "cap_reason": "Soil ECe 4.5 dS/m: leaching fraction limits volume"},
    {"farm_id": "C", "status": "blocked", "m3": 0.0, "cap_reason": "Lettuce eaten raw: prohibited (Decret 89-1047)"}
  ],
  "schedule": [{"hour": 10, "pump_kw": 44.6, "source": "solar", "basin_m3": 1650}],
  "energy_kwh": 312.2,
  "solar_share": 1.0,
  "fresh_replaced_m3": 1000.0,
  "warnings": ["Farm C blocked: crop not allowed with treated wastewater."]
}
```

Errors: FastAPI default `{"detail": "..."}` with 404 (unknown id) or 422 (bad input).
