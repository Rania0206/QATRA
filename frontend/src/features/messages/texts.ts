import type { Lang, Tr } from "../../i18n";

export const MS = {
  eyebrow: { en: "Messages to the farmers", fr: "Messages aux agriculteurs", ar: "رسائل إلى الفلاحين" },
  title: {
    en: "What the farmer reads on his phone.",
    fr: "Ce que l'agriculteur lit sur son téléphone.",
    ar: "ما يقرؤه الفلاح على هاتفه.",
  },
  lead: {
    en: "One short message per farm, in French and in Tunisian Arabic: how much water, when, and what to answer. Pick a farm.",
    fr: "Un court message par ferme, en français et en arabe tunisien : combien d'eau, quand, et que répondre. Choisissez une ferme.",
    ar: "رسالة قصيرة لكل ضيعة، بالفرنسية وبالدارجة التونسية: كم من الماء، ومتى، وبماذا نجيب. اختر ضيعة.",
  },
  farm: { en: "Farm", fr: "Ferme", ar: "الضيعة" },
  language: { en: "Language of the messages", fr: "Langue des messages", ar: "لغة الرسائل" },
  both: { en: "FR + AR", fr: "FR + AR", ar: "FR + AR" },
  mockup: {
    en: "Mockup: no real message is sent.",
    fr: "Maquette : aucun message réel n'est envoyé.",
    ar: "نموذج تجريبي: لا تُرسل أي رسالة حقيقية.",
  },
  passport: { en: "View water passport", fr: "Voir le passeport de l'eau", ar: "عرض جواز الماء" },
  accept: { en: "Accept", fr: "Accepter", ar: "قبول" },
  refuse: { en: "Refuse", fr: "Refuser", ar: "رفض" },
  replyHint: { en: "Reply with a tap:", fr: "Répondre d'un geste :", ar: "الجواب بلمسة:" },
  noReplyNeeded: { en: "Nothing to answer: no water is offered today.", fr: "Rien à répondre : aucune eau n'est proposée aujourd'hui.", ar: "لا شيء للجواب: لا ماء معروض اليوم." },
  review: {
    en: "Arabic text waiting for review by a Tunisian speaker",
    fr: "Texte arabe en attente de relecture par un locuteur tunisien",
    ar: "النص العربي ينتظر مراجعة متحدث تونسي",
  },
  empty: { en: "No message for this farm yet.", fr: "Pas encore de message pour cette ferme.", ar: "لا توجد رسالة لهذه الضيعة بعد." },
  loading: { en: "Loading the messages…", fr: "Chargement des messages…", ar: "جارٍ تحميل الرسائل…" },
  sendError: { en: "The reply could not be sent.", fr: "La réponse n'a pas pu être envoyée.", ar: "تعذّر إرسال الجواب." },
  retry: { en: "Try again", fr: "Réessayer", ar: "حاول مجددًا" },
  contact: { en: "QATRA water service", fr: "Service de l'eau QATRA", ar: "خدمة الماء قطرة" },
} satisfies Record<string, Tr>;

const LOCALE: Record<Lang, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-TN-u-nu-latn" };

/** "20 Nov, 18:00" in the reader's language, Latin digits. */
export const stampOf = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(LOCALE[lang], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
