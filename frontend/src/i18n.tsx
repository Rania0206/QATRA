import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* One language for the whole app: English, French, Arabic (right-to-left). */

export type Lang = "en" | "fr" | "ar";
export type Tr = Record<Lang, string>;

export const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "fr", label: "FR" },
  { id: "ar", label: "ع" },
];
export const LANG_NAME: Tr = { en: "English", fr: "Français", ar: "العربية" };

export const isRtl = (lang: Lang) => lang === "ar";
export const LOCALE: Record<Lang, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-TN" };

const KEY = "qatra.lang";

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "en" || saved === "fr" || saved === "ar") return saved;
  } catch {
    /* storage blocked: fall back to English */
  }
  return "en";
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* not critical */
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** "29 Aug 2026" in the reader's language (Latin digits everywhere, as used in Tunisia). */
export function fmtDateL(iso: string, lang: Lang): string {
  if (!iso) return "–";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString(LOCALE[lang] + "-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
}

/** Section names, by tab id. Unknown ids fall back to the label given by App.tsx. */
export const TAB_LABEL: Record<string, Tr> = {
  map: { en: "Map", fr: "Carte", ar: "الخريطة" },
  batches: { en: "Batches", fr: "Lots d'eau", ar: "دفعات الماء" },
  compatibility: { en: "Compatibility", fr: "Compatibilité", ar: "الملاءمة" },
  allocation: { en: "Allocation", fr: "Répartition", ar: "التوزيع" },
  savings: { en: "Savings", fr: "Économies", ar: "التوفير" },
  soil: { en: "Soil", fr: "Sol", ar: "التربة" },
  heatwave: { en: "Heatwave", fr: "Canicule", ar: "موجة الحر" },
  messages: { en: "Messages", fr: "Messages", ar: "الرسائل" },
  impact: { en: "Impact", fr: "Impact", ar: "الأثر" },
  territory: { en: "Business", fr: "Modèle économique", ar: "النموذج الاقتصادي" },
  public: { en: "Public (next version)", fr: "Public (prochaine version)", ar: "العموم (النسخة القادمة)" },
};

/** Farm-code form (farmer-facing screens). */
export const FARM = {
  codeLabel: { en: "Your farm code", fr: "Code de votre ferme", ar: "رمز مزرعتك" },
  codeHint: {
    en: "You received it by SMS. Demo codes: A to J.",
    fr: "Vous l'avez reçu par SMS. Codes de démo : A à J.",
    ar: "وصلك في رسالة قصيرة. رموز التجربة: من A إلى J.",
  },
  see: { en: "See my farm", fr: "Voir ma ferme", ar: "عرض مزرعتي" },
  notFound: { en: "No farm with this code.", fr: "Aucune ferme avec ce code.", ar: "لا توجد مزرعة بهذا الرمز." },
  change: { en: "Not your farm? Change", fr: "Pas votre ferme ? Changer", ar: "ليست مزرعتك؟ غيّرها" },
} satisfies Record<string, Tr>;

/** Texts shared by the shell and common components. */
export const C = {
  demo: {
    en: "Demo data: simulated scenario inspired by Zaouiet-Sousse. Not real operations.",
    fr: "Données de démonstration : scénario simulé inspiré de Zaouiet-Sousse. Pas des opérations réelles.",
    ar: "بيانات تجريبية: سيناريو محاكى مستوحى من زاوية سوسة. ليست عمليات حقيقية.",
  },
  safe: { en: "Is this water safe?", fr: "Cette eau est-elle sûre ?", ar: "هل هذا الماء آمن؟" },
  openMenu: { en: "Open menu", fr: "Ouvrir le menu", ar: "فتح القائمة" },
  closeMenu: { en: "Close menu", fr: "Fermer le menu", ar: "إغلاق القائمة" },
  language: { en: "Language", fr: "Langue", ar: "اللغة" },
  area: {
    en: "Sousse Sud plant → Zaouiet-Sousse irrigated area",
    fr: "Station Sousse Sud → périmètre irrigué de Zaouiet-Sousse",
    ar: "محطة سوسة الجنوبية ← المنطقة السقوية بزاوية سوسة",
  },
  tagline: {
    en: "Treated wastewater, safely reused in Tunisian agriculture.",
    fr: "Des eaux usées traitées, réutilisées en toute sécurité dans l'agriculture tunisienne.",
    ar: "مياه مستعملة معالجة، يُعاد استعمالها بأمان في الفلاحة التونسية.",
  },
  close: { en: "Close", fr: "Fermer", ar: "إغلاق" },
  loading: { en: "Loading…", fr: "Chargement…", ar: "جارٍ التحميل…" },
  error: { en: "Something went wrong.", fr: "Un problème est survenu.", ar: "حدث خطأ ما." },
  retry: { en: "Try again", fr: "Réessayer", ar: "حاول مجددًا" },
  comingNext: { en: "Coming next", fr: "Bientôt", ar: "قريبًا" },
  building: {
    en: "This part of QATRA is being built. It will read the endpoints below.",
    fr: "Cette partie de QATRA est en construction. Elle lira les points d'accès ci-dessous.",
    ar: "هذا الجزء من قطرة قيد الإنجاز. سيقرأ نقاط الوصول أدناه.",
  },
} satisfies Record<string, Tr>;
