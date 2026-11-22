import type { Lang, Tr } from "../../i18n";
import type { SoilSimulation } from "../../api/types";

export const S = {
  eyebrow: { en: "Soil salt", fr: "Sel du sol", ar: "ملوحة التربة" },
  title: { en: "Will your soil stay healthy for 30 years?", fr: "Votre sol restera-t-il sain pendant 30 ans ?", ar: "هل ستبقى تربتك سليمة لمدة 30 سنة؟" },
  lead: {
    en: "Treated water carries a little salt. See what it does to your soil, year after year, with and without a salt plan.",
    fr: "L'eau traitée contient un peu de sel. Voyez ce qu'elle fait à votre sol, année après année, avec et sans plan anti-sel.",
    ar: "الماء المعالج يحمل قليلًا من الملح. اعرف أثره على تربتك سنةً بعد سنة، مع خطة لغسل الملح ودونها.",
  },
  yourCrop: { en: "Your crop", fr: "Votre culture", ar: "زراعتك" },
  simulating: { en: "Simulating 30 years…", fr: "Simulation de 30 ans…", ar: "جارٍ محاكاة 30 سنة…" },
  blockedTitle: { en: "No simulation: not allowed by law", fr: "Pas de simulation : interdit par la loi", ar: "لا توجد محاكاة: ممنوع قانونًا" },
  usual: { en: "Usual irrigation", fr: "Irrigation habituelle", ar: "الري المعتاد" },
  plan: { en: "QATRA plan", fr: "Plan QATRA", ar: "خطة قطرة" },
  year: { en: "Year", fr: "Année", ar: "السنة" },
  axisY: { en: "Soil salt (dS/m)", fr: "Sel du sol (dS/m)", ar: "ملوحة التربة (dS/m)" },
  play: { en: "Play", fr: "Lecture", ar: "تشغيل" },
  pause: { en: "Pause", fr: "Pause", ar: "إيقاف" },
  firstOver: { en: "First year the soil is too salty", fr: "Première année où le sol est trop salé", ar: "أول سنة تصبح فيها التربة مالحة جدًا" },
  waterUsed: { en: "Water used per season", fr: "Eau utilisée par saison", ar: "الماء المستعمل في الموسم" },
  yield30: { en: "Crop yield after 30 years", fr: "Rendement après 30 ans", ar: "المردود بعد 30 سنة" },
  noLoss: { en: "No loss", fr: "Aucune perte", ar: "لا خسارة" },
  yieldNA: { en: "not known for this crop", fr: "inconnu pour cette culture", ar: "غير معروف لهذه الزراعة" },
  basedOn: { en: "Based on water of", fr: "Basé sur l'eau du", ar: "بناءً على ماء" },
  waterSalt: { en: "water salt", fr: "sel de l'eau", ar: "ملوحة الماء" },
  estimate: { en: "Estimate from a simplified salt balance. Soil values are simulated.", fr: "Estimation à partir d'un bilan salin simplifié. Valeurs du sol simulées.", ar: "تقدير بناءً على حساب مبسّط للملح. قيم التربة محاكاة." },
  perSeason: { en: "m³/season", fr: "m³/saison", ar: "م³/الموسم" },
} satisfies Record<string, Tr>;

export const yearText = (y: number | null, years: number, lang: Lang): string =>
  y === null
    ? { en: `Never in ${years} years`, fr: `Jamais en ${years} ans`, ar: `ليس خلال ${years} سنة` }[lang]
    : { en: `Year ${y}`, fr: `Année ${y}`, ar: `السنة ${y}` }[lang];

export const yieldText = (loss: number | null, lang: Lang): string =>
  loss === null ? S.yieldNA[lang] : loss === 0 ? S.noLoss[lang] : { en: `−${loss}% yield`, fr: `−${loss} % de rendement`, ar: `−${loss}٪ من المردود` }[lang];

/** One plain sentence: what happens to the soil with and without the QATRA plan. */
export function soilVerdict(d: SoilSimulation, lang: Lang): { tone: "ok" | "warn" | "bad"; text: string } {
  const n = d.naive.first_year_over;
  const q = d.qatra.first_year_over;
  const yrs = d.years[d.years.length - 1];
  if (q === null && n === null)
    return { tone: "ok", text: { en: `The soil stays healthy for ${yrs} years, with or without a salt plan.`, fr: `Le sol reste sain pendant ${yrs} ans, avec ou sans plan anti-sel.`, ar: `تبقى التربة سليمة ${yrs} سنة، مع خطة لغسل الملح أو دونها.` }[lang] };
  if (q === null)
    return { tone: "ok", text: { en: `With the QATRA plan your soil stays healthy for ${yrs} years. With usual irrigation it gets too salty in year ${n}.`, fr: `Avec le plan QATRA, votre sol reste sain pendant ${yrs} ans. Avec l'irrigation habituelle, il devient trop salé en année ${n}.`, ar: `مع خطة قطرة تبقى تربتك سليمة ${yrs} سنة. ومع الري المعتاد تصبح مالحة جدًا في السنة ${n}.` }[lang] };
  return { tone: "warn", text: { en: `The soil gets too salty in year ${q} even with the QATRA plan (year ${n ?? "–"} with usual irrigation). Choose a more salt-tolerant crop.`, fr: `Le sol devient trop salé en année ${q} même avec le plan QATRA (année ${n ?? "–"} avec l'irrigation habituelle). Choisissez une culture plus tolérante au sel.`, ar: `تصبح التربة مالحة جدًا في السنة ${q} حتى مع خطة قطرة (السنة ${n ?? "–"} مع الري المعتاد). اختر زراعة أكثر تحمّلًا للملح.` }[lang] };
}

export const blockedText = (crop: string, lang: Lang): string =>
  ({
    en: `The law does not allow treated water on ${crop}, so there is no soil simulation.`,
    fr: `La loi n'autorise pas l'eau traitée sur ${crop} : pas de simulation du sol.`,
    ar: `القانون لا يسمح بالماء المعالج على ${crop}، لذلك لا توجد محاكاة للتربة.`,
  })[lang];
