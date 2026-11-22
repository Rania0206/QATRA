import type { AnalysisStatus, AnalysisType } from "../../api/types";
import type { Tone } from "../../components/ui";
import { fmtDateL, type Lang, type Tr } from "../../i18n";

export const ANALYSIS_LABEL: Record<AnalysisType, Tr> = {
  physico_chemical: { en: "Physico-chemical", fr: "Physico-chimique", ar: "التحليل الفيزيائي الكيميائي" },
  parasite_eggs: { en: "Parasite eggs", fr: "Oeufs de parasites", ar: "بيض الطفيليات" },
  metals: { en: "Metals", fr: "Métaux", ar: "المعادن" },
};

export const REQUIRED_TYPES: AnalysisType[] = ["physico_chemical", "parasite_eggs"];

/** Parameter column name -> label and unit. Unknown names fall back to the raw name. */
const PARAMS: Record<string, [Tr, string]> = {
  EC_dS_m: [{ en: "Electrical conductivity (EC)", fr: "Conductivité électrique (CE)", ar: "الناقلية الكهربائية (EC)" }, "dS/m"],
  SAR: [{ en: "Sodium adsorption ratio (SAR)", fr: "Taux d'adsorption du sodium (SAR)", ar: "نسبة امتزاز الصوديوم (SAR)" }, "–"],
  BOD5_mg_L: [{ en: "BOD5", fr: "DBO5", ar: "الطلب البيولوجي على الأكسجين (BOD5)" }, "mg/L"],
  COD_mg_L: [{ en: "COD", fr: "DCO", ar: "الطلب الكيميائي على الأكسجين (COD)" }, "mg/L"],
  TSS_mg_L: [{ en: "Suspended solids (TSS)", fr: "Matières en suspension (MES)", ar: "المواد العالقة (TSS)" }, "mg/L"],
  total_N_mg_L: [{ en: "Total nitrogen", fr: "Azote total", ar: "الآزوت الكلي" }, "mg/L"],
  Cl_mg_L: [{ en: "Chloride", fr: "Chlorures", ar: "الكلوريد" }, "mg/L"],
  pH: [{ en: "pH", fr: "pH", ar: "الحموضة (pH)" }, "–"],
  faecal_coliforms_cfu_100mL: [{ en: "Faecal coliforms", fr: "Coliformes fécaux", ar: "القولونيات البرازية" }, "CFU/100 mL"],
  helminth_eggs_per_L: [{ en: "Helminth eggs", fr: "Oeufs d'helminthes", ar: "بيض الديدان" }, "eggs/L"],
  nematode_eggs_per_L: [{ en: "Nematode eggs", fr: "Oeufs de nématodes", ar: "بيض الديدان الخيطية" }, "eggs/L"],
};

export function paramInfo(name: string, lang: Lang = "en"): { label: string; unit: string } {
  const known = PARAMS[name];
  if (known) return { label: known[0][lang], unit: known[1] };
  const m = name.match(/^(.*)_(mg_L|ug_L)$/);
  return m ? { label: m[1], unit: m[2].replace("_", "/") } : { label: name, unit: "" };
}

export function fmtNumber(v: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString("en-US");
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Date in the reader's language. */
export const fmtDate = (iso: string, lang: Lang = "en") => fmtDateL(iso, lang);

const DAY = 86_400_000;
export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / DAY);

export const ANALYSIS_STATUS: Record<AnalysisStatus, { label: Tr; tone: Tone }> = {
  valid: { label: { en: "Up to date", fr: "À jour", ar: "حديث" }, tone: "ok" },
  expired: { label: { en: "Too old", fr: "Trop ancien", ar: "قديم جدًا" }, tone: "warn" },
  missing: { label: { en: "Missing", fr: "Manquant", ar: "غير موجود" }, tone: "bad" },
};

/** Batch.status (A-03b). Unknown values (older backends) render as a dash. */
export const COMPLIANCE: Record<string, { label: Tr; tone: Tone; title: string }> = {
  compliant: {
    label: { en: "Meets the law", fr: "Conforme à la loi", ar: "مطابق للقانون" },
    tone: "good",
    title: "All measured values within NT 106.03",
  },
  conditional: {
    label: { en: "With conditions", fr: "Sous conditions", ar: "بشروط" },
    tone: "warn",
    title: "Usable with conditions",
  },
  non_compliant: {
    label: { en: "Fails the law", fr: "Non conforme", ar: "غير مطابق للقانون" },
    tone: "bad",
    title: "A measured value is above an NT 106.03 limit",
  },
  analysis_invalid: {
    label: { en: "Lab test too old", fr: "Test trop ancien", ar: "التحليل قديم" },
    tone: "neutral",
    title: "Analysis expired or missing (Decree 89-1047 Art. 3)",
  },
};

/** Texts of the Batches screen. */
export const B = {
  eyebrow: { en: "Sousse Sud plant → Zaouiet-Sousse", fr: "Station Sousse Sud → Zaouiet-Sousse", ar: "محطة سوسة الجنوبية ← زاوية سوسة" },
  title: { en: "Treated water, batch by batch.", fr: "L'eau traitée, lot par lot.", ar: "الماء المعالج، دفعة بدفعة." },
  lead: {
    en: "Every day the plant releases a batch of treated water. Before it reaches a field, its lab tests must be recent and its values within Tunisian limits.",
    fr: "Chaque jour, la station livre un lot d'eau traitée. Avant d'arriver au champ, ses tests de laboratoire doivent être récents et ses valeurs dans les limites tunisiennes.",
    ar: "كل يوم تُطلق المحطة دفعة من الماء المعالج. قبل أن تصل إلى الحقل، يجب أن تكون تحاليلها حديثة وقيمها ضمن الحدود التونسية.",
  },
  see: { en: "See the batches", fr: "Voir les lots", ar: "عرض الدفعات" },
  equipped: { en: "Zaouiet-Sousse, equipped for treated water", fr: "Zaouiet-Sousse, équipés pour l'eau traitée", ar: "زاوية سوسة، مجهّزة للماء المعالج" },
  delivered: { en: "Delivered to farms in 2023/24", fr: "Livrés aux fermes en 2023/24", ar: "سُلّمت للمزارع في 2023/24" },
  todayBatch: { en: "Today's batch", fr: "Lot du jour", ar: "دفعة اليوم" },
  source: {
    en: "Source: Agridata / data.gov.tn, TWW irrigated perimeters 2023/24",
    fr: "Source : Agridata / data.gov.tn, périmètres irrigués aux EUT 2023/24",
    ar: "المصدر: Agridata / data.gov.tn، المناطق السقوية بالمياه المعالجة 2023/24",
  },
  dailyEyebrow: { en: "Daily batches", fr: "Lots quotidiens", ar: "الدفعات اليومية" },
  dailyTitle: { en: "Sixty days of lab results.", fr: "Soixante jours de résultats.", ar: "ستون يومًا من نتائج التحاليل." },
  all: { en: "All", fr: "Tous", ar: "الكل" },
  testsOk: { en: "Tests up to date", fr: "Tests à jour", ar: "تحاليل حديثة" },
  testsBad: { en: "Tests too old or missing", fr: "Tests trop anciens ou absents", ar: "تحاليل قديمة أو ناقصة" },
  noBatches: { en: "No batches yet.", fr: "Aucun lot pour l'instant.", ar: "لا توجد دفعات بعد." },
  noMatch: { en: "No batch matches this filter.", fr: "Aucun lot ne correspond à ce filtre.", ar: "لا توجد دفعة تطابق هذا الاختيار." },
  date: { en: "Date", fr: "Date", ar: "التاريخ" },
  batchId: { en: "Batch ID", fr: "N° de lot", ar: "رقم الدفعة" },
  volume: { en: "Volume (m³)", fr: "Volume (m³)", ar: "الحجم (م³)" },
  treatment: { en: "Treatment", fr: "Traitement", ar: "المعالجة" },
  labTests: { en: "Lab tests", fr: "Tests labo", ar: "التحاليل" },
  quality: { en: "Water quality", fr: "Qualité de l'eau", ar: "جودة الماء" },
  today: { en: "today", fr: "aujourd'hui", ar: "اليوم" },
  sampled: { en: "Sampled", fr: "Prélevé le", ar: "أُخذت العينة" },
  validUntil: { en: "valid until", fr: "valable jusqu'au", ar: "صالحة حتى" },
  noAnalysis: { en: "No analysis on record for this batch.", fr: "Aucune analyse enregistrée pour ce lot.", ar: "لا يوجد تحليل مسجّل لهذه الدفعة." },
  note: { en: "Note", fr: "Remarque", ar: "ملاحظة" },
  treatmentWord: { en: "treatment", fr: "traitement", ar: "معالجة" },
  secondary: { en: "secondary", fr: "secondaire", ar: "ثانوية" },
} satisfies Record<string, Tr>;

/** "26 of 30 days left" / "Expired 3 days before this batch". */
export function validityText(left: number, total: number, lang: Lang): string {
  if (left < 0) {
    const n = -left;
    return { en: `Expired ${n} day${n === 1 ? "" : "s"} before this batch`, fr: `Expiré ${n} jour${n === 1 ? "" : "s"} avant ce lot`, ar: `انتهت صلاحيته قبل ${n} يوم من هذه الدفعة` }[lang];
  }
  return { en: `${left} of ${total} days left`, fr: `${left} jours restants sur ${total}`, ar: `بقي ${left} يومًا من ${total}` }[lang];
}

/** "No metals analysis on record …" warning from the backend, in the reader's language. */
export function warningText(w: string, lang: Lang): string {
  if (lang === "en" || !w.startsWith("No metals analysis")) return w;
  return {
    fr: "Aucune analyse des métaux enregistrée (exigée une fois par semestre, décret 89-1047 art. 3b).",
    ar: "لا يوجد تحليل للمعادن (مطلوب مرة كل سداسية، الأمر 89-1047 الفصل 3ب).",
  }[lang];
}

/** "secondary (assumed; …)" -> "secondary" / "secondaire" / "ثانوية". */
export function treatmentName(level: string, lang: Lang): string {
  const short = level.split(" (")[0];
  return short === "secondary" ? B.secondary[lang] : short;
}

/**
 * Perimeter figures for the key-figures band. Values from data/clean/tww_irrigated_areas.csv
 * (Zaouiet Sousse row, 2023/24). No endpoint serves them yet, so they are constants here.
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
