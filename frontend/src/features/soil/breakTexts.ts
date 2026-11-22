import type { Tr } from "../../i18n";

export const BK = {
  eyebrow: { en: "Judge demo", fr: "Démo jury", ar: "عرض للجنة" },
  title: { en: "Break it: make the soil saltier", fr: "Cassez-le : rendez le sol plus salé", ar: "جرّبوا كسره: اجعلوا التربة أكثر ملوحة" },
  help: {
    en: "Raise the soil salinity of farm {farm}. The 30-year curves below and the water plan are computed again at once. If the soil is already too salty for its crop, the farm gets no water and the others share it.",
    fr: "Augmentez la salinité du sol de la ferme {farm}. Les courbes sur 30 ans ci-dessous et le plan d'eau sont recalculés aussitôt. Si le sol est déjà trop salé pour sa culture, la ferme ne reçoit plus d'eau et les autres se partagent la sienne.",
    ar: "ارفعوا ملوحة تربة الضيعة {farm}. تُحسب من جديد المنحنيات على 30 سنة وخطة الماء فورًا. إذا صارت التربة مالحة جدًّا لزراعتها، لا تحصل الضيعة على ماء وتتقاسمه الضيعات الأخرى.",
  },
  mock: {
    en: "Mock data: the slider only changes the plan with the real server.",
    fr: "Données de démo : le curseur ne change le plan qu'avec le vrai serveur.",
    ar: "بيانات تجريبية: لا يغيّر المنزلق الخطة إلا مع الخادم الحقيقي.",
  },
  slider: { en: "Soil salinity, farm {farm}", fr: "Salinité du sol, ferme {farm}", ar: "ملوحة تربة الضيعة {farm}" },
  reset: { en: "Back to the real value", fr: "Revenir à la vraie valeur", ar: "العودة إلى القيمة الحقيقية" },
  planTitle: { en: "The water plan, re-planned", fr: "Le plan d'eau, refait", ar: "خطة الماء بعد إعادة التخطيط" },
  planHint: {
    en: "Batch {batch} as if it held only {m3} m³ (less than the farms' needs). The Change column compares with the plan before you moved the slider.",
    fr: "Lot {batch} comme s'il ne contenait que {m3} m³ (moins que les besoins des fermes). La colonne Écart compare avec le plan avant le curseur.",
    ar: "الدفعة {batch} كأنها لا تحوي إلا {m3} م³ (أقل من حاجة الضيعات). يقارن عمود الفرق مع الخطة قبل تحريك المنزلق.",
  },
  colFarm: { en: "Farm", fr: "Ferme", ar: "الضيعة" },
  colStatus: { en: "Status", fr: "Statut", ar: "الحالة" },
  colChange: { en: "Change", fr: "Écart", ar: "الفرق" },
  stAllocated: { en: "Allocated", fr: "Alloué", ar: "مخصّص" },
  stConditional: { en: "With a condition", fr: "Sous condition", ar: "بشرط" },
  stCapped: { en: "Limited", fr: "Limité", ar: "محدود" },
  stBlocked: { en: "Blocked", fr: "Bloqué", ar: "ممنوع" },
} satisfies Record<string, Tr>;
