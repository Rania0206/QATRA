import type { Decision, RuleResult, SourceType, Tag } from "../../api/types";
import type { Tone } from "../../components/ui";

export type Lang = "en" | "fr" | "ar";

/** A text in the three languages of the screen. */
export type Tr = Record<Lang, string>;

export const isRtl = (lang: Lang) => lang === "ar";

/** One entry of GET /api/rules (only the fields this screen uses). */
export interface RuleInfo {
  rule_id: string;
  source_type: SourceType;
  parameter?: string | null; // e.g. "BOD5", used to name a failed measurement
  legal_ref: string;
  tag: Tag;
}

/** Plain verdicts: the first thing a farmer reads. `legend` is the short form used after a count. */
export const DECISION: Record<Decision, Tr & { legend: Tr; tone: Tone }> = {
  compatible: {
    en: "Can irrigate",
    fr: "Peut irriguer",
    ar: "يمكن الري",
    legend: { en: "can irrigate", fr: "peuvent irriguer", ar: "يمكنها الري" },
    tone: "ok",
  },
  conditional: {
    en: "Can irrigate, with care",
    fr: "Peut irriguer, avec précaution",
    ar: "يمكن الري بحذر",
    legend: { en: "with care", fr: "avec précaution", ar: "بحذر" },
    tone: "warn",
  },
  blocked: {
    en: "Cannot irrigate",
    fr: "Ne peut pas irriguer",
    ar: "لا يمكن الري",
    legend: { en: "cannot", fr: "ne peuvent pas", ar: "لا يمكنها" },
    tone: "bad",
  },
};

/** Batch.status in the three languages (labels match batches/format COMPLIANCE in English). */
export const BATCH_STATUS: Record<string, Tr> = {
  compliant: { en: "Meets the law", fr: "Conforme à la loi", ar: "مطابق للقانون" },
  conditional: { en: "With conditions", fr: "Sous conditions", ar: "بشروط" },
  non_compliant: { en: "Fails the law", fr: "Non conforme", ar: "غير مطابق للقانون" },
  analysis_invalid: { en: "Lab test too old", fr: "Test trop ancien", ar: "التحليل قديم" },
};

export const GROUPS: ({ id: SourceType } & Tr)[] = [
  { id: "tunisian_law", en: "Tunisian law", fr: "Loi tunisienne", ar: "القانون التونسي" },
  { id: "agronomic_advice", en: "Agronomic advice (FAO)", fr: "Conseil agronomique (FAO)", ar: "نصيحة فلاحية (الفاو)" },
];

export const T = {
  eyebrow: { en: "Water × farm", fr: "Eau × ferme", ar: "الماء × المزرعة" },
  title: {
    en: "Is this water safe for this farm?",
    fr: "Cette eau est-elle sûre pour cette ferme ?",
    ar: "هل هذا الماء آمن لهذه المزرعة؟",
  },
  lead: {
    en: "Choose today's water. See at once which farms can use it, and why.",
    fr: "Choisissez l'eau du jour. Voyez tout de suite quelles fermes peuvent l'utiliser, et pourquoi.",
    ar: "اختر ماء اليوم. اعرف فورًا أيّ المزارع يمكنها استعماله، ولماذا.",
  },
  farms: { en: "farms", fr: "fermes", ar: "مزارع" },
  batch: { en: "Water batch", fr: "Lot d'eau", ar: "دفعة الماء" },
  whichDay: { en: "Which day's water?", fr: "L'eau de quel jour ?", ar: "ماء أيّ يوم؟" },
  quality: { en: "Water quality", fr: "Qualité de l'eau", ar: "جودة الماء" },
  farmsEyebrow: { en: "Ten farms, one batch", fr: "Dix fermes, un lot", ar: "عشر مزارع، دفعة واحدة" },
  farmsTitle: { en: "Who can irrigate today.", fr: "Qui peut irriguer aujourd'hui.", ar: "من يمكنه الري اليوم؟" },
  allPassed: {
    en: "All checks passed. Safe to irrigate.",
    fr: "Tous les contrôles sont bons. Irrigation possible.",
    ar: "كل الفحوصات سليمة. يمكن الري.",
  },
  noFarms: { en: "No farms yet.", fr: "Aucune ferme.", ar: "لا توجد مزارع بعد." },
  loading: { en: "Loading…", fr: "Chargement…", ar: "جارٍ التحميل…" },
  who: {
    en: "WHO guideline — not Tunisian law",
    fr: "Recommandation OMS — pas la loi tunisienne",
    ar: "توصية منظمة الصحة العالمية — ليست القانون التونسي",
  },
  open: { en: "Why? →", fr: "Pourquoi ? →", ar: "لماذا؟ ←" },
  inShort: { en: "In short", fr: "En bref", ar: "باختصار" },
  checked: { en: "What we checked", fr: "Ce que nous avons vérifié", ar: "ما تحققنا منه" },
  legal: { en: "Legal details", fr: "Détails juridiques", ar: "التفاصيل القانونية" },
  legalNote: {
    en: "",
    fr: "",
    ar: "التفاصيل القانونية معروضة بالفرنسية.",
  },
  soilSalt: { en: "Soil salt", fr: "Sel du sol", ar: "ملوحة التربة" },
  close: { en: "Close", fr: "Fermer", ar: "إغلاق" },
  mockNote: {
    en: "Mock mode: the same compatibility file is shown for every batch.",
    fr: "Mode maquette : le même fichier de compatibilité est affiché pour chaque lot.",
    ar: "وضع تجريبي: يظهر نفس الملف لكل دفعة.",
  },
} satisfies Record<string, Tr>;

/** Server texts exist in English and French only; Arabic readers get the French legal text. */
export const reason = (r: RuleResult, lang: Lang) => (lang === "en" ? r.reason_en : r.reason_fr);

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

export const cropLabel = (crop: string) => crop.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const CROPS: Record<string, { fr: string; ar: string }> = {
  alfalfa: { fr: "Luzerne", ar: "الفصّة" },
  olive: { fr: "Olivier", ar: "الزيتون" },
  lettuce: { fr: "Laitue", ar: "الخسّ" },
  tomato: { fr: "Tomate", ar: "الطماطم" },
  wheat: { fr: "Blé", ar: "القمح" },
  barley: { fr: "Orge", ar: "الشعير" },
  barley_fodder: { fr: "Orge fourragère", ar: "الشعير العلفي" },
  oat_fodder: { fr: "Avoine fourragère", ar: "الشوفان العلفي" },
  citrus_orange: { fr: "Oranger", ar: "البرتقال" },
  pomegranate: { fr: "Grenadier", ar: "الرمّان" },
};

/** Crop name in the reader's language. */
export const cropName = (crop: string, lang: Lang) => (lang !== "en" && CROPS[crop]?.[lang]) || cropLabel(crop);

const PARAMS: Record<string, Partial<Tr>> = {
  Chloride: { fr: "Chlorures", ar: "الكلوريد" },
  EC: { ar: "الملوحة (EC)" },
  pH: { ar: "الحموضة (pH)" },
  "Intestinal nematode eggs (helminths)": { en: "Parasite eggs", fr: "Oeufs de parasites", ar: "بيض الطفيليات" },
};
const paramName = (p: string, lang: Lang) => PARAMS[p]?.[lang] ?? p;

/** Plain-language sentence for the main problem; the legal detail stays in the panel. */
function plain(r: RuleResult, crop: string, lang: Lang): string {
  const id = r.rule_id;
  const t = (x: Tr) => x[lang];
  if (id === "R-RAW-EATEN")
    return t({
      en: `${crop} is eaten raw: the law forbids this water.`,
      fr: `${crop} se mange cru : la loi interdit cette eau.`,
      ar: `${crop} يؤكل نيئًا: القانون يمنع هذا الماء.`,
    });
  if (id === "R-CROP-ALLOWED")
    return t({
      en: `${crop} is not on the list of allowed crops.`,
      fr: `${crop} n'est pas sur la liste des cultures autorisées.`,
      ar: `${crop} ليس في قائمة الزراعات المسموح بها.`,
    });
  if (id === "R-ANALYSIS")
    return t({
      en: "The lab test is too old: wait for a new one.",
      fr: "Le test du laboratoire est trop ancien : attendez un nouveau test.",
      ar: "تحليل المخبر قديم: انتظر تحليلًا جديدًا.",
    });
  if (id === "R-NEMATODE" || id.startsWith("R-LIMIT-"))
    return t({
      en: "Water quality is above the legal limit.",
      fr: "La qualité de l'eau dépasse la limite légale.",
      ar: "جودة الماء تتجاوز الحدّ القانوني.",
    });
  if (id === "R-GRAZING")
    return t({
      en: "No animals may graze on this plot.",
      fr: "Pas de pâturage direct sur cette parcelle.",
      ar: "يُمنع رعي الحيوانات في هذه القطعة.",
    });
  if (id.startsWith("R-SALINITY"))
    return t({
      en: "Salty soil: water a little more to wash the salt down.",
      fr: "Sol salé : arrosez un peu plus pour chasser le sel.",
      ar: "تربة مالحة: اسقِ أكثر قليلًا لغسل الملح.",
    });
  return reason(r, lang);
}

/** The one reason shown on a farm card, in plain words. */
export function mainReason(results: RuleResult[], lang: Lang, crop = ""): string {
  const first = sortResults(results)[0];
  return first && !first.passed ? plain(first, cropName(crop, lang), lang) : T.allPassed[lang];
}

export type CheckStatus = "ok" | "warn" | "bad" | "info";

export interface Check {
  key: string;
  status: CheckStatus;
  text: string;
}

/**
 * The farm's rule results turned into a short checklist in plain words (5–6 lines).
 * The exact values and legal articles stay in the panel's "Legal details".
 */
export function plainChecks(results: RuleResult[], crop: string, lang: Lang, params: Map<string, string>): Check[] {
  const by = (pred: (r: RuleResult) => boolean) => results.filter(pred);
  const failed = (rs: RuleResult[]) => rs.filter((r) => !r.passed);
  const t = (x: Tr) => x[lang];
  const name = cropName(crop, lang);
  const out: Check[] = [];

  const lab = by((r) => r.rule_id === "R-ANALYSIS");
  if (lab.length)
    out.push(
      failed(lab).length
        ? {
            key: "lab",
            status: "bad",
            text: t({
              en: "The lab test is too old or missing: wait for a new test.",
              fr: "Le test du laboratoire est trop ancien ou absent : attendez un nouveau test.",
              ar: "تحليل المخبر قديم أو غير موجود: انتظر تحليلًا جديدًا.",
            }),
          }
        : { key: "lab", status: "ok", text: t({ en: "Lab test is up to date.", fr: "Le test du laboratoire est à jour.", ar: "تحليل المخبر حديث." }) },
    );

  const quality = by((r) => (r.rule_id.startsWith("R-LIMIT-") && r.rule_id !== "R-LIMIT-NOT-MEASURED") || r.rule_id === "R-NEMATODE");
  if (quality.length) {
    const bad = failed(quality).map((r) => paramName(params.get(r.rule_id) ?? r.rule_id, lang));
    const n = quality.length;
    out.push(
      bad.length
        ? {
            key: "quality",
            status: "bad",
            text: t({
              en: `Water quality is above the legal limit: ${bad.join(", ")}.`,
              fr: `La qualité de l'eau dépasse la limite légale : ${bad.join(", ")}.`,
              ar: `جودة الماء تتجاوز الحدّ القانوني: ${bad.join("، ")}.`,
            }),
          }
        : {
            key: "quality",
            status: "ok",
            text: t({
              en: `Water quality is within the legal limits (${n} measurements).`,
              fr: `La qualité de l'eau respecte les limites légales (${n} mesures).`,
              ar: `جودة الماء ضمن الحدود القانونية (${n} قياسات).`,
            }),
          },
    );
  }

  const raw = by((r) => r.rule_id === "R-RAW-EATEN");
  const allowed = by((r) => r.rule_id === "R-CROP-ALLOWED");
  if (failed(raw).length)
    out.push({
      key: "crop",
      status: "bad",
      text: t({
        en: `${name} is eaten raw: the law forbids this water on it.`,
        fr: `${name} se mange cru : la loi interdit cette eau.`,
        ar: `${name} يؤكل نيئًا: القانون يمنع ريّه بهذا الماء.`,
      }),
    });
  else if (failed(allowed).length)
    out.push({
      key: "crop",
      status: "bad",
      text: t({
        en: `${name} is not on the list of crops allowed with this water.`,
        fr: `${name} n'est pas sur la liste des cultures autorisées avec cette eau.`,
        ar: `${name} ليس في قائمة الزراعات المسموح بريّها بهذا الماء.`,
      }),
    });
  else if (raw.length || allowed.length)
    out.push({
      key: "crop",
      status: "ok",
      text: t({
        en: `${name} may be irrigated with this water.`,
        fr: `${name} peut être irrigué avec cette eau.`,
        ar: `يمكن ريّ ${name} بهذا الماء.`,
      }),
    });

  const grazing = by((r) => r.rule_id === "R-GRAZING");
  if (grazing.length)
    out.push(
      failed(grazing).length
        ? {
            key: "grazing",
            status: "bad",
            text: t({
              en: "Animals graze on this plot: not allowed.",
              fr: "Des animaux pâturent sur cette parcelle : interdit.",
              ar: "حيوانات ترعى في هذه القطعة: ممنوع.",
            }),
          }
        : {
            key: "grazing",
            status: "ok",
            text: t({ en: "No animals grazing on the plot.", fr: "Pas d'animaux en pâture sur la parcelle.", ar: "لا رعي للحيوانات في القطعة." }),
          },
    );
  if (by((r) => r.rule_id === "R-GRAZING-FODDER").length)
    out.push({
      key: "fodder",
      status: "info",
      text: t({
        en: "Fodder: cut it and bring it to the animals; do not let them graze here.",
        fr: "Fourrage : fauchez-le et apportez-le aux animaux ; pas de pâturage ici.",
        ar: "العلف: احصده وقدّمه للحيوانات، ولا تتركها ترعى هنا.",
      }),
    });

  const salt = by((r) => r.rule_id.startsWith("R-SALINITY") && r.rule_id !== "R-SALINITY-NONE");
  if (failed(salt).length)
    out.push({
      key: "salt",
      status: "warn",
      text: t({
        en: "Salty soil: water a little more to wash the salt down.",
        fr: "Sol salé : arrosez un peu plus pour chasser le sel.",
        ar: "تربة مالحة: اسقِ أكثر قليلًا لغسل الملح.",
      }),
    });
  else if (salt.length)
    out.push({
      key: "salt",
      status: "ok",
      text: t({
        en: "Soil salt level is fine for this crop.",
        fr: "Le niveau de sel du sol convient à cette culture.",
        ar: "مستوى ملوحة التربة مناسب لهذه الزراعة.",
      }),
    });
  else if (by((r) => r.rule_id === "R-SALINITY-NONE").length)
    out.push({
      key: "salt",
      status: "info",
      text: t({
        en: "Soil salt: no reference value for this crop.",
        fr: "Sel du sol : pas de valeur de référence pour cette culture.",
        ar: "ملوحة التربة: لا توجد قيمة مرجعية لهذه الزراعة.",
      }),
    });

  if (by((r) => r.rule_id === "R-LIMIT-NOT-MEASURED").length)
    out.push({
      key: "metals",
      status: "info",
      text: t({
        en: "Metals are tested twice a year, not in this batch.",
        fr: "Les métaux sont testés deux fois par an, pas dans ce lot.",
        ar: "تُحلَّل المعادن مرتين في السنة، وليس في هذه الدفعة.",
      }),
    });

  return out;
}
