import type { AllocationItem, FarmCompatibility, Farm } from "../../api/types";
import { fmtMoney, fmtN } from "../../format";
import { FARM, type Lang, type Tr } from "../../i18n";
import { cropName, mainReason } from "../compatibility/format";

export const A = {
  ...FARM,
  eyebrow: { en: "Water plan", fr: "Plan d'eau", ar: "خطة الماء" },
  title: { en: "Today's water plan", fr: "Le plan d'eau du jour", ar: "خطة الماء اليوم" },
  leadAll: {
    en: "Today's water plan: how much treated water each farm receives.",
    fr: "Le plan d'eau du jour : la quantité d'eau traitée que reçoit chaque ferme.",
    ar: "خطة الماء اليوم: كمية الماء المعالَج التي تصل إلى كل مزرعة.",
  },
  leadCode: {
    en: "Enter your farm code to see how much treated water your farm receives today.",
    fr: "Entrez le code de votre ferme pour voir la quantité d'eau traitée que reçoit votre ferme aujourd'hui.",
    ar: "أدخل رمز مزرعتك لترى كمية الماء المعالَج التي تصل إلى مزرعتك اليوم.",
  },
  leadOwn: {
    en: "How much treated water your farm receives today.",
    fr: "La quantité d'eau traitée que reçoit votre ferme aujourd'hui.",
    ar: "كمية الماء المعالَج التي تصل إلى مزرعتك اليوم.",
  },
  planFor: { en: "Plan for", fr: "Plan du", ar: "خطة يوم" },
  mockNote: {
    en: "Mock mode: sample plan, not today's real one.",
    fr: "Mode maquette : plan d'exemple, pas celui du jour.",
    ar: "وضع تجريبي: خطة نموذجية وليست خطة اليوم الحقيقية.",
  },
  privacy: { en: "Only your farm is shown here.", fr: "Seule votre ferme est affichée ici.", ar: "لا تُعرض هنا إلا مزرعتك." },
  opBanner: {
    en: "Operator view: private data of ALL farms. Demo only; a real version needs a login.",
    fr: "Vue opérateur : données privées de TOUTES les fermes. Démo uniquement ; une vraie version demandera une connexion.",
    ar: "عرض المشغّل: بيانات خاصة بكل المزارع. للعرض التجريبي فقط؛ النسخة الحقيقية تتطلب تسجيل الدخول.",
  },
  opBack: { en: "Back to the farmer view", fr: "Retour à la vue agriculteur", ar: "العودة إلى عرض الفلاح" },
  yourFarm: { en: "Your farm", fr: "Votre ferme", ar: "مزرعتك" },
  waterToday: { en: "Water today", fr: "Eau du jour", ar: "ماء اليوم" },
  savedToday: { en: "Saved today", fr: "Économisé aujourd'hui", ar: "الوفر اليوم" },
  estimate: { en: "estimate", fr: "estimation", ar: "تقدير" },
  projection: { en: "projection", fr: "projection", ar: "توقّع" },
  m3: { en: "m³", fr: "m³", ar: "م³" },
  tnd: { en: "TND", fr: "TND", ar: "TND" },
  // summary strip (operator)
  sumShared: { en: "Water shared", fr: "Eau répartie", ar: "الماء الموزَّع" },
  sumReplaced: { en: "Well water saved", fr: "Eau de puits économisée", ar: "ماء الآبار الموفَّر" },
  sumSolar: { en: "Solar energy", fr: "Énergie solaire", ar: "الطاقة الشمسية" },
  sumEnergy: { en: "Pumping energy", fr: "Énergie de pompage", ar: "طاقة الضخ" },
  sumMoney: { en: "Farmers save", fr: "Gain des agriculteurs", ar: "وفر الفلاحين" },
  // reasons
  full: { en: "Your full daily need is covered.", fr: "Votre besoin du jour est entièrement couvert.", ar: "حاجتك اليومية مغطّاة بالكامل." },
  noNeed: {
    en: "No water is needed today.",
    fr: "Pas besoin d'eau aujourd'hui.",
    ar: "لا حاجة إلى الماء اليوم.",
  },
  soil: {
    en: "Limited because of the soil salt.",
    fr: "Limité à cause du sel du sol.",
    ar: "محدود بسبب ملوحة التربة.",
  },
  rebound: {
    en: "Limited to the well water you already use each day, so total water use does not grow.",
    fr: "Limité à l'eau de puits que vous utilisez déjà chaque jour, pour que la consommation totale n'augmente pas.",
    ar: "محدود بمقدار ماء البئر الذي تستعمله يوميًا، حتى لا يزداد الاستهلاك الكلي للماء.",
  },
  shared: {
    en: "Shared fairly: there is less water than all farms need.",
    fr: "Réparti équitablement : il y a moins d'eau que les fermes n'en demandent.",
    ar: "توزيع عادل: الماء أقل مما تحتاجه كل المزارع.",
  },
  blockedGeneric: {
    en: "Not allowed: the rules do not allow this water on this farm.",
    fr: "Interdit : les règles n'autorisent pas cette eau sur cette ferme.",
    ar: "ممنوع: القواعد لا تسمح بهذا الماء في هذه المزرعة.",
  },
  // states
  empty: { en: "There is no water plan for today.", fr: "Il n'y a pas de plan d'eau pour aujourd'hui.", ar: "لا توجد خطة ماء لليوم." },
  noFarmPlan: {
    en: "No water is planned for your farm today.",
    fr: "Aucune eau n'est prévue pour votre ferme aujourd'hui.",
    ar: "لا يوجد ماء مخطَّط لمزرعتك اليوم.",
  },
  notes: { en: "Notes", fr: "Remarques", ar: "ملاحظات" },
  demoTag: { en: "Demo data and estimates", fr: "Données de démonstration et estimations", ar: "بيانات تجريبية وتقديرات" },
  sources: { en: "Sources", fr: "Sources", ar: "المصادر" },
  moneyNote: {
    en: "Money is an estimate: prices not yet checked are marked in the assumptions.",
    fr: "L'argent est une estimation : les prix non vérifiés sont signalés dans les hypothèses.",
    ar: "المبلغ تقدير: الأسعار غير المؤكدة مشار إليها في الافتراضات.",
  },
  // judge controls
  ctlTitle: { en: "Try the demo", fr: "Essayez la démo", ar: "جرّب العرض" },
  ctlScenario: { en: "Scenario", fr: "Scénario", ar: "السيناريو" },
  ctlNormal: { en: "Normal day", fr: "Journée normale", ar: "يوم عادي" },
  ctlOutage: { en: "Power cut", fr: "Coupure de courant", ar: "انقطاع الكهرباء" },
  ctlDay: { en: "Day", fr: "Jour", ar: "اليوم" },
  ctlForecast: { en: "Forecast day", fr: "Jour de prévision", ar: "يوم التوقعات" },
  ctlHeatwave: { en: "Heatwave day", fr: "Jour de canicule", ar: "يوم موجة الحر" },
  ctlOther: { en: "Other day", fr: "Autre jour", ar: "يوم آخر" },
  updating: { en: "Updating…", fr: "Mise à jour…", ar: "جارٍ التحديث…" },
  mockCtl: {
    en: "Mock mode: the controls change the label only; the same sample plan is shown.",
    fr: "Mode maquette : les commandes ne changent que l'intitulé ; le même plan d'exemple est affiché.",
    ar: "وضع تجريبي: الأزرار تغيّر العنوان فقط؛ تظهر نفس الخطة النموذجية.",
  },
  // pump schedule chart
  chartTitle: { en: "When the pump runs", fr: "Quand la pompe fonctionne", ar: "متى تعمل المضخة" },
  chartLead: {
    en: "Each bar is one hour of the day: how much power the pump uses.",
    fr: "Chaque barre est une heure de la journée : la puissance utilisée par la pompe.",
    ar: "كل عمود هو ساعة من اليوم: القدرة التي تستعملها المضخة.",
  },
  hour: { en: "Hour", fr: "Heure", ar: "الساعة" },
  basinLevel: { en: "Basin level", fr: "Niveau du bassin", ar: "مستوى الحوض" },
  source: { en: "Energy", fr: "Énergie", ar: "الطاقة" },
  srcSolar: { en: "Solar", fr: "Solaire", ar: "شمسية" },
  srcGrid: { en: "Grid", fr: "Réseau", ar: "الشبكة" },
  srcBasin: { en: "Basin", fr: "Bassin", ar: "الحوض" },
  solarOnly: { en: "solar only (power cut)", fr: "solaire seul (coupure)", ar: "شمسية فقط (انقطاع)" },
  powerCut: { en: "Power cut", fr: "Coupure", ar: "انقطاع" },
  notPumping: { en: "Not pumping", fr: "À l'arrêt", ar: "متوقفة" },
  noPumping: { en: "The pump does not run today: nothing to pump.", fr: "La pompe ne fonctionne pas aujourd'hui : rien à pomper.", ar: "المضخة لا تعمل اليوم: لا شيء لضخه." },
  chartAria: { en: "Bar chart of the pump's power for each hour of the day", fr: "Histogramme de la puissance de la pompe heure par heure", ar: "مخطط أعمدة لقدرة المضخة في كل ساعة من اليوم" },
} satisfies Record<string, Tr>;

export const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Consecutive pumping hours as ranges: [11,12,13,14] -> [[11, 15]] ("11:00 to 15:00"). */
export function pumpRanges(hours: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const h of [...hours].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last[1] === h) last[1] = h + 1;
    else out.push([h, h + 1]);
  }
  return out;
}

const join = (parts: string[], lang: Lang) => {
  if (parts.length < 2) return parts.join("");
  const comma = lang === "ar" ? "، " : ", ";
  const and = { en: " and ", fr: " et ", ar: " و" }[lang]; // Arabic "and" is written attached to the next word
  return `${parts.slice(0, -1).join(comma)}${and}${parts[parts.length - 1]}`;
};

/** "Your water is pumped between 11:00 and 15:00" (one phrase per block of pumping hours). */
export function pumpLine(hours: number[], lang: Lang): string {
  const parts = pumpRanges(hours).map(([a, b]) =>
    ({ en: `between ${hh(a)} and ${hh(b)}`, fr: `entre ${hh(a)} et ${hh(b)}`, ar: `بين ${hh(a)} و${hh(b)}` })[lang],
  );
  const head = { en: "Your water is pumped", fr: "Votre eau est pompée", ar: "يُضخّ ماؤك" }[lang];
  return `${head} ${join(parts, lang)}.`;
}

// Number formatting lives in one place (src/format.ts); re-exported here for the screens that already import it from this file.
export { fmtMoney, fmtN };

/** The plain sentence under a farm's figures: why the volume is what it is. */
export function reasonText(item: AllocationItem, farm: Farm, compat: FarmCompatibility | undefined, lang: Lang): string {
  if (item.status === "blocked") return compat ? mainReason(compat.results, lang, farm.crop) : A.blockedGeneric[lang];
  const c = item.cap_reason ?? "";
  if (c.includes("soil salinity")) return A.soil[lang];
  if (c.startsWith("anti-rebound")) return A.rebound[lang];
  if (c.startsWith("shared in proportion")) return A.shared[lang];
  return item.m3 <= 0 ? A.noNeed[lang] : A.full[lang];
}

export const farmTitle = (farm: Farm) => farm.name.replace(/^Ferme [A-Z] - /, "");
export const farmSub = (farm: Farm, lang: Lang) => `${cropName(farm.crop, lang)} · ⁦${fmtN(farm.area_ha, lang, 2)} ha⁩`; // isolate "2 ha" so Arabic does not reverse it

// ---- warnings from the server: translated when the text is known, otherwise shown as is
const WARNINGS: { re: RegExp; to: (m: RegExpMatchArray, lang: Lang) => string }[] = [
  {
    re: /^([\d.]+) m3 not sent today: stays at the plant\.$/,
    to: (m, l) =>
      ({
        en: `${fmtN(+m[1], l)} m³ not sent today: stays at the plant.`,
        fr: `${fmtN(+m[1], l)} m³ non envoyés aujourd'hui : restent à la station.`,
        ar: `${fmtN(+m[1], l)} م³ لم تُرسَل اليوم: بقيت في المحطة.`,
      })[l],
  },
  {
    re: /^This batch cannot be reused \((analysis expired|analysis missing|not compliant)\): nothing is sent\.$/,
    to: (m, l) => {
      const why = {
        "analysis expired": { en: "analysis expired", fr: "analyse périmée", ar: "التحليل منتهي الصلاحية" },
        "analysis missing": { en: "analysis missing", fr: "analyse manquante", ar: "التحليل غير موجود" },
        "not compliant": { en: "not compliant", fr: "non conforme", ar: "غير مطابقة" },
      }[m[1] as "analysis expired" | "analysis missing" | "not compliant"][l];
      return {
        en: `This batch cannot be reused (${why}): nothing is sent.`,
        fr: `Ce lot ne peut pas être réutilisé (${why}) : rien n'est envoyé.`,
        ar: `لا يمكن إعادة استعمال هذه الدفعة (${why}): لا يُرسَل شيء.`,
      }[l];
    },
  },
  {
    re: /^Farm ([A-Z0-9]+): its crop is not growing this month, so no water is needed\.$/,
    to: (m, l) =>
      ({
        en: `Farm ${m[1]}: its crop is not growing this month, so no water is needed.`,
        fr: `Ferme ${m[1]} : sa culture ne pousse pas ce mois-ci, donc pas besoin d'eau.`,
        ar: `المزرعة ${m[1]}: محصولها لا ينمو هذا الشهر، لذلك لا حاجة إلى الماء.`,
      })[l],
  },
  {
    re: /^Weather for ([\d-]+): historical data \(not a forecast\)\.$/,
    to: (_m, l) =>
      ({
        en: "The weather for this day is the usual weather of past years, not a forecast.",
        fr: "La météo de ce jour est la météo habituelle des années passées, pas une prévision.",
        ar: "طقس هذا اليوم هو الطقس المعتاد في السنوات الماضية، وليس توقعًا.",
      })[l],
  },
  {
    re: /^([\d.]+) m3 could not be pumped: not enough pumping hours( \(no grid during the outage\))?\.$/,
    to: (m, l) =>
      ({
        en: `${fmtN(+m[1], l)} m³ could not be pumped: not enough pumping hours${m[2] ? " (no grid power during the outage)" : ""}.`,
        fr: `${fmtN(+m[1], l)} m³ n'ont pas pu être pompés : pas assez d'heures de pompage${m[2] ? " (pas de courant du réseau pendant la coupure)" : ""}.`,
        ar: `تعذّر ضخ ${fmtN(+m[1], l)} م³: ساعات الضخ غير كافية${m[2] ? " (لا كهرباء من الشبكة أثناء الانقطاع)" : ""}.`,
      })[l],
  },
  {
    re: /^([\d.]+) m3 could not be pumped: the basin is full/,
    to: (m, l) =>
      ({
        en: `${fmtN(+m[1], l)} m³ could not be pumped: the basin is full.`,
        fr: `${fmtN(+m[1], l)} m³ n'ont pas pu être pompés : le bassin est plein.`,
        ar: `تعذّر ضخ ${fmtN(+m[1], l)} م³: الحوض ممتلئ.`,
      })[l],
  },
  {
    re: /^No PV data for/,
    to: (_m, l) =>
      ({
        en: "No solar data for this day: all pumping counts as grid power.",
        fr: "Pas de données solaires pour ce jour : tout le pompage compte comme courant du réseau.",
        ar: "لا بيانات شمسية لهذا اليوم: كل الضخ يُحتسب من الشبكة.",
      })[l],
  },
];

export function warningText(w: string, lang: Lang): string {
  for (const k of WARNINGS) {
    const m = w.match(k.re);
    if (m) return k.to(m, lang);
  }
  return w;
}

/**
 * A farmer's notes: only what concerns the batch, the weather or HIS farm. Totals and notes about other farms
 * (leftover volume, pumping, "Farm D: ...") stay in the operator view.
 */
export function farmerWarnings(warnings: string[], farmId: string): string[] {
  return warnings.filter((w) => {
    const farm = w.match(/^Farm ([A-Z0-9]+):/);
    if (farm) return farm[1] === farmId;
    return w.startsWith("Batch ") || w.startsWith("Weather for ");
  });
}
