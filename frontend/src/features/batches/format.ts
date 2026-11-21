import type { AnalysisStatus, AnalysisType } from "../../api/types";

export const ANALYSIS_LABEL: Record<AnalysisType, string> = {
  physico_chemical: "Physico-chemical",
  parasite_eggs: "Parasite eggs",
  metals: "Metals",
};

export const REQUIRED_TYPES: AnalysisType[] = ["physico_chemical", "parasite_eggs"];

/** Parameter column name -> label and unit. Unknown names fall back to the raw name. */
const PARAMS: Record<string, [string, string]> = {
  EC_dS_m: ["Electrical conductivity (EC)", "dS/m"],
  SAR: ["Sodium adsorption ratio (SAR)", "–"],
  BOD5_mg_L: ["BOD5", "mg/L"],
  COD_mg_L: ["COD", "mg/L"],
  TSS_mg_L: ["Suspended solids (TSS)", "mg/L"],
  total_N_mg_L: ["Total nitrogen", "mg/L"],
  Cl_mg_L: ["Chloride", "mg/L"],
  pH: ["pH", "–"],
  faecal_coliforms_cfu_100mL: ["Faecal coliforms", "CFU/100 mL"],
  helminth_eggs_per_L: ["Helminth eggs", "eggs/L"],
  nematode_eggs_per_L: ["Nematode eggs", "eggs/L"],
};

export function paramInfo(name: string): { label: string; unit: string } {
  const known = PARAMS[name];
  if (known) return { label: known[0], unit: known[1] };
  const m = name.match(/^(.*)_(mg_L|ug_L)$/);
  return m ? { label: m[1], unit: m[2].replace("_", "/") } : { label: name, unit: "" };
}

export function fmtNumber(v: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString("en-US");
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtDate(iso: string): string {
  if (!iso) return "–";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export type Tone = "ok" | "warn" | "bad" | "ink";

export const STATUS_BADGE: Record<AnalysisStatus, { label: string; icon: string; tone: Tone }> = {
  valid: { label: "Valid", icon: "✓", tone: "ok" },
  expired: { label: "Expired", icon: "⏳", tone: "warn" },
  missing: { label: "Missing", icon: "✕", tone: "bad" },
};

/** Batch.status (A-03b). Unknown values (older backends) render as a dash. */
export const COMPLIANCE_BADGE: Record<string, { label: string; icon: string; tone: Tone; title: string }> = {
  compliant: { label: "Compliant", icon: "✓", tone: "ok", title: "All measured values within NT 106.03" },
  conditional: { label: "Conditional", icon: "⚠", tone: "warn", title: "Usable with conditions" },
  non_compliant: { label: "Non-compliant", icon: "⛔", tone: "bad", title: "A measured value is above an NT 106.03 limit" },
  analysis_invalid: { label: "Analysis invalid", icon: "⏳", tone: "ink", title: "Analysis expired or missing (Decree 89-1047 Art. 3)" },
};

/**
 * Perimeter figures for the stat strip. Values from data/clean/tww_irrigated_areas.csv
 * (Zaouiet Sousse row, 2023/24). No endpoint serves them yet (no new endpoints in A-15),
 * so they are constants here, with their source tag.
 */
export const PERIMETER = {
  name: "Zaouiet-Sousse",
  equipped_ha: 257,
  delivered_m3: 523280,
  season: "2023/24",
  tag: {
    status: "REPORTED" as const,
    source: "Agridata / data.gov.tn, TWW irrigated perimeters 2023/24",
  },
};

const DAY = 86_400_000;
export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / DAY);
