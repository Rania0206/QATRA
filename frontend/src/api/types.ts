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

export interface Health {
  status: string;
  datasets: Record<string, number>;
  errors?: Record<string, string>;
}
