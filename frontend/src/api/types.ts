// Shared API objects. Mirror of backend/app/schemas.py. Change only by agreement.

export type TagStatus = "REPORTED" | "ESTIMATE" | "PROJECTION" | "SIMULATED" | "TO_VERIFY";

export interface Tag {
  status: TagStatus;
  source?: string;
}

export type AnalysisType = "physico_chemical" | "parasite_eggs" | "metals";

export interface Analysis {
  type: AnalysisType;
  date: string; // ISO date
  valid_until: string; // ISO date
  is_valid: boolean;
  values: Record<string, number>;
}

export type AnalysisStatus = "valid" | "expired" | "missing";
export type RiskColour = "green" | "amber" | "red";

export interface Batch {
  id: string;
  plant_id: string;
  date: string;
  volume_m3: number;
  treatment_level: string;
  analyses: Analysis[];
  analysis_status: AnalysisStatus;
  status: string;
  risk_colour?: RiskColour;
  warnings?: string[]; // non-blocking notes, e.g. no metals analysis this semester
  tag: Tag;
}

export interface Farm {
  id: string;
  name: string;
  crop: string;
  area_ha: number;
  lat: number;
  lon: number;
  soil_texture: string;
  soil_ece: number;
  head_m: number | null;
  distance_km: number;
  fresh_source: string;
  fresh_m3_season: number;
  is_small_farm: boolean;
  well_depth_m?: number | null; // default null
  pump_efficiency?: number | null; // 0..1, default null
  tag: Tag;
}

export type Severity = "block" | "condition" | "info";
export type SourceType = "tunisian_law" | "agronomic_advice";

export interface RuleResult {
  rule_id: string;
  passed: boolean;
  severity: Severity;
  source_type?: SourceType; // UI groups results: "Tunisian law" / "Agronomic advice (FAO)"
  reason_en: string;
  reason_fr: string;
  legal_ref: string;
}

export type Decision = "compatible" | "conditional" | "blocked";

/** GET /api/farms/{id}/compatibility (and one item of GET /api/compatibility). */
export interface FarmCompatibility {
  farm_id: string;
  batch_id: string;
  decision: Decision;
  results: RuleResult[];
  tag: Tag;
}

/** GET /api/compatibility?batch_id= : every farm against one batch. */
export interface AllFarmsCompatibility {
  batch_id: string;
  batch_status: string; // Batch.status: compliant | conditional | non_compliant | analysis_invalid
  items: FarmCompatibility[]; // same order as GET /api/farms
  tag: Tag;
}

export interface AllocationItem {
  farm_id: string;
  status: string;
  m3: number;
  cap_reason?: string;
}

export type EnergySource = "solar" | "grid" | "basin" | "off";

export interface ScheduleSlot {
  hour: number;
  pump_kw: number;
  source: EnergySource;
  basin_m3: number;
}

export interface Allocation {
  batch_id: string;
  items: AllocationItem[];
  schedule: ScheduleSlot[];
  energy_kwh: number;
  solar_share: number; // 0..1
  fresh_replaced_m3: number;
  warnings: string[];
}

export interface SavingsLine {
  label: string;
  value: number;
  unit: string;
  tag: Tag;
}

export interface SavingsResult {
  water_need_m3: number;
  well_kwh_avoided: number;
  well_cost_avoided_tnd: number;
  treated_water_cost_tnd: number;
  nitrogen_kg: number;
  fertiliser_kg_ammonium_nitrate: number;
  fertiliser_saved_tnd: number;
  net_saving_tnd: number;
  kwh_off_grid: number;
  well_water_kept_m3: number;
  compatibility_status: string; // "compatible" | "conditional" | "blocked"
  breakdown: SavingsLine[];
}

export interface BusinessView {
  area_name: string;
  area_ha: number;
  farms: number;
  total_saving_tnd: number;
  qatra_share_pct: number;
  qatra_revenue_tnd: number;
  steg_kwh_avoided: number;
  steg_value_tnd: number;
  national_areas: number; // 36
  tag: Tag;
}

export interface Plant {
  id: string;
  name: string;
  governorate: string;
  serves_perimeter: string | null;
  treatment_level: string;
  capacity_m3_d: number | null; // TREATMENT capacity, not volume available to farmers
  lat: number | null; // null when no coordinates are known (never invented)
  lon: number | null;
  tag: Tag;
}

export interface GeoPolygon {
  type: "Polygon";
  coordinates: number[][][]; // [lon, lat] rings
}

export interface MapFeature {
  id: string;
  name: string;
  lat: number | null; // null: the data has no location (e.g. the irrigated perimeter)
  lon: number | null;
  // layer-specific extras
  crop?: string;
  capacity_m3?: number;
  area_ha?: number | null;
  wwtp?: string | null;
  campaign?: string | null;
  tww_distributed_m3_yr?: number | null;
  landuse?: string;
  geometry?: GeoPolygon; // farmland polygons
}

export interface MapLayer {
  id: string;
  label: string;
  tag: Tag;
  features: MapFeature[];
}

export interface MapLayersResponse {
  layers: MapLayer[];
}

export interface SoilPoint {
  day: number; // legacy: year * 365
  ece: number;
}

export interface SoilPolicy {
  series: number[]; // ECe (dS/m) at the start of each year, index = year (0..years)
  first_year_over: number | null; // first year ECe > threshold, null if never
  water_used_m3_season: number;
  yield_loss_pct_30y: number | null; // null when the crop has no published yield slope
}

export interface SoilQatraPolicy extends SoilPolicy {
  leaching_fraction: number;
}

export interface SoilSimulation {
  farm_id: string;
  batch_id: string;
  crop: string;
  threshold_ece: number;
  ecw: number;
  years: number[]; // [0..N]
  naive: SoilPolicy;
  qatra: SoilQatraPolicy;
  // legacy fields: `series` is the QATRA curve, `leaching_fraction` = qatra.leaching_fraction
  series: SoilPoint[];
  leaching_fraction: number;
  blocked_reason?: string | null; // set when the crop cannot receive TWW by law: show no simulation
  warning?: string | null;
  tag: Tag;
}

export interface SoilSimulateRequest {
  farm_id: string;
  batch_id: string;
  days?: number; // legacy, ignored
  years?: number; // default 30
  soil_ece?: number; // override the farm's soil ECe
  ecw?: number; // override the batch EC
}

export interface PassportQuality {
  param: string; // EC, BOD5, COD, TSS, pH, helminth_eggs, faecal_coliforms
  label: string;
  value: number | null; // null: not measured
  unit: string;
  limit_min: number | null; // only ranges (pH)
  limit_max: number | null;
  ok: boolean | null; // null: not measured
  legal_ref: string;
  tag: Tag; // faecal coliforms: TO_VERIFY (WHO-derived fallback, not Tunisian law)
}

export interface PassportCheck {
  type: AnalysisType;
  required: boolean; // metals are not required per batch
  present: boolean;
  analysed_on: string | null;
  valid_until: string | null;
  validity_days: number; // 30 / 15 / 182 (Decree 89-1047 Art.3)
  is_valid: boolean | null; // null: not applicable
  legal_ref: string;
}

export interface PassportEvent {
  at: string; // ISO date or datetime
  event: string;
}

export interface PassportDestination {
  farm_id: string;
  m3: number;
}

/** GET /api/batches/{id}/passport */
export interface Passport {
  batch_id: string;
  plant: string;
  date: string;
  volume_m3: number;
  analysis_status: AnalysisStatus;
  risk_colour: RiskColour | null;
  allowed_crops: string[]; // the 1994 order; empty when the batch is not usable
  blocked_crops: string[];
  destinations: PassportDestination[]; // from the allocation; [] until it exists
  issued_at: string;
  qr_payload: string; // "qatra:passport:{id}"
  quality_summary: PassportQuality[];
  checks: PassportCheck[];
  timeline: PassportEvent[];
  tag: Tag;
}

export interface HeatwaveHour {
  hour: number;
  outage: boolean;
  demand_m3: number;
  delivered_m3: number;
  unserved_m3: number;
  grid_kw: number;
  solar_kw: number;
  basin_m3: number | null; // null for the naive policy (no basin)
  source: EnergySource;
}

export interface HeatwaveRun {
  policy: "naive" | "qatra";
  hours_without_water: number;
  unserved_m3: number;
  delivered_m3: number;
  grid_kwh: number;
  solar_kwh: number;
  hourly: HeatwaveHour[]; // 24 rows
}

/** POST /api/scenarios/heatwave body: `date` is optional (default: the scenario's day) and must be one of `dates`. */
export interface HeatwaveRequest {
  scenario_id: string;
  date?: string;
}

/** POST /api/scenarios/heatwave */
export interface HeatwaveResult {
  scenario_id: string;
  label: string;
  date: string;
  dates: string[]; // the days that can be chosen: the days with an outage window
  allocated_m3: number; // 0 when the batch of the day cannot be used: nothing is irrigated
  allocation: Allocation;
  baseline: { energy_kwh: number; solar_share: number }; // the naive run: all grid, no solar
  naive: HeatwaveRun;
  qatra: HeatwaveRun;
  caveat: string; // "NASA POWER ~0.5 deg grid: coastal extremes smoothed"
  tag: Tag;
}

/** GET /api/messages, POST /api/messages/reply */
export interface Message {
  id: string;
  farm_id: string;
  direction: "in" | "out";
  channel: string; // "sms"
  at: string; // ISO datetime
  text?: string | null; // incoming: what the farmer wrote
  text_fr?: string | null; // outgoing: French and Tunisian Arabic
  text_ar?: string | null;
  needs_human_review?: boolean; // true while the Arabic text is not approved by a Tunisian speaker
  batch_id?: string | null; // outgoing: the batch of the allocation (link to /passport/{batch_id})
  status?: string | null; // outgoing: allocated | conditional | capped | blocked
}

export interface Health {
  status: string;
  datasets: Record<string, number>;
  errors?: Record<string, string>;
}

// A-14a: savings of one plan day (POST /api/savings). Replaces SavingsResult above as the response of the endpoint.
export interface SavingsOverrides {
  fertiliser_price?: number; // TND/kg of ammonium nitrate
  electricity_price?: number; // TND/kWh
  treated_water_price?: number; // TND/m3
  availability_factor?: number; // 0..1
  irrigation_days?: number;
  qatra_fee_pct?: number; // 0..100
  seasons_per_year?: number;
}

export interface SavingsAssumption {
  name: string;
  value: number;
  unit: string;
  source: string;
  status: TagStatus;
}

export interface SavingsItem {
  farm_id: string;
  status: string; // allocated | capped | conditional | blocked
  m3: number;
  nitrogen_kg: number;
  well_kwh_saved: number;
  electricity_saved_tnd: number;
  fertiliser_value_tnd: number;
  water_cost_tnd: number;
  net_saving_tnd: number;
  qatra_fee_tnd: number;
  farmer_net_tnd: number;
  reason?: string | null;
  tag: Tag;
}

export interface SavingsTotals {
  m3: number;
  electricity_saved_tnd: number;
  fertiliser_value_tnd: number;
  water_cost_tnd: number;
  net_saving_tnd: number;
  qatra_fee_tnd: number;
  farmer_net_tnd: number;
  tag: Tag;
}

export interface SavingsReport {
  batch_id: string;
  date?: string | null;
  scenario: "normal" | "outage";
  items: SavingsItem[];
  day: SavingsTotals; // ESTIMATE
  season: SavingsTotals; // PROJECTION: day x irrigation_days
  year: SavingsTotals; // PROJECTION: season x seasons_per_year
  assumptions: SavingsAssumption[];
  warnings: string[];
  tag: Tag;
}

/** GET /api/meta/sources */
export interface SourceRow {
  id: string;
  title: string;
  file: string;
  status: string; // the catalogue's own text, e.g. "REPORTED (incomplete)"
  source_name: string;
  source_url: string | null;
}

export interface SafeFigure {
  id: string; // SF1..SF5
  label: string;
  value: string;
  unit: string;
  definition: string;
  status: string; // REPORTED or PROJECTION
  source_name: string;
  source_url: string;
  as_of: string; // ISO date of the source
}

export interface MetaSources {
  sources: SourceRow[];
  safe_figures: SafeFigure[];
}

/** GET /api/impact */
export interface ImpactSummary {
  period: string;
  tww_allocated_m3: number;
  fresh_water_saved_m3: number;
  energy_kwh: number;
  solar_share: number; // 0..1
  co2_avoided_kg: number;
  farms_served: number;
  small_farms_served: number;
  batches_blocked: number;
  tag: Tag;
}

// A-14c: GET /api/business (?hectares=&adoption_rate=). Additive: BusinessView above is still the top of the response.
export interface TerritoryFigure {
  id: string; // id in data/clean/context_figures.csv
  key: "equipped_ha" | "irrigated_ha" | "perimeter_ha" | "perimeters";
  label: string;
  value: number;
  unit: string;
  period: string;
  source: string;
  source_url: string;
  note?: string | null;
  tag: Tag; // REPORTED
}

export interface PilotMetrics {
  date?: string | null;
  farms_total: number;
  farms_receiving: number;
  total_area_ha: number;
  pilot_ha: number;
  irrigation_days: number;
  seasons_per_year: number;
  farmers_net_tnd_per_ha_season: number;
  qatra_fee_tnd_per_ha_season: number;
  well_water_replaced_m3_per_ha_season: number;
  electricity_saved_kwh_per_ha_season: number;
  nitrogen_kg_per_ha_season: number;
  tag: Tag; // PROJECTION
}

export interface BusinessScenario {
  id: string;
  label: string;
  kind: "pilot" | "preset" | "perimeter" | "territory" | "custom";
  ha: number;
  ha_tag: Tag; // REPORTED for the territory figures
  adoption_rate: number;
  farmers_saving_tnd_per_year: number;
  qatra_revenue_tnd_per_year: number;
  well_water_saved_m3_per_year: number;
  electricity_saved_kwh_per_year: number;
  nitrogen_kg_per_year: number;
  tag: Tag; // PROJECTION
}

export interface BusinessReport extends BusinessView {
  date?: string | null;
  adoption_rate: number; // 0..1
  pilot: PilotMetrics;
  territory: TerritoryFigure[];
  scenarios: BusinessScenario[];
  assumptions: SavingsAssumption[];
  warnings: string[];
}
