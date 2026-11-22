import type { Tr } from "./i18n";

/** Demo roles: each one only highlights the tabs it would use. It is NOT authentication and blocks nothing. */
export type RoleId = "onas" | "lab" | "crda" | "gda" | "public";

export const ROLES: { id: RoleId; label: Tr; tabs: string[] }[] = [
  { id: "onas", label: { en: "ONAS", fr: "ONAS", ar: "الديوان الوطني للتطهير" }, tabs: ["batches", "allocation", "impact"] },
  { id: "lab", label: { en: "Lab", fr: "Laboratoire", ar: "المخبر" }, tabs: ["batches"] },
  // "territory" is the Business screen; "requests" has no tab yet, so it highlights nothing for now.
  { id: "crda", label: { en: "CRDA", fr: "CRDA", ar: "المندوبية الجهوية للفلاحة" }, tabs: ["compatibility", "map", "territory", "requests"] },
  { id: "gda", label: { en: "GDA", fr: "GDA", ar: "مجمع التنمية الفلاحية" }, tabs: ["messages", "requests"] },
  { id: "public", label: { en: "Public", fr: "Public", ar: "العموم" }, tabs: ["public"] },
];

export const ROLE_IDS = ROLES.map((r) => r.id) as string[];

export const RT = {
  select: { en: "Demo role", fr: "Rôle de démo", ar: "دور تجريبي" },
  none: { en: "All sections", fr: "Toutes les sections", ar: "كل الأقسام" },
  notice: {
    en: "Demo role switch, not a login: it only highlights the sections this role would use. Nothing is blocked.",
    fr: "Sélecteur de rôle de démo, pas une connexion : il met seulement en avant les sections de ce rôle. Rien n'est bloqué.",
    ar: "تبديل دور تجريبي وليس تسجيل دخول: يبرز فقط الأقسام الخاصة بهذا الدور. لا شيء محجوب.",
  },
  relevant: { en: "for this role", fr: "pour ce rôle", ar: "لهذا الدور" },
} satisfies Record<string, Tr>;
