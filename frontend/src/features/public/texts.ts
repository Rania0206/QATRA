import type { Tr } from "../../i18n";

export const PB = {
  eyebrow: { en: "Public", fr: "Public", ar: "العموم" },
  title: {
    en: "What treated water does for Zaouiet-Sousse.",
    fr: "Ce que l'eau traitée apporte à Zaouiet-Sousse.",
    ar: "ما يقدّمه الماء المعالج لزاوية سوسة.",
  },
  lead: {
    en: "Totals only: no farm name, no phone number. Every number says whether it is reported, estimated or simulated.",
    fr: "Des totaux uniquement : ni nom de ferme, ni numéro de téléphone. Chaque chiffre dit s'il est rapporté, estimé ou simulé.",
    ar: "مجاميع فقط: لا اسم ضيعة ولا رقم هاتف. كل رقم يبيّن إن كان مصرّحًا به أو مقدّرًا أو محاكى.",
  },
  fresh: { en: "of fresh water replaced", fr: "d'eau douce remplacés", ar: "من المياه العذبة تمّ تعويضها" },
  tww: { en: "of treated water allocated", fr: "d'eau traitée allouée", ar: "من الماء المعالج تمّ تخصيصه" },
  solar: { en: "of the pumping on solar power", fr: "du pompage sur énergie solaire", ar: "من الضخّ بالطاقة الشمسية" },
  farms: { en: "farms served", fr: "fermes servies", ar: "ضيعات تمّ تزويدها" },
  blocked: { en: "batches blocked by the checks", fr: "lots bloqués par les contrôles", ar: "دفعات منعتها الفحوص" },
  sourcesEyebrow: { en: "Sources", fr: "Sources", ar: "المصادر" },
  sourcesTitle: { en: "Where the figures come from.", fr: "D'où viennent les chiffres.", ar: "من أين تأتي الأرقام." },
  sourcesLead: {
    en: "The five figures we cite, each with its own definition, status and link. They are never merged: a share of all uses is not a share of agriculture.",
    fr: "Les cinq chiffres que nous citons, chacun avec sa définition, son statut et son lien. Ils ne sont jamais fusionnés : une part tous usages n'est pas une part agricole.",
    ar: "الأرقام الخمسة التي نعتمدها، لكل منها تعريفه وحالته ورابطه. لا تُدمج أبدًا: نسبة كل الاستعمالات ليست نسبة الفلاحة.",
  },
  as_of: { en: "Source dated", fr: "Source datée du", ar: "تاريخ المصدر" },
  open: { en: "Open the source", fr: "Ouvrir la source", ar: "فتح المصدر" },
  loading: { en: "Loading…", fr: "Chargement…", ar: "جارٍ التحميل…" },
} satisfies Record<string, Tr>;
