import type { Decision, RuleResult, SourceType, Tag } from "../../api/types";
import type { Tone } from "../batches/format";

export type Lang = "en" | "fr";

/** One entry of GET /api/rules (only the fields this screen uses). */
export interface RuleInfo {
  rule_id: string;
  source_type: SourceType;
  legal_ref: string;
  tag: Tag;
}

export const DECISION: Record<Decision, { icon: string; en: string; fr: string; legendEn: string; legendFr: string; tone: Tone }> = {
  compatible: { icon: "✅", en: "Compatible", fr: "Compatible", legendEn: "Compatible", legendFr: "Compatible", tone: "ok" },
  conditional: { icon: "⚠️", en: "With conditions", fr: "Sous conditions", legendEn: "With conditions", legendFr: "Sous conditions", tone: "warn" },
  blocked: { icon: "⛔", en: "Blocked", fr: "Bloqué", legendEn: "Blocked by law", legendFr: "Bloqué par la loi", tone: "bad" },
};

const CROP_ICON: Record<string, string> = {
  alfalfa: "🌿",
  olive: "🫒",
  lettuce: "🥬",
  tomato: "🍅",
  wheat: "🌾",
  barley: "🌾",
  barley_fodder: "🌾",
  oat_fodder: "🌾",
  citrus_orange: "🍊",
  pomegranate: "🍎",
};
export const cropIcon = (crop: string) => CROP_ICON[crop] ?? "🌱";

export const GROUPS: { id: SourceType; en: string; fr: string }[] = [
  { id: "tunisian_law", en: "Tunisian law", fr: "Loi tunisienne" },
  { id: "agronomic_advice", en: "Agronomic advice (FAO)", fr: "Conseil agronomique (FAO)" },
];

export const T = {
  title: { en: "Which farms can use this batch?", fr: "Quelles fermes peuvent utiliser ce lot ?" },
  batch: { en: "Batch", fr: "Lot" },
  allPassed: { en: "All rules passed", fr: "Toutes les règles respectées" },
  rules: { en: "Rule checks", fr: "Vérifications" },
  crop: { en: "Crop", fr: "Culture" },
  area: { en: "Area", fr: "Surface" },
  soil: { en: "Soil ECe", fr: "ECe du sol" },
  who: { en: "WHO guideline — not Tunisian law", fr: "Recommandation OMS — pas la loi tunisienne" },
  noResults: { en: "No results in this group.", fr: "Aucun résultat dans ce groupe." },
  mockNote: {
    en: "Mock mode: the same compatibility file is shown for every batch.",
    fr: "Mode maquette : le même fichier de compatibilité est affiché pour chaque lot.",
  },
} as const;

export const reason = (r: RuleResult, lang: Lang) => (lang === "fr" ? r.reason_fr : r.reason_en);

/** WHO guidance is not Tunisian law; the rule was removed in A-03a but is labelled if it ever comes back. */
export const isWho = (r: RuleResult) => r.rule_id.includes("COLIFORM") || r.legal_ref.startsWith("WHO");

/** Results sorted for reading: failed blocks, failed conditions, info, then passed. */
export function sortResults(results: RuleResult[]): RuleResult[] {
  // "eaten raw" is the most specific crop ban, so it leads when several blocks fail (e.g. lettuce)
  const rank = (r: RuleResult) =>
    !r.passed
      ? r.severity === "block"
        ? r.rule_id === "R-RAW-EATEN" ? -1 : 0
        : r.severity === "condition" ? 1 : 2
      : r.severity === "info" ? 3 : 4;
  return [...results].sort((a, b) => rank(a) - rank(b));
}

/** The one reason shown on a farm card. */
export function mainReason(results: RuleResult[], lang: Lang): string {
  const first = sortResults(results)[0];
  return first && !first.passed ? reason(first, lang) : T.allPassed[lang];
}

export const cropLabel = (crop: string) => crop.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
