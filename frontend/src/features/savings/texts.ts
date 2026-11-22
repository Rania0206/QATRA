import type { SavingsAssumption, TagStatus } from "../../api/types";
import type { Tone } from "../../components/ui";
import { FARM, type Lang, type Tr } from "../../i18n";
import { fmtN } from "../allocation/texts";

export const S = {
  ...FARM,
  eyebrow: { en: "Savings", fr: "Économies", ar: "التوفير" },
  title: { en: "What you save", fr: "Ce que vous économisez", ar: "ما توفّره" },
  leadCode: {
    en: "Enter your farm code to see how much you save with treated water.",
    fr: "Entrez le code de votre ferme pour voir ce que vous économisez avec l'eau traitée.",
    ar: "أدخل رمز مزرعتك لترى ما توفّره بالماء المعالَج.",
  },
  leadOwn: {
    en: "How much you save with treated water on your farm.",
    fr: "Ce que vous économisez avec l'eau traitée sur votre ferme.",
    ar: "ما توفّره بالماء المعالَج في مزرعتك.",
  },
  leadAll: {
    en: "What every farm saves with treated water, and what the whole area saves.",
    fr: "Ce que chaque ferme économise avec l'eau traitée, et ce que toute la zone économise.",
    ar: "ما توفّره كل مزرعة بالماء المعالَج، وما توفّره المنطقة كلها.",
  },
  yourFarm: { en: "Your farm", fr: "Votre ferme", ar: "مزرعتك" },
  privacy: { en: "Only your farm is shown here.", fr: "Seule votre ferme est affichée ici.", ar: "لا تُعرض هنا إلا مزرعتك." },
  opBanner: {
    en: "Operator view: private data of ALL farms. Demo only; a real version needs a login.",
    fr: "Vue opérateur : données privées de TOUTES les fermes. Démo uniquement ; une vraie version demandera une connexion.",
    ar: "عرض المشغّل: بيانات خاصة بكل المزارع. للعرض التجريبي فقط؛ النسخة الحقيقية تتطلب تسجيل الدخول.",
  },
  opBack: { en: "Back to the farmer view", fr: "Retour à la vue agriculteur", ar: "العودة إلى عرض الفلاح" },
  mockNote: {
    en: "Mock mode: sample figures; changing the prices does not change them.",
    fr: "Mode maquette : chiffres d'exemple ; changer les prix ne les modifie pas.",
    ar: "وضع تجريبي: أرقام نموذجية؛ تغيير الأسعار لا يغيّرها.",
  },
  // big number
  seasonLabel: { en: "Estimated saving this season", fr: "Économie estimée cette saison", ar: "الوفر المقدَّر هذا الموسم" },
  perDay: { en: "about", fr: "environ", ar: "حوالي" },
  perDayEnd: { en: "per day", fr: "par jour", ar: "في اليوم" },
  projection: { en: "projection", fr: "projection", ar: "توقّع" },
  estimate: { en: "estimate", fr: "estimation", ar: "تقدير" },
  tnd: { en: "TND", fr: "TND", ar: "TND" },
  // breakdown
  breakdown: { en: "Where it comes from", fr: "D'où ça vient", ar: "من أين يأتي" },
  electricity: {
    en: "Electricity you don't spend pumping your well",
    fr: "L'électricité que vous ne dépensez plus pour pomper votre puits",
    ar: "الكهرباء التي لا تنفقها على ضخ ماء بئرك",
  },
  fertiliser: {
    en: "Fertiliser already in the treated water",
    fr: "L'engrais déjà présent dans l'eau traitée",
    ar: "السماد الموجود أصلًا في الماء المعالَج",
  },
  waterCost: { en: "Cost of the treated water", fr: "Coût de l'eau traitée", ar: "كلفة الماء المعالَج" },
  deduction: { en: "deducted", fr: "à déduire", ar: "يُخصم" },
  before: { en: "Saving before QATRA's share", fr: "Économie avant la part de QATRA", ar: "الوفر قبل حصة قطرة" },
  keep: { en: "You keep", fr: "Vous gardez", ar: "ما تحتفظ به" },
  noElec: {
    en: "Your farm has no pump of its own, so there is no electricity saving.",
    fr: "Votre ferme n'a pas de pompe à elle : pas d'économie d'électricité.",
    ar: "مزرعتك لا تملك مضخة خاصة، لذلك لا يوجد وفر في الكهرباء.",
  },
  // blocked
  blockedTitle: { en: "Not allowed", fr: "Interdit", ar: "ممنوع" },
  blockedGeneric: {
    en: "The rules do not allow this water on this farm.",
    fr: "Les règles n'autorisent pas cette eau sur cette ferme.",
    ar: "القواعد لا تسمح بهذا الماء في هذه المزرعة.",
  },
  noPlan: { en: "No savings figures for your farm today.", fr: "Pas de chiffres d'économies pour votre ferme aujourd'hui.", ar: "لا أرقام توفير لمزرعتك اليوم." },
  // prices panel
  pricesTitle: { en: "Change the prices", fr: "Changer les prix", ar: "غيّر الأسعار" },
  pricesLead: {
    en: "These prices are assumptions. Change them to see your own figure.",
    fr: "Ces prix sont des hypothèses. Modifiez-les pour voir votre propre chiffre.",
    ar: "هذه الأسعار افتراضات. غيّرها لترى رقمك الخاص.",
  },
  reset: { en: "Reset to default", fr: "Remettre par défaut", ar: "إعادة الضبط" },
  updating: { en: "Updating…", fr: "Mise à jour…", ar: "جارٍ التحديث…" },
  invalid: { en: "Enter a number in the allowed range.", fr: "Entrez un nombre dans la plage permise.", ar: "أدخل رقمًا ضمن المجال المسموح." },
  pFert: { en: "Fertiliser price", fr: "Prix de l'engrais", ar: "سعر السماد" },
  pElec: { en: "Electricity price", fr: "Prix de l'électricité", ar: "سعر الكهرباء" },
  pWater: { en: "Treated-water price", fr: "Prix de l'eau traitée", ar: "سعر الماء المعالَج" },
  pShare: { en: "Usable share of the fertiliser", fr: "Part utilisable de l'engrais", ar: "الحصة القابلة للاستعمال من السماد" },
  pDays: { en: "Irrigation days per season", fr: "Jours d'irrigation par saison", ar: "أيام الري في الموسم" },
  // how we calculated
  howTitle: { en: "How we calculated", fr: "Comment nous avons calculé", ar: "كيف حسبنا" },
  honest1: {
    en: "The season figure is a projection: one day of the plan repeated for the irrigation days.",
    fr: "Le chiffre de la saison est une projection : une journée du plan répétée sur les jours d'irrigation.",
    ar: "رقم الموسم توقّع: يوم واحد من الخطة مكرَّر على أيام الري.",
  },
  honest2: {
    en: "Prices are assumptions you can change.",
    fr: "Les prix sont des hypothèses que vous pouvez modifier.",
    ar: "الأسعار افتراضات يمكنك تغييرها.",
  },
  sourceNote: {
    en: "",
    fr: "Les sources sont affichées en anglais.",
    ar: "المصادر معروضة بالإنجليزية.",
  },
  toVerify: { en: "to be verified", fr: "à vérifier", ar: "يجب التحقق منه" },
  source: { en: "Source", fr: "Source", ar: "المصدر" },
  // operator
  total: { en: "All farms", fr: "Toutes les fermes", ar: "كل المزارع" },
  day: { en: "Per day", fr: "Par jour", ar: "في اليوم" },
  season: { en: "This season", fr: "Cette saison", ar: "هذا الموسم" },
  year: { en: "Per year", fr: "Par an", ar: "في السنة" },
  farmersKeep: { en: "farmers keep", fr: "reste aux agriculteurs", ar: "يبقى للفلاحين" },
  qatraShare: { en: "QATRA's share", fr: "part de QATRA", ar: "حصة قطرة" },
  tableTitle: { en: "Farm by farm, per day", fr: "Ferme par ferme, par jour", ar: "مزرعة بمزرعة، في اليوم" },
  colFarm: { en: "Farm", fr: "Ferme", ar: "المزرعة" },
  colM3: { en: "m³", fr: "m³", ar: "م³" },
  colElec: { en: "Electricity", fr: "Électricité", ar: "الكهرباء" },
  colFert: { en: "Fertiliser", fr: "Engrais", ar: "السماد" },
  colWater: { en: "Water", fr: "Eau", ar: "الماء" },
  colNet: { en: "Net", fr: "Net", ar: "الصافي" },
  colElecS: { en: "Elec.", fr: "Élec.", ar: "كهرباء" },
  colFertS: { en: "Fert.", fr: "Engr.", ar: "سماد" },
  colWaterS: { en: "Water", fr: "Eau", ar: "ماء" },
  colUnit: { en: "TND per day", fr: "TND par jour", ar: "TND في اليوم" },
  notAllowed: { en: "not allowed", fr: "interdit", ar: "ممنوع" },
  empty: { en: "There are no savings figures yet.", fr: "Il n'y a pas encore de chiffres d'économies.", ar: "لا توجد أرقام توفير بعد." },
} satisfies Record<string, Tr>;

/** Assumption names in plain words. Unknown names are shown as the server sent them. */
const NAMES: Record<string, Tr> = {
  electricity_price: { en: "Electricity price", fr: "Prix de l'électricité", ar: "سعر الكهرباء" },
  well_energy_coefficient: {
    en: "Pumping energy per m³ and metre of lift",
    fr: "Énergie de pompage par m³ et par mètre",
    ar: "طاقة الضخ لكل م³ ولكل متر ارتفاع",
  },
  default_pump_efficiency: { en: "Pump efficiency (if unknown)", fr: "Rendement de la pompe (si inconnu)", ar: "مردود المضخة (إن لم يُعرف)" },
  nitrogen_in_treated_water: { en: "Nitrogen in the treated water", fr: "Azote dans l'eau traitée", ar: "الأزوت في الماء المعالَج" },
  ammonium_nitrate_n_share: { en: "Nitrogen share of ammonium nitrate", fr: "Part d'azote du nitrate d'ammonium", ar: "نسبة الأزوت في نترات الأمونيوم" },
  fertiliser_price: { en: "Fertiliser price (ammonium nitrate)", fr: "Prix de l'engrais (nitrate d'ammonium)", ar: "سعر السماد (نترات الأمونيوم)" },
  treated_water_price: { en: "Treated-water price", fr: "Prix de l'eau traitée", ar: "سعر الماء المعالَج" },
  availability_factor: { en: "Usable share of the fertiliser", fr: "Part utilisable de l'engrais", ar: "الحصة القابلة للاستعمال من السماد" },
  qatra_fee_pct: { en: "QATRA's share of the saving", fr: "Part de QATRA sur l'économie", ar: "حصة قطرة من الوفر" },
  irrigation_days: { en: "Irrigation days per season", fr: "Jours d'irrigation par saison", ar: "أيام الري في الموسم" },
  seasons_per_year: { en: "Seasons per year", fr: "Saisons par an", ar: "المواسم في السنة" },
};
export const assumptionName = (a: SavingsAssumption, lang: Lang) => NAMES[a.name]?.[lang] ?? a.name;

/** "0.5, share (0..1)" is shown as "50 %"; other units are kept (TND/kg, mg/L ...). */
export function assumptionValue(a: SavingsAssumption, lang: Lang): string {
  if (a.unit.startsWith("share")) return `${fmtN(a.value * 100, lang, 1)} %`;
  if (a.unit.startsWith("%")) return `${fmtN(a.value, lang, 1)} %`;
  if (a.unit === "days/season") return `${fmtN(a.value, lang, 0)} ${{ en: "days", fr: "jours", ar: "يوم" }[lang]}`;
  if (a.unit === "seasons/year") return `${fmtN(a.value, lang, 0)} ${{ en: "per year", fr: "par an", ar: "في السنة" }[lang]}`;
  return `${fmtN(a.value, lang, a.value < 0.1 ? 5 : a.value < 1 ? 4 : 3)} ${a.unit}`;
}

/** Status words and tone. TO_VERIFY is the one that must never be hidden. */
export const STATUS: Record<TagStatus, { label: Tr; tone: Tone }> = {
  REPORTED: { label: { en: "Reported", fr: "Rapporté", ar: "مُبلَّغ عنه" }, tone: "ok" },
  ESTIMATE: { label: { en: "Estimate", fr: "Estimation", ar: "تقدير" }, tone: "neutral" },
  PROJECTION: { label: { en: "Projection", fr: "Projection", ar: "توقّع" }, tone: "neutral" },
  SIMULATED: { label: { en: "Simulated", fr: "Simulé", ar: "محاكى" }, tone: "neutral" },
  TO_VERIFY: { label: { en: "To be verified", fr: "À vérifier", ar: "يجب التحقق منه" }, tone: "warn" },
};
