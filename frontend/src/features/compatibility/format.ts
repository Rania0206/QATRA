import type { Decision, RuleResult, SourceType, Tag } from "../../api/types";
import type { Tone } from "../../components/ui";

export type Lang = "en" | "fr";

/** One entry of GET /api/rules (only the fields this screen uses). */
export interface RuleInfo {
  rule_id: string;
  source_type: SourceType;
  legal_ref: string;
  tag: Tag;
}

/** Plain verdicts: the first thing a farmer reads. */
export const DECISION: Record<Decision, { en: string; fr: string; legendEn: string; legendFr: string; tone: Tone }> = {
  compatible: { en: "Can irrigate", fr: "Peut irriguer", legendEn: "can irrigate", legendFr: "peuvent irriguer", tone: "ok" },
  conditional: { en: "Can irrigate, with care", fr: "Peut irriguer, avec précaution", legendEn: "with care", legendFr: "avec précaution", tone: "warn" },
  blocked: { en: "Cannot irrigate", fr: "Ne peut pas irriguer", legendEn: "cannot", legendFr: "ne peuvent pas", tone: "bad" },
};

export const GROUPS: { id: SourceType; en: string; fr: string }[] = [
  { id: "tunisian_law", en: "Tunisian law", fr: "Loi tunisienne" },
  { id: "agronomic_advice", en: "Agronomic advice (FAO)", fr: "Conseil agronomique (FAO)" },
];

export const T = {
  eyebrow: { en: "Water × farm", fr: "Eau × ferme" },
  title: { en: "Is this water safe for this farm?", fr: "Cette eau est-elle sûre pour cette ferme ?" },
  lead: {
    en: "Choose today's water. See at once which farms can use it, and why.",
    fr: "Choisissez l'eau du jour. Voyez tout de suite quelles fermes peuvent l'utiliser, et pourquoi.",
  },
  farms: { en: "farms", fr: "fermes" },
  batch: { en: "Water batch", fr: "Lot d'eau" },
  farmsEyebrow: { en: "Ten farms, one batch", fr: "Dix fermes, un lot" },
  farmsTitle: { en: "Who can irrigate today.", fr: "Qui peut irriguer aujourd'hui." },
  allPassed: { en: "All checks passed. Safe to irrigate.", fr: "Tous les contrôles sont bons. Irrigation possible." },
  crop: { en: "Crop", fr: "Culture" },
  area: { en: "Area", fr: "Surface" },
  soil: { en: "Soil ECe", fr: "ECe du sol" },
  who: { en: "WHO guideline — not Tunisian law", fr: "Recommandation OMS — pas la loi tunisienne" },
  noResults: { en: "No results in this group.", fr: "Aucun résultat dans ce groupe." },
  open: { en: "Why?", fr: "Pourquoi ?" },
  mockNote: {
    en: "Mock mode: the same compatibility file is shown for every batch.",
    fr: "Mode maquette : le même fichier de compatibilité est affiché pour chaque lot.",
  },
} as const;

export const reason = (r: RuleResult, lang: Lang) => (lang === "fr" ? r.reason_fr : r.reason_en);

/** WHO guidance is not Tunisian law; the rule was removed in A-03a but is labelled if it ever comes back. */
export const isWho = (r: RuleResult) => r.rule_id.includes("COLIFORM") || r.legal_ref.startsWith("WHO");

/** Results sorted for reading: failed blocks ("eaten raw" first), failed conditions, info, then passed. */
export function sortResults(results: RuleResult[]): RuleResult[] {
  const rank = (r: RuleResult) =>
    !r.passed
      ? r.severity === "block"
        ? r.rule_id === "R-RAW-EATEN"
          ? -1
          : 0
        : r.severity === "condition"
          ? 1
          : 2
      : r.severity === "info"
        ? 3
        : 4;
  return [...results].sort((a, b) => rank(a) - rank(b));
}

/** Plain-language sentence for the main problem; the legal detail stays in the panel. */
function plain(r: RuleResult, crop: string, lang: Lang): string {
  const id = r.rule_id;
  const fr = lang === "fr";
  if (id === "R-RAW-EATEN")
    return fr ? `${crop} se mange cru : la loi interdit cette eau.` : `${crop} is eaten raw: the law forbids this water.`;
  if (id === "R-CROP-ALLOWED")
    return fr ? `${crop} n'est pas sur la liste des cultures autorisées.` : `${crop} is not on the list of allowed crops.`;
  if (id === "R-ANALYSIS")
    return fr ? "Le test du laboratoire est trop ancien : attendez un nouveau test." : "The lab test is too old: wait for a new one.";
  if (id === "R-NEMATODE" || id.startsWith("R-LIMIT-"))
    return fr ? "La qualité de l'eau dépasse la limite légale." : "Water quality is above the legal limit.";
  if (id === "R-GRAZING")
    return fr ? "Pas de pâturage direct sur cette parcelle." : "No animals may graze on this plot.";
  if (id.startsWith("R-SALINITY"))
    return fr ? "Sol salé : arrosez un peu plus pour chasser le sel." : "Salty soil: water a little more to wash the salt down.";
  return reason(r, lang);
}

/** The one reason shown on a farm card, in plain words. */
export function mainReason(results: RuleResult[], lang: Lang, crop = ""): string {
  const first = sortResults(results)[0];
  return first && !first.passed ? plain(first, cropLabel(crop), lang) : T.allPassed[lang];
}

export const cropLabel = (crop: string) => crop.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
