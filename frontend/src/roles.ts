import type { Tr } from "./i18n";

/*
 * Demo roles. NOT authentication and nothing is blocked (every page still opens from its URL), but a role really changes the app:
 *  - it opens the role's home tab,
 *  - the menu lists only the role's tabs ("All sections" in the header shows everything again),
 *  - operator roles see the all-farms views (Compatibility, Allocation, Savings); the others see one farm at a time.
 */
export type RoleId = "onas" | "lab" | "crda" | "gda" | "public";

interface Role {
  id: RoleId;
  label: Tr;
  about: Tr; // one plain sentence: what this role looks at
  tabs: string[]; // tab ids the menu shows ("territory" is the Business screen, "public" is Sources)
  home: string; // the tab opened when the role is chosen
  operator: boolean; // sees the all-farms views
}

export const ROLES: Role[] = [
  {
    id: "onas",
    label: { en: "ONAS", fr: "ONAS", ar: "الديوان الوطني للتطهير" },
    about: {
      en: "Treatment plant operator: the water batches, today's plan for all farms, the power-cut scenario and the impact.",
      fr: "Exploitant de la station : les lots d'eau, le plan du jour pour toutes les fermes, le scénario de coupure et l'impact.",
      ar: "مشغّل المحطة: دفعات الماء، وخطة اليوم لكل المزارع، وسيناريو انقطاع الكهرباء، والأثر.",
    },
    tabs: ["batches", "allocation", "heatwave", "impact"],
    home: "batches",
    operator: true,
  },
  {
    id: "lab",
    label: { en: "Lab", fr: "Laboratoire", ar: "المخبر" },
    about: {
      en: "The water batches and their analyses.",
      fr: "Les lots d'eau et leurs analyses.",
      ar: "دفعات الماء وتحاليلها.",
    },
    tabs: ["batches"],
    home: "batches",
    operator: false,
  },
  {
    id: "crda",
    label: { en: "CRDA", fr: "CRDA", ar: "المندوبية الجهوية للفلاحة" },
    about: {
      en: "Regional agriculture office: all farms against today's batch, the map, the business case and the farms' requests.",
      fr: "Commissariat régional à l'agriculture : toutes les fermes face au lot du jour, la carte, le modèle économique et les demandes des fermes.",
      ar: "كل المزارع أمام دفعة اليوم، والخريطة، والنموذج الاقتصادي، وطلبات المزارع.",
    },
    tabs: ["compatibility", "map", "territory", "requests"],
    home: "compatibility",
    operator: true,
  },
  {
    id: "gda",
    label: { en: "GDA", fr: "GDA", ar: "مجمع التنمية الفلاحية" },
    about: {
      en: "Farmers' association: the messages sent to farmers and their requests.",
      fr: "Groupement des agriculteurs : les messages envoyés aux agriculteurs et leurs demandes.",
      ar: "مجمع الفلاحين: الرسائل الموجَّهة للفلاحين وطلباتهم.",
    },
    tabs: ["messages", "requests"],
    home: "messages",
    operator: false,
  },
  {
    id: "public",
    label: { en: "Public", fr: "Public", ar: "العموم" },
    about: {
      en: "Citizen: the impact in water, energy and dinars, and where every number comes from.",
      fr: "Citoyen : l'impact en eau, en énergie et en dinars, et d'où vient chaque chiffre.",
      ar: "المواطن: الأثر بالماء والطاقة والدنانير، ومصدر كل رقم.",
    },
    tabs: ["impact", "public"],
    home: "impact",
    operator: false,
  },
];

export const ROLE_IDS = ROLES.map((r) => r.id) as string[];
/** Roles that see every farm in the operator views (the demo's ?view=operator, chosen by role instead of by link). */
export const OPERATOR_ROLES = ROLES.filter((r) => r.operator).map((r) => r.id) as string[];

export const RT = {
  select: { en: "Demo role", fr: "Rôle de démo", ar: "دور تجريبي" },
  none: { en: "All sections", fr: "Toutes les sections", ar: "كل الأقسام" },
  notice: {
    en: "Demo role, not a login: it opens this role's sections and views. Nothing is blocked; choose \"All sections\" to see everything.",
    fr: "Rôle de démo, pas une connexion : il ouvre les sections et les vues de ce rôle. Rien n'est bloqué ; choisissez « Toutes les sections » pour tout voir.",
    ar: "دور تجريبي وليس تسجيل دخول: يفتح أقسام هذا الدور وعروضه. لا شيء محجوب؛ اختر «كل الأقسام» لرؤية كل شيء.",
  },
  relevant: { en: "for this role", fr: "pour ce rôle", ar: "لهذا الدور" },
  allFarms: { en: "All farms view", fr: "Vue de toutes les fermes", ar: "عرض كل المزارع" },
  oneFarm: { en: "One farm at a time", fr: "Une ferme à la fois", ar: "مزرعة واحدة في كل مرة" },
  notMine: {
    en: "This section is not part of this role's work.",
    fr: "Cette section ne fait pas partie du travail de ce rôle.",
    ar: "هذا القسم ليس من عمل هذا الدور.",
  },
  goTo: { en: "Go to", fr: "Aller à", ar: "اذهب إلى" },
} satisfies Record<string, Tr>;
