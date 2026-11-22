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

export interface RuleResult {
  rule_id: string;
  passed: boolean;
  severity: Severity;
  reason_en: string;
  reason_fr: string;
  legal_ref: string;
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

export interface Health {
  status: string;
  datasets: Record<string, number>;
  errors?: Record<string, string>;
}
