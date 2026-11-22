import type { TerritoryFigure } from "../../api/types";
import { fmtN } from "../../format";
import type { Lang, Tr } from "../../i18n";

export const Bz = {
  eyebrow: { en: "Business", fr: "Modèle économique", ar: "النموذج الاقتصادي" },
  lead: {
    en: "What treated water could mean in dinars at a larger scale. These are projections, not promises.",
    fr: "Ce que l'eau traitée pourrait représenter en dinars à plus grande échelle. Ce sont des projections, pas des promesses.",
    ar: "ما يمكن أن يعنيه الماء المعالَج بالدينار على نطاق أوسع. هذه توقّعات وليست وعودًا.",
  },
  // controls
  howMany: { en: "How many hectares?", fr: "Combien d'hectares ?", ar: "كم هكتارًا؟" },
  pilot: { en: "Our pilot", fr: "Notre pilote", ar: "مشروعنا التجريبي" },
  pilotFarms: { en: "farms", fr: "fermes", ar: "مزارع" },
  irrigated: { en: "Irrigated with treated water", fr: "Irrigués à l'eau traitée", ar: "المسقية بالماء المعالَج" },
  equipped: { en: "Equipped for treated water", fr: "Équipés pour l'eau traitée", ar: "المجهّزة للماء المعالَج" },
  custom: { en: "Your own number", fr: "Votre chiffre", ar: "رقمك الخاص" },
  customLabel: { en: "Hectares", fr: "Hectares", ar: "الهكتارات" },
  customBad: { en: "Enter a number from 0 to 1,000,000.", fr: "Entrez un nombre de 0 à 1 000 000.", ar: "أدخل رقمًا من 0 إلى 1,000,000." },
  ha: { en: "ha", fr: "ha", ar: "هكتار" },
  adoption: { en: "How many of them join?", fr: "Combien y adhèrent ?", ar: "كم منها ينضم؟" },
  adoptionHelp: {
    en: "Share of the hectares that actually use treated water.",
    fr: "Part des hectares qui utilisent vraiment l'eau traitée.",
    ar: "نسبة الهكتارات التي تستعمل الماء المعالَج فعلًا.",
  },
  // big numbers
  projection: { en: "projection", fr: "projection", ar: "توقّع" },
  farmersSave: { en: "Farmers save", fr: "Les agriculteurs économisent", ar: "الفلاحون يوفّرون" },
  qatraEarns: { en: "QATRA earns", fr: "QATRA gagne", ar: "قطرة تكسب" },
  waterSaved: { en: "Well water not pumped", fr: "Eau de puits non pompée", ar: "ماء الآبار غير المضخوخ" },
  elecSaved: { en: "Electricity saved", fr: "Électricité économisée", ar: "الكهرباء الموفَّرة" },
  perYear: { en: "per year", fr: "par an", ar: "في السنة" },
  tnd: { en: "TND", fr: "TND", ar: "TND" },
  m3: { en: "m³", fr: "m³", ar: "م³" },
  kwh: { en: "kWh", fr: "kWh", ar: "كيلوواط·س" },
  // explanation
  noUpfront: {
    en: "Farmers pay nothing upfront.",
    fr: "Les agriculteurs ne paient rien d'avance.",
    ar: "لا يدفع الفلاحون شيئًا مقدّمًا.",
  },
  revenueOnly: {
    en: "Only QATRA's income is shown: there is no cost data, so no profit figure.",
    fr: "Seul le revenu de QATRA est affiché : il n'y a pas de données de coûts, donc pas de chiffre de bénéfice.",
    ar: "يُعرض دخل قطرة فقط: لا توجد بيانات عن التكاليف، لذلك لا يوجد رقم للربح.",
  },
  // pilot box
  pilotTitle: { en: "In our pilot", fr: "Dans notre pilote", ar: "في مشروعنا التجريبي" },
  pilotNote: {
    en: "The pilot farms are simulated demo farms based on real fields.",
    fr: "Les fermes du pilote sont des fermes de démonstration simulées sur de vrais champs.",
    ar: "مزارع المشروع التجريبي مزارع تجريبية محاكاة على حقول حقيقية.",
  },
  hectaresTitle: { en: "Hectares we rely on", fr: "Les hectares sur lesquels nous nous appuyons", ar: "الهكتارات التي نعتمد عليها" },
  reported: { en: "Reported", fr: "Rapporté", ar: "مُبلَّغ عنه" },
  source: { en: "Source", fr: "Source", ar: "المصدر" },
  openSource: { en: "open", fr: "ouvrir", ar: "فتح" },
  // honest note
  honestTitle: { en: "Please read: how honest this is", fr: "À lire : ce que ces chiffres valent", ar: "للقراءة: مدى صدق هذه الأرقام" },
  honest: {
    en: "Projection: assumes the same saving per hectare as the pilot; prices to be verified.",
    fr: "Projection : suppose la même économie par hectare que le pilote ; prix à vérifier.",
    ar: "توقّع: يفترض نفس الوفر لكل هكتار كما في المشروع التجريبي؛ الأسعار تحتاج إلى تحقّق.",
  },
  toVerify: { en: "To be verified", fr: "À vérifier", ar: "يجب التحقق منه" },
  toVerifyList: { en: "Prices still to be verified", fr: "Prix encore à vérifier", ar: "أسعار ما زالت تحتاج إلى تحقّق" },
  // chart
  chartTitle: { en: "Farmers' saving and QATRA's share, by scale", fr: "Économie des agriculteurs et part de QATRA, selon l'échelle", ar: "وفر الفلاحين وحصة قطرة حسب النطاق" },
  chartLead: {
    en: "TND per year, projection. Bars are drawn to scale, so small cases look small: the value is written beside each bar.",
    fr: "TND par an, projection. Les barres sont à l'échelle : les petits cas paraissent petits ; la valeur est écrite à côté de chaque barre.",
    ar: "TND في السنة، توقّع. الأعمدة مرسومة بمقياس واحد، لذا تبدو الحالات الصغيرة صغيرة؛ والقيمة مكتوبة بجانب كل عمود.",
  },
  chartAria: { en: "Bar chart comparing farmers' saving and QATRA revenue for each scale", fr: "Histogramme comparant l'économie des agriculteurs et le revenu de QATRA pour chaque échelle", ar: "مخطط أعمدة يقارن وفر الفلاحين ودخل قطرة لكل نطاق" },
  mockNote: {
    en: "Mock mode: sample figures from the mock file.",
    fr: "Mode maquette : chiffres d'exemple du fichier maquette.",
    ar: "وضع تجريبي: أرقام نموذجية من ملف تجريبي.",
  },
  empty: { en: "There are no business figures yet.", fr: "Il n'y a pas encore de chiffres.", ar: "لا توجد أرقام بعد." },
  selected: { en: "selected", fr: "sélectionné", ar: "المحدَّد" },
} satisfies Record<string, Tr>;

export const headline = (ha: number, lang: Lang) => {
  const n = fmtN(ha, lang, ha < 100 ? 1 : 0);
  return {
    en: `If treated water reaches ${n} hectares`,
    fr: `Si l'eau traitée atteint ${n} hectares`,
    ar: `إذا وصل الماء المعالَج إلى ${n} هكتار`,
  }[lang];
};

export const inPractice = (pct: number, ha: number, lang: Lang) => {
  const p = fmtN(pct, lang, 0);
  const n = fmtN(ha, lang, ha < 100 ? 1 : 0);
  return {
    en: `${p}% of them join: ${n} hectares in practice.`,
    fr: `${p} % y adhèrent : ${n} hectares en pratique.`,
    ar: `${p}% منها تنضم: ${n} هكتار فعليًا.`,
  }[lang];
};

export const explain = (pct: number, lang: Lang) => {
  const p = fmtN(pct, lang, 1);
  return {
    en: `QATRA earns only when farmers save money: ${p}% of their saving.`,
    fr: `QATRA ne gagne que lorsque les agriculteurs économisent : ${p} % de leur économie.`,
    ar: `لا تكسب قطرة إلا عندما يوفّر الفلاحون المال: ${p}% من وفرهم.`,
  }[lang];
};

export const pilotLine = (farms: number, total: number, receiving: number, perHa: number, lang: Lang) => {
  const t = fmtN(total, lang, 1);
  const r = fmtN(receiving, lang, 1);
  const x = fmtN(perHa, lang, 0);
  return {
    en: `${farms} farms, ${t} ha (${r} ha receive water). Each hectare that receives water saves about ${x} TND per season.`,
    fr: `${farms} fermes, ${t} ha (${r} ha reçoivent de l'eau). Chaque hectare qui reçoit de l'eau économise environ ${x} TND par saison.`,
    ar: `${farms} مزارع، ${t} هكتار (${r} هكتار تتلقى الماء). كل هكتار يتلقى الماء يوفّر حوالي ${x} TND في الموسم.`,
  }[lang];
};

/** Territory figure names in plain words (the server sends English labels). */
const FIGURE: Record<TerritoryFigure["key"], Tr> = {
  equipped_ha: { en: "Equipped for treated water, Tunisia", fr: "Équipés pour l'eau traitée, Tunisie", ar: "المجهّزة للماء المعالَج، تونس" },
  irrigated_ha: { en: "Actually irrigated with treated water, Tunisia", fr: "Réellement irrigués à l'eau traitée, Tunisie", ar: "المسقية فعلًا بالماء المعالَج، تونس" },
  perimeter_ha: { en: "Zaouiet-Sousse perimeter, equipped", fr: "Périmètre de Zaouiet-Sousse, équipé", ar: "المنطقة السقوية بزاوية سوسة، مجهّزة" },
  perimeters: { en: "Perimeters irrigated with treated water", fr: "Périmètres irrigués à l'eau traitée", ar: "المناطق المسقية بالماء المعالَج" },
};
export const figureName = (t: TerritoryFigure, lang: Lang) => FIGURE[t.key]?.[lang] ?? t.label;

/** Notes the server attaches to a figure; known ones are translated. */
export function figureNote(note: string | null | undefined, lang: Lang): string | null {
  if (!note) return null;
  return note
    .replace(/official dataset 2021\/22 \(Agridata\): ([\d\s/]+) ha/, (_m, v: string) =>
      ({ en: `official dataset 2021/22 (Agridata): ${v} ha`, fr: `jeu de données officiel 2021/22 (Agridata) : ${v} ha`, ar: `البيانات الرسمية 2021/22 (Agridata): ${v} هكتار` })[lang],
    )
    .replace("publication date to verify", { en: "publication date to verify", fr: "date de publication à vérifier", ar: "تاريخ النشر يحتاج إلى تحقّق" }[lang]);
}

const WARNINGS: { re: RegExp; to: Tr }[] = [
  {
    re: /^Scale-up assumes the same saving per hectare/,
    to: {
      en: "The scale-up assumes the same saving per hectare as the pilot. Whether there is enough treated water for more hectares is not checked: one plant gives a limited volume.",
      fr: "L'extension suppose la même économie par hectare que le pilote. Nous ne vérifions pas s'il y a assez d'eau traitée pour plus d'hectares : une station donne un volume limité.",
      ar: "يفترض التوسّع نفس الوفر لكل هكتار كما في المشروع التجريبي. لا نتحقق مما إذا كان الماء المعالَج يكفي لهكتارات أكثر: المحطة الواحدة تعطي حجمًا محدودًا.",
    },
  },
  {
    re: /^Revenue only/,
    to: {
      en: "Revenue only: the data has no QATRA costs, so no profit is shown.",
      fr: "Revenu seulement : les données n'ont pas de coûts pour QATRA, donc aucun bénéfice n'est affiché.",
      ar: "الدخل فقط: لا توجد بيانات عن تكاليف قطرة، لذلك لا يُعرض ربح.",
    },
  },
];

/** Server warnings in the reader's language; "Built on prices..." is dropped (the verify list says it better). */
export function warningTexts(ws: string[], lang: Lang): string[] {
  return ws
    .filter((w) => !w.startsWith("Built on prices still to be verified") && !w.startsWith("Adoption rate"))
    .map((w) => WARNINGS.find((k) => k.re.test(w))?.to[lang] ?? w);
}
