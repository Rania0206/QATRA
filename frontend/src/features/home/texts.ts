import type { Lang, Tr } from "../../i18n";

/** Landing page texts (English, French, Arabic). Plain words: the readers are farmers and the public. */
export const L = {
  title: {
    en: "Water that is checked before it reaches your field.",
    fr: "Une eau contrôlée avant d'arriver dans votre champ.",
    ar: "ماء يُفحص قبل أن يصل إلى حقلك.",
  },
  lead: {
    en: "Every day the Sousse Sud plant cleans used water. QATRA checks the lab tests, matches the water to each farm, and tells every farmer how much they can use.",
    fr: "Chaque jour, la station de Sousse Sud nettoie des eaux usées. QATRA vérifie les analyses, adapte l'eau à chaque ferme et indique à chaque agriculteur la quantité qu'il peut utiliser.",
    ar: "كل يوم تنقّي محطة سوسة الجنوب مياهًا مستعملة. تراجع قطرة التحاليل، وتطابق الماء مع كل مزرعة، وتخبر كل فلاح بالكمية التي يمكنه استعمالها.",
  },
  ctaFarm: { en: "Check my farm", fr: "Vérifier ma ferme", ar: "افحص مزرعتي" },
  ctaBatches: { en: "See today's batch", fr: "Voir le lot du jour", ar: "شاهد دفعة اليوم" },

  // journey
  journeyTitle: { en: "From the plant to your field", fr: "De la station à votre champ", ar: "من المحطة إلى حقلك" },
  journeyLead: {
    en: "Six steps. If one of them fails, no water leaves the plant.",
    fr: "Six étapes. Si l'une d'elles échoue, aucune eau ne quitte la station.",
    ar: "ست خطوات. إذا فشلت واحدة منها، لا يغادر الماء المحطة.",
  },
  stops: [
    {
      title: { en: "Cleaned at the plant", fr: "Nettoyée à la station", ar: "تُنقّى في المحطة" },
      text: {
        en: "Used water from Zaouiet-Sousse is treated at Sousse Sud. Each day the plant makes a new batch.",
        fr: "Les eaux usées de Zaouiet-Sousse sont traitées à Sousse Sud. Chaque jour, la station produit un nouveau lot.",
        ar: "تُعالج المياه المستعملة لزاوية سوسة في محطة سوسة الجنوب. وتنتج المحطة كل يوم دفعة جديدة.",
      },
    },
    {
      title: { en: "Tested in the lab", fr: "Testée au laboratoire", ar: "تُحلَّل في المخبر" },
      text: {
        en: "A batch needs recent lab tests, and every value must stay inside Tunisian limits. An old or failed test stops it.",
        fr: "Un lot doit avoir des analyses récentes, et chaque valeur doit rester dans les limites tunisiennes. Une analyse trop ancienne ou non conforme l'arrête.",
        ar: "يجب أن تكون تحاليل الدفعة حديثة، وأن تبقى كل قيمة ضمن الحدود التونسية. التحليل القديم أو غير المطابق يوقفها.",
      },
    },
    {
      title: { en: "Matched to each field", fr: "Adaptée à chaque champ", ar: "تُطابَق مع كل حقل" },
      text: {
        en: "Some crops cannot take this water, such as lettuce eaten raw. Salty soil gets a smaller share, so the salt does not build up.",
        fr: "Certaines cultures ne peuvent pas recevoir cette eau, comme la laitue mangée crue. Un sol salé reçoit une part plus petite, pour que le sel ne s'accumule pas.",
        ar: "بعض المحاصيل لا تقبل هذا الماء، مثل الخس الذي يؤكل نيئًا. والتربة المالحة تأخذ حصة أصغر حتى لا يتراكم الملح.",
      },
    },
    {
      title: { en: "Pumped with the sun", fr: "Pompée avec le soleil", ar: "تُضخّ بالشمس" },
      text: {
        en: "The pump runs when the solar panels give the most power. During a power cut it keeps going on sun alone.",
        fr: "La pompe fonctionne quand les panneaux solaires donnent le plus d'énergie. Pendant une coupure, elle continue avec le soleil seul.",
        ar: "تعمل المضخة حين تعطي الألواح الشمسية أكبر قدر من الطاقة. وأثناء انقطاع الكهرباء تواصل العمل بالشمس وحدها.",
      },
    },
    {
      title: { en: "Shared fairly", fr: "Partagée équitablement", ar: "تُوزَّع بإنصاف" },
      text: {
        en: "Each farm gets what its crop needs that day, and never more than the well water it already uses. If there is not enough, everyone gets a fair share.",
        fr: "Chaque ferme reçoit ce dont sa culture a besoin ce jour-là, jamais plus que l'eau de puits qu'elle utilise déjà. S'il n'y en a pas assez, chacun reçoit une part équitable.",
        ar: "تأخذ كل مزرعة ما يحتاجه محصولها في ذلك اليوم، وليس أكثر من ماء البئر الذي تستعمله أصلًا. وإن لم يكفِ الماء، تأخذ كل مزرعة حصة عادلة.",
      },
    },
    {
      title: { en: "Delivered to your farm", fr: "Livrée à votre ferme", ar: "تصل إلى مزرعتك" },
      text: {
        en: "You get the amount and the hours by SMS, and you accept or say no. Every cubic metre of treated water is a cubic metre left in the well.",
        fr: "Vous recevez la quantité et les heures par SMS, et vous acceptez ou refusez. Chaque mètre cube d'eau traitée est un mètre cube laissé dans le puits.",
        ar: "تصلك الكمية والساعات في رسالة قصيرة، وتقبل أو ترفض. وكل متر مكعب من الماء المعالَج هو متر مكعب يبقى في البئر.",
      },
    },
  ] as { title: Tr; text: Tr }[],

  // who it is for
  whoTitle: { en: "Who it is for", fr: "Pour qui", ar: "لمن هذه المنصة" },
  who: [
    {
      title: { en: "Farmers", fr: "Agriculteurs", ar: "الفلاحون" },
      text: {
        en: "Enter your farm code to see if the water is safe for your crop and how much you get each day. The answer also comes by SMS. You only ever see your own farm.",
        fr: "Entrez le code de votre ferme pour savoir si l'eau convient à votre culture et quelle quantité vous recevez chaque jour. La réponse arrive aussi par SMS. Vous ne voyez que votre propre ferme.",
        ar: "أدخل رمز مزرعتك لتعرف هل الماء مناسب لمحصولك وكم تأخذ كل يوم. يصلك الجواب أيضًا في رسالة قصيرة. ولا ترى إلا مزرعتك.",
      },
      link: { en: "Check my farm", fr: "Vérifier ma ferme", ar: "افحص مزرعتي" },
      tab: "compatibility",
    },
    {
      title: { en: "Plant and lab teams", fr: "Équipes de la station et du laboratoire", ar: "فرق المحطة والمخبر" },
      text: {
        en: "See each day's batch, its lab tests and which farms can receive it. Follow the plan for the day and the pump hours.",
        fr: "Consultez le lot de chaque jour, ses analyses et les fermes qui peuvent le recevoir. Suivez le plan du jour et les heures de pompage.",
        ar: "اطّلع على دفعة كل يوم وتحاليلها والمزارع التي يمكنها استلامها. وتابع خطة اليوم وساعات الضخ.",
      },
      link: { en: "See the batches", fr: "Voir les lots", ar: "شاهد الدفعات" },
      tab: "batches",
    },
    {
      title: { en: "Everyone else", fr: "Tout le monde", ar: "الجميع" },
      text: {
        en: "Every number shows where it comes from and what we assumed. Nothing is hidden, so you can judge it yourself.",
        fr: "Chaque chiffre indique d'où il vient et ce que nous avons supposé. Rien n'est caché : vous pouvez en juger vous-même.",
        ar: "كل رقم يبيّن مصدره وما افترضناه. لا شيء مخفي، فتحكم بنفسك.",
      },
      link: { en: "Read the sources", fr: "Lire les sources", ar: "اقرأ المصادر" },
      tab: "public",
    },
  ] as { title: Tr; text: Tr; link: Tr; tab: string }[],

  // power cut
  cutTitle: {
    en: "When the power goes out, the water keeps flowing.",
    fr: "Quand le courant s'arrête, l'eau continue de couler.",
    ar: "حين ينقطع التيار، يواصل الماء جريانه.",
  },
  cutText: {
    en: "On a hot day with a power cut, farms can wait hours for water. QATRA fills the basin with solar power in advance, so irrigation carries on.",
    fr: "Un jour de forte chaleur avec coupure de courant, les fermes peuvent attendre l'eau pendant des heures. QATRA remplit le bassin à l'avance avec l'énergie solaire, et l'irrigation continue.",
    ar: "في يوم حارّ مع انقطاع الكهرباء قد تنتظر المزارع الماء ساعات. تملأ قطرة الحوض مسبقًا بالطاقة الشمسية، فيستمر الري.",
  },
  cutLink: { en: "See the hottest day of summer 2026", fr: "Voir le jour le plus chaud de l'été 2026", ar: "شاهد أحرّ يوم في صيف 2026" },

  // closing
  endTitle: { en: "Look at the water for yourself.", fr: "Voyez l'eau par vous-même.", ar: "شاهد الماء بنفسك." },
  endNote: {
    en: "This is a demo built on simulated data inspired by Zaouiet-Sousse. It is not real operations.",
    fr: "Ceci est une démo construite sur des données simulées inspirées de Zaouiet-Sousse. Ce ne sont pas des opérations réelles.",
    ar: "هذا عرض تجريبي مبني على بيانات محاكاة مستوحاة من زاوية سوسة. وليست عمليات حقيقية.",
  },
  ctaSources: { en: "How we count", fr: "Comment nous comptons", ar: "كيف نحسب" },
};

/** "The latest batch, from 29 Aug 2026, holds 1,500 m³." */
export const latestLine = (date: string, volume: string, lang: Lang): string =>
  ({
    en: `The latest batch, from ${date}, holds ${volume} m³.`,
    fr: `Le dernier lot, du ${date}, contient ${volume} m³.`,
    ar: `آخر دفعة، بتاريخ ${date}، تحتوي ${volume} م³.`,
  })[lang];
