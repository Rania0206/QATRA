import type { Lang } from "./i18n";

/*
 * ONE place for numbers shown to people (money, volumes, energy, percentages).
 * Latin digits everywhere. Thousands: a space in French ("1 157"), a comma in English and Arabic ("1,157"):
 * never a dot as a thousands separator. Arabic uses "ar-EG" for numbers only (ar-TN writes "1.157,5"); dates keep LOCALE in i18n.tsx.
 */
export const NUMBER_LOCALE: Record<Lang, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-EG" };

const tag = (lang: Lang) => `${NUMBER_LOCALE[lang]}-u-nu-latn`;

export function fmtN(v: number, lang: Lang, decimals = 1, fixed = false): string {
  return v.toLocaleString(tag(lang), { minimumFractionDigits: fixed ? decimals : 0, maximumFractionDigits: decimals });
}

/** Money with two decimals ("5.84", "1,157.00"); always shown next to "TND". */
export const fmtMoney = (v: number, lang: Lang) => fmtN(v, lang, 2, true);

/** Short form for chart labels: 3.6M / 3,6 M / 3.6 مليون. */
export function fmtCompact(v: number, lang: Lang): string {
  return new Intl.NumberFormat(tag(lang), { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
