import type { Lang, Tr } from "../../i18n";

export const H = {
  eyebrow: { en: "Summer 2026 heatwave", fr: "Canicule d'été 2026", ar: "موجة حر صيف 2026" },
  title: {
    en: "What a power cut does to irrigation.",
    fr: "Ce qu'une coupure de courant fait à l'irrigation.",
    ar: "ماذا يفعل انقطاع الكهرباء بالري.",
  },
  lead: {
    en: "26 August 2026, 44 °C. The grid is cut in the afternoon. Same farms, same water: one plan irrigates from the grid on demand, the other uses the sun and the storage basin.",
    fr: "26 août 2026, 44 °C. Le réseau est coupé l'après-midi. Mêmes fermes, même eau : un plan irrigue depuis le réseau à la demande, l'autre utilise le soleil et le bassin de stockage.",
    ar: "26 أوت 2026، 44 °م. تنقطع الشبكة بعد الظهر. نفس الضيعات ونفس الماء: خطة تسقي من الشبكة عند الطلب، وأخرى تعتمد على الشمس وحوض التخزين.",
  },
  loading: { en: "Running the two plans…", fr: "Calcul des deux plans…", ar: "جارٍ حساب الخطتين…" },
  without: { en: "Without QATRA", fr: "Sans QATRA", ar: "بدون قطرة" },
  with: { en: "With QATRA", fr: "Avec QATRA", ar: "مع قطرة" },
  hour: { en: "Hour of the day (0–23)", fr: "Heure de la journée (0–23)", ar: "ساعة اليوم (0–23)" },
  pumpAxis: { en: "Pump power (kW)", fr: "Puissance de la pompe (kW)", ar: "قدرة المضخة (كيلوواط)" },
  basinAxis: { en: "Basin level (m³)", fr: "Niveau du bassin (m³)", ar: "مستوى الحوض (م³)" },
  solar: { en: "Solar", fr: "Solaire", ar: "شمسي" },
  grid: { en: "Grid", fr: "Réseau", ar: "الشبكة" },
  basin: { en: "Basin (by gravity)", fr: "Bassin (par gravité)", ar: "الحوض (بالجاذبية)" },
  off: { en: "Off", fr: "Arrêt", ar: "متوقف" },
  basinLine: { en: "Basin level", fr: "Niveau du bassin", ar: "مستوى الحوض" },
  noWater: { en: "No water", fr: "Pas d'eau", ar: "لا ماء" },
  noBasin: { en: "No basin: nothing is stored.", fr: "Pas de bassin : rien n'est stocké.", ar: "لا حوض: لا شيء يُخزَّن." },
  hoursNoWater: { en: "hours without water", fr: "heures sans eau", ar: "ساعات بلا ماء" },
  notDelivered: { en: "m³ not delivered", fr: "m³ non livrés", ar: "م³ غير موزّعة" },
  fromGrid: { en: "kWh from the grid", fr: "kWh du réseau", ar: "ك.و.س من الشبكة" },
  fromSun: { en: "kWh from the sun", fr: "kWh du soleil", ar: "ك.و.س من الشمس" },
  caveat: {
    en: "NASA POWER ~0.5° grid: coastal extremes are smoothed. The outage window is an assumption (no official STEG schedule).",
    fr: "Grille NASA POWER d'environ 0,5° : les extrêmes côtiers sont lissés. La fenêtre de coupure est une hypothèse (pas de calendrier officiel de la STEG).",
    ar: "شبكة NASA POWER بدقة نحو 0.5°: تُخفَّف القيم القصوى الساحلية. نافذة الانقطاع افتراض (لا جدول رسمي للستاغ).",
  },
  notes: { en: "Assumptions and notes", fr: "Hypothèses et notes", ar: "الافتراضات والملاحظات" },
  tooltipSource: { en: "Source", fr: "Source", ar: "المصدر" },
  tooltipDelivered: { en: "Delivered", fr: "Livré", ar: "الموزّع" },
  tooltipDemand: { en: "Demand", fr: "Demande", ar: "الطلب" },
  tooltipBasin: { en: "Basin", fr: "Bassin", ar: "الحوض" },
  pickDay: { en: "Choose a day with a power cut", fr: "Choisissez un jour de coupure", ar: "اختر يومًا فيه انقطاع للكهرباء" },
  counterTitle: { en: "Hours without irrigation", fr: "Heures sans irrigation", ar: "ساعات بلا ري" },
  hourUnit: { en: "h", fr: "h", ar: "س" },
  updating: { en: "Running the day…", fr: "Calcul du jour…", ar: "جارٍ حساب اليوم…" },
  nothingTitle: { en: "No irrigation was planned on this day.", fr: "Aucune irrigation n'était prévue ce jour-là.", ar: "لم يكن هناك ري مبرمج في هذا اليوم." },
  nothingText: {
    en: "The water batch of the day cannot be used (lab analysis out of date, or a legal limit exceeded), so no farm receives any. There is nothing to cut, with or without QATRA.",
    fr: "Le lot d'eau du jour est inutilisable (analyse trop ancienne ou limite légale dépassée) : aucune ferme n'en reçoit. Il n'y a rien à couper, avec ou sans QATRA.",
    ar: "دفعة الماء لهذا اليوم غير صالحة للاستعمال (تحليل قديم أو تجاوز حد قانوني)، فلا تتلقى أي ضيعة شيئًا. لا شيء يُقطع، مع قطرة أو بدونها.",
  },
} satisfies Record<string, Tr>;

/** "17 Jul" / "17 juil." in the reader's language, Latin digits. */
export const shortDate = (iso: string, lang: Lang) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString({ en: "en-GB", fr: "fr-FR", ar: "ar-TN-u-nu-latn" }[lang], { day: "numeric", month: "short" });

export const outageLabel = (a: number, b: number, lang: Lang) =>
  ({ en: `Grid outage ${a}:00–${b}:00`, fr: `Coupure du réseau ${a}h–${b}h`, ar: `انقطاع الشبكة ${a}:00–${b}:00` })[lang];

/** One sentence that says what the two panels show. */
export function heatwaveVerdict(naiveHours: number, qatraHours: number, a: number, b: number, lang: Lang): string {
  const span = `${a}:00–${b}:00`;
  if (naiveHours > 0 && qatraHours === 0)
    return {
      en: `Without QATRA, the farms are left without water for ${naiveHours} hours (${span}). With QATRA, not one: the basin covers the outage and the grid never runs.`,
      fr: `Sans QATRA, les fermes restent ${naiveHours} heures sans eau (${span}). Avec QATRA, aucune : le bassin couvre la coupure et le réseau ne tourne jamais.`,
      ar: `بدون قطرة، تبقى الضيعات ${naiveHours} ساعات بلا ماء (${span}). مع قطرة، ولا ساعة: يغطي الحوض الانقطاع ولا تعمل الشبكة أبدًا.`,
    }[lang];
  if (naiveHours > 0)
    return {
      en: `Without QATRA, ${naiveHours} hours without water; with QATRA, still ${qatraHours}.`,
      fr: `Sans QATRA, ${naiveHours} heures sans eau ; avec QATRA, encore ${qatraHours}.`,
      ar: `بدون قطرة ${naiveHours} ساعات بلا ماء؛ ومع قطرة ما تزال ${qatraHours}.`,
    }[lang];
  return {
    en: "No hour without water on this day, with or without QATRA.",
    fr: "Aucune heure sans eau ce jour-là, avec ou sans QATRA.",
    ar: "لا توجد ساعة بلا ماء في هذا اليوم، مع قطرة أو بدونها.",
  }[lang];
}
