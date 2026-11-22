import type { TagStatus } from "../../api/types";
import type { Lang, Tr } from "../../i18n";

export const Sx = {
  eyebrow: { en: "Sources", fr: "Sources", ar: "المصادر" },
  title: { en: "Sources and assumptions", fr: "Sources et hypothèses", ar: "المصادر والافتراضات" },
  lead: {
    en: "Every number in QATRA is tagged. Here is where each one comes from.",
    fr: "Chaque chiffre de QATRA porte une étiquette. Voici d'où vient chacun.",
    ar: "كل رقم في قطرة له وسم. وهنا مصدر كل واحد منها.",
  },
  englishNote: {
    en: "",
    fr: "Les titres, définitions et noms de sources viennent des données et restent en anglais.",
    ar: "عناوين البيانات وتعريفاتها وأسماء مصادرها تأتي من البيانات وتبقى بالإنجليزية.",
  },
  toAdd: { en: "to be added", fr: "à ajouter", ar: "سيُضاف" },
  open: { en: "open source", fr: "ouvrir la source", ar: "فتح المصدر" },
  noLink: { en: "no public link", fr: "pas de lien public", ar: "لا يوجد رابط عام" },
  year: { en: "Year", fr: "Année", ar: "السنة" },
  provider: { en: "Provider", fr: "Fournisseur", ar: "الجهة" },
  published: { en: "Published", fr: "Publié", ar: "نُشر" },
  // legend
  legendTitle: { en: "What the tags mean", fr: "Ce que veulent dire les étiquettes", ar: "ما معنى الوسوم" },
  // key figures
  keyTitle: { en: "Key figures", fr: "Chiffres clés", ar: "أرقام أساسية" },
  keyLead: {
    en: "The numbers you will hear most, each with its source and year.",
    fr: "Les chiffres que vous entendrez le plus, chacun avec sa source et son année.",
    ar: "الأرقام التي ستسمعها أكثر، كل رقم مع مصدره وسنته.",
  },
  kEquippedOnly: { en: "Equipped for treated water, Tunisia", fr: "Équipés pour l'eau traitée, Tunisie", ar: "المجهّزة للماء المعالَج، تونس" },
  kIrrigated: { en: "Actually irrigated with treated water, Tunisia", fr: "Réellement irrigués à l'eau traitée, Tunisie", ar: "المسقية فعلًا بالماء المعالَج، تونس" },
  kElectricity: { en: "Electricity price used", fr: "Prix de l'électricité utilisé", ar: "سعر الكهرباء المستعمل" },
  kElectricityNote: {
    en: "STEG's average selling price to all customers, not the agricultural tariff (that tariff is still to be found).",
    fr: "Prix moyen de vente de la STEG à tous ses clients, pas le tarif agricole (ce tarif reste à trouver).",
    ar: "متوسط سعر بيع الستاغ لكل الحرفاء، وليس التعريفة الفلاحية (هذه التعريفة ما زالت مطلوبة).",
  },
  millimes: { en: "millimes/kWh", fr: "millimes/kWh", ar: "مليم/كيلوواط·س" },
  // rules
  rulesTitle: { en: "Rules we apply", fr: "Les règles que nous appliquons", ar: "القواعد التي نطبّقها" },
  rulesLead: {
    en: "The law decides whether water can be used. Agronomic advice only guides how to use it.",
    fr: "La loi décide si l'eau peut être utilisée. Le conseil agronomique indique seulement comment l'utiliser.",
    ar: "القانون هو الذي يحدد إن كان يمكن استعمال الماء. أما النصيحة الفلاحية فتوجّه كيفية استعماله فقط.",
  },
  law: { en: "Tunisian law", fr: "Loi tunisienne", ar: "القانون التونسي" },
  advice: { en: "Advice, not law", fr: "Conseil, pas la loi", ar: "نصيحة وليست قانونًا" },
  rules: { en: "rules", fr: "règles", ar: "قواعد" },
  rule: { en: "rule", fr: "règle", ar: "قاعدة" },
  // prices
  pricesTitle: { en: "Prices and assumptions we use", fr: "Prix et hypothèses que nous utilisons", ar: "الأسعار والافتراضات التي نعتمدها" },
  pricesLead: {
    en: "These feed the savings figures. You can change them on the Savings screen.",
    fr: "Ils alimentent les chiffres d'économies. Vous pouvez les modifier dans l'écran Économies.",
    ar: "هذه تغذّي أرقام التوفير. يمكنك تغييرها في شاشة التوفير.",
  },
  toVerifyHint: {
    en: "Highlighted: still to be verified.",
    fr: "En surbrillance : encore à vérifier.",
    ar: "مظلَّل: ما زال يحتاج إلى تحقّق.",
  },
  // datasets
  dataTitle: { en: "Datasets", fr: "Jeux de données", ar: "مجموعات البيانات" },
  dataLead: {
    en: "Every file behind the numbers, grouped by tag.",
    fr: "Chaque fichier derrière les chiffres, regroupé par étiquette.",
    ar: "كل ملف وراء الأرقام، مجمّعًا حسب الوسم.",
  },
  search: { en: "Search datasets", fr: "Chercher un jeu de données", ar: "ابحث في البيانات" },
  searchHint: { en: "Name, provider or id", fr: "Nom, fournisseur ou identifiant", ar: "الاسم أو الجهة أو الرمز" },
  noMatch: { en: "No dataset matches.", fr: "Aucun jeu de données ne correspond.", ar: "لا توجد بيانات مطابقة." },
  catalogStatus: { en: "Catalogue says", fr: "Le catalogue indique", ar: "الفهرس يقول" },
  file: { en: "File", fr: "Fichier", ar: "الملف" },
  scope: { en: "Scope", fr: "Périmètre", ar: "النطاق" },
  other: { en: "Not tagged", fr: "Sans étiquette", ar: "بلا وسم" },
  empty: { en: "Nothing to show yet.", fr: "Rien à afficher pour l'instant.", ar: "لا شيء للعرض بعد." },
} satisfies Record<string, Tr>;

export const LEGEND: { tag: TagStatus; sentence: Tr }[] = [
  { tag: "REPORTED", sentence: { en: "A published figure, with its source.", fr: "Un chiffre publié, avec sa source.", ar: "رقم منشور له مصدره." } },
  { tag: "ESTIMATE", sentence: { en: "Our own calculation or assumption.", fr: "Notre propre calcul ou hypothèse.", ar: "حسابنا أو افتراضنا نحن." } },
  { tag: "SIMULATED", sentence: { en: "Demo data, made up to show how QATRA works.", fr: "Données de démonstration, inventées pour montrer le fonctionnement de QATRA.", ar: "بيانات تجريبية مصطنعة لإظهار طريقة عمل قطرة." } },
  { tag: "PROJECTION", sentence: { en: "What could happen if the assumptions hold.", fr: "Ce qui pourrait arriver si les hypothèses se vérifient.", ar: "ما قد يحدث إذا صحّت الافتراضات." } },
  { tag: "TO_VERIFY", sentence: { en: "To be checked before anyone relies on it.", fr: "À vérifier avant que quiconque s'y fie.", ar: "يجب التحقق منه قبل الاعتماد عليه." } },
];

/** The catalogue writes free text ("REPORTED (incomplete)", "REPORTED / TO_VERIFY"): reduce it to ONE tag. TO_VERIFY wins so it is never hidden. */
export function tagOf(status: string): TagStatus | null {
  const s = status.toUpperCase();
  for (const t of ["TO_VERIFY", "PROJECTION", "SIMULATED", "ESTIMATE", "REPORTED"] as const) if (s.includes(t)) return t;
  return null;
}

/** Plain meaning of each legal reference (matched on the reference text the rules carry). Unknown references are shown as they are. */
const REFS: { re: RegExp; title: Tr; meaning: Tr }[] = [
  {
    re: /^NT 106\.03/,
    title: { en: "NT 106.03: water quality limits", fr: "NT 106.03 : limites de qualité de l'eau", ar: "NT 106.03: حدود جودة الماء" },
    meaning: {
      en: "The limits the water must respect: acidity, salts, oxygen demand, suspended matter, metals and parasite eggs.",
      fr: "Les limites que l'eau doit respecter : acidité, sels, demande en oxygène, matières en suspension, métaux et oeufs de parasites.",
      ar: "الحدود التي يجب أن يحترمها الماء: الحموضة والأملاح والطلب على الأكسجين والمواد العالقة والمعادن وبيض الطفيليات.",
    },
  },
  {
    re: /Art\.3/,
    title: { en: "Decree 89-1047, article 3: lab tests", fr: "Décret 89-1047, article 3 : analyses", ar: "الأمر 89-1047، الفصل 3: التحاليل" },
    meaning: {
      en: "Which lab tests are required and how long each one stays valid.",
      fr: "Quelles analyses sont obligatoires et combien de temps chacune reste valable.",
      ar: "أي التحاليل مطلوبة وكم تبقى كل واحدة صالحة.",
    },
  },
  {
    re: /Art\.5/,
    title: { en: "Decree 89-1047, article 5: crops eaten raw", fr: "Décret 89-1047, article 5 : cultures mangées crues", ar: "الأمر 89-1047، الفصل 5: المزروعات التي تؤكل نيئة" },
    meaning: {
      en: "Vegetables and crops eaten raw cannot be irrigated with treated wastewater.",
      fr: "Les légumes et les cultures mangées crues ne peuvent pas être irrigués avec des eaux usées traitées.",
      ar: "لا يجوز ري الخضروات والمزروعات التي تؤكل نيئة بالمياه المستعملة المعالَجة.",
    },
  },
  {
    re: /Art\.6/,
    title: { en: "Decree 89-1047, article 6: grazing", fr: "Décret 89-1047, article 6 : pâturage", ar: "الأمر 89-1047، الفصل 6: الرعي" },
    meaning: {
      en: "No direct grazing on irrigated plots; fodder must be cut and carried.",
      fr: "Pas de pâturage direct sur les parcelles irriguées ; le fourrage doit être fauché et apporté.",
      ar: "لا رعي مباشر في القطع المسقية؛ ويجب حصد العلف ونقله.",
    },
  },
  {
    re: /1994/,
    title: { en: "Agriculture ministry order of 21 June 1994: allowed crops", fr: "Arrêté du ministre de l'Agriculture du 21 juin 1994 : cultures autorisées", ar: "قرار وزير الفلاحة المؤرخ في 21 جوان 1994: الزراعات المسموح بها" },
    meaning: {
      en: "The list of crops that may be irrigated with treated wastewater.",
      fr: "La liste des cultures qui peuvent être irriguées avec des eaux usées traitées.",
      ar: "قائمة الزراعات التي يجوز ريّها بالمياه المستعملة المعالَجة.",
    },
  },
  {
    re: /FAO/,
    title: { en: "FAO paper 29: soil salt guidance", fr: "Document FAO 29 : conseil sur le sel du sol", ar: "وثيقة الفاو 29: إرشاد حول ملوحة التربة" },
    meaning: {
      en: "How much salt each crop tolerates, so water is used with care. This is advice, not law.",
      fr: "Quelle quantité de sel chaque culture tolère, pour utiliser l'eau avec précaution. C'est un conseil, pas la loi.",
      ar: "كم من الملح تتحمّل كل زراعة، حتى يُستعمل الماء بحذر. هذه نصيحة وليست قانونًا.",
    },
  },
];

export function refInfo(ref: string, lang: Lang): { title: string; meaning: string | null } {
  const k = REFS.find((r) => r.re.test(ref));
  return k ? { title: k.title[lang], meaning: k.meaning[lang] } : { title: ref, meaning: null };
}

/** Order of the legal references on the page. */
export const refOrder = (ref: string) => {
  const i = REFS.findIndex((r) => r.re.test(ref));
  return i < 0 ? REFS.length : i;
};

/** Units as the data writes them (m3, degC) shown with proper signs. */
export const unitText = (u: string) => u.replace(/\bm3\b/g, "m³").replace("degC", "°C");

/** Names of the key figures that come from the catalogue's "safe figures" (the data sends English labels). */
export const SF_LABEL: Record<string, Tr> = {
  SF1: { en: "Treated wastewater produced in Tunisia", fr: "Eaux usées traitées produites en Tunisie", ar: "المياه المستعملة المعالَجة المنتَجة في تونس" },
  SF2: { en: "Treated wastewater used in agriculture", fr: "Eaux usées traitées utilisées en agriculture", ar: "المياه المستعملة المعالَجة المستعملة في الفلاحة" },
  SF3: { en: "Equipped for treated water, Tunisia", fr: "Équipés pour l'eau traitée, Tunisie", ar: "المجهّزة للماء المعالَج، تونس" },
  SF5: { en: "Summer 2026 heat above normal", fr: "Chaleur de l'été 2026 au-dessus de la normale", ar: "حرارة صيف 2026 فوق المعدل" },
};
