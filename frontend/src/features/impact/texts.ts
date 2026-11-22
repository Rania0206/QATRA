import { type Lang, type Tr } from "../../i18n";
import { fmtN } from "../../format";

export const Im = {
  eyebrow: { en: "Impact", fr: "Impact", ar: "الأثر" },
  lead: {
    en: "Water, energy and dinars: what the pilot does today, and what it could do if it grows.",
    fr: "L'eau, l'énergie et les dinars : ce que fait le pilote aujourd'hui, et ce qu'il pourrait faire s'il grandit.",
    ar: "الماء والطاقة والدنانير: ما يفعله المشروع التجريبي اليوم، وما يمكن أن يفعله إذا كبر.",
  },
  leadNote: {
    en: "One day of the plan is an estimate; a whole season is a projection.",
    fr: "Une journée du plan est une estimation ; une saison entière est une projection.",
    ar: "يوم واحد من الخطة تقدير؛ والموسم كاملًا توقّع.",
  },
  // blocks
  pilotTitle: { en: "Our pilot", fr: "Notre pilote", ar: "مشروعنا التجريبي" },
  growTitle: { en: "If it grows", fr: "Si cela grandit", ar: "إذا كبر المشروع" },
  perDay: { en: "Per day", fr: "Par jour", ar: "في اليوم" },
  perSeason: { en: "Per season", fr: "Par saison", ar: "في الموسم" },
  estimate: { en: "estimate", fr: "estimation", ar: "تقدير" },
  projection: { en: "projection", fr: "projection", ar: "توقّع" },
  water: { en: "Water", fr: "Eau", ar: "الماء" },
  energy: { en: "Energy", fr: "Énergie", ar: "الطاقة" },
  money: { en: "Money", fr: "Argent", ar: "المال" },
  treated: { en: "Treated water used", fr: "Eau traitée utilisée", ar: "الماء المعالَج المستعمل" },
  well: { en: "Well water replaced", fr: "Eau de puits remplacée", ar: "ماء الآبار المعوَّض" },
  kwh: { en: "Pumping electricity saved on wells", fr: "Électricité de pompage économisée sur les puits", ar: "كهرباء الضخ الموفَّرة من الآبار" },
  solar: { en: "Solar share of the treated-water pumping", fr: "Part du solaire dans le pompage de l'eau traitée", ar: "حصة الطاقة الشمسية في ضخ الماء المعالَج" },
  farmers: { en: "Farmers save", fr: "Les agriculteurs économisent", ar: "الفلاحون يوفّرون" },
  qatra: { en: "QATRA earns", fr: "QATRA gagne", ar: "قطرة تكسب" },
  qatraShare: { en: "its share of the saving", fr: "sa part de l'économie", ar: "حصتها من الوفر" },
  seasonDays: { en: "irrigation days per season", fr: "jours d'irrigation par saison", ar: "أيام ري في الموسم" },
  sources: { en: "Sources and assumptions", fr: "Sources et hypothèses", ar: "المصادر والافتراضات" },
  moreBusiness: { en: "Change the scale on the Business screen", fr: "Changer l'échelle dans l'écran Modèle économique", ar: "غيّر النطاق في شاشة النموذج الاقتصادي" },
  hectaresReported: { en: "hectares reported", fr: "hectares déclarés", ar: "هكتارات مُبلَّغ عنها" },
  growNote: {
    en: "Assumes the same saving per hectare as the pilot; prices to be verified.",
    fr: "Suppose la même économie par hectare que le pilote ; prix à vérifier.",
    ar: "يفترض نفس الوفر لكل هكتار كما في المشروع التجريبي؛ الأسعار تحتاج إلى تحقّق.",
  },
  growMissing: {
    en: "The scale-up figures are not available right now.",
    fr: "Les chiffres de l'extension ne sont pas disponibles pour le moment.",
    ar: "أرقام التوسّع غير متاحة حاليًا.",
  },
  noGrowWater: {
    en: "Treated water used at scale is not shown: the data gives only the well water replaced.",
    fr: "L'eau traitée utilisée à grande échelle n'est pas affichée : les données ne donnent que l'eau de puits remplacée.",
    ar: "لا يُعرض الماء المعالَج المستعمل على النطاق الواسع: تعطي البيانات فقط ماء الآبار المعوَّض.",
  },
  m3: { en: "m³", fr: "m³", ar: "م³" },
  tnd: { en: "TND", fr: "TND", ar: "TND" },
  kwhUnit: { en: "kWh", fr: "kWh", ar: "كيلوواط·س" },
  mockNote: { en: "Mock mode: sample figures.", fr: "Mode maquette : chiffres d'exemple.", ar: "وضع تجريبي: أرقام نموذجية." },
} satisfies Record<string, Tr>;

/** Values under 100 keep one decimal, larger ones are rounded (97.2 TND, 14,585 TND). */
export const nf = (v: number, lang: Lang) => fmtN(v, lang, Math.abs(v) < 100 ? 1 : 0);

/** The headline, generated from the response: "In our pilot, 10 farms save about 97 TND a day and replace 788 m³ of well water." */
export const headline = (farms: number, tndPerDay: number, wellM3PerDay: number, lang: Lang) => {
  const t = fmtN(tndPerDay, lang, 0);
  const w = fmtN(wellM3PerDay, lang, 0);
  return {
    en: `In our pilot, ${farms} farms save about ${t} TND a day and replace ${w} m³ of well water.`,
    fr: `Dans notre pilote, ${farms} fermes économisent environ ${t} TND par jour et remplacent ${w} m³ d'eau de puits.`,
    ar: `في مشروعنا التجريبي، توفّر ${farms} مزارع حوالي ${t} TND في اليوم وتعوّض ${w} م³ من ماء الآبار.`,
  }[lang];
};

export const pilotSub = (farms: number, ha: number, days: number, lang: Lang) => {
  const h = fmtN(ha, lang, 1);
  const d = fmtN(days, lang, 0);
  return {
    en: `${farms} farms, ${h} ha. A season is ${d} irrigation days.`,
    fr: `${farms} fermes, ${h} ha. Une saison compte ${d} jours d'irrigation.`,
    ar: `${farms} مزارع، ${h} هكتار. الموسم ${d} يوم ري.`,
  }[lang];
};

export const growSub = (pct: number, ha: number, equipped: number, lang: Lang) => {
  const p = fmtN(pct, lang, 0);
  const h = fmtN(ha, lang, 0);
  const e = fmtN(equipped, lang, 0);
  return {
    en: `${p}% of the ${e} hectares equipped for treated water in Tunisia (${h} ha).`,
    fr: `${p} % des ${e} hectares équipés pour l'eau traitée en Tunisie (${h} ha).`,
    ar: `${p}% من ${e} هكتار المجهّزة للماء المعالَج في تونس (${h} هكتار).`,
  }[lang];
};
