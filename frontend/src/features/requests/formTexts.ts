import type { Tr } from "../../i18n";

/** Texts of the formal request form (EN / FR / AR). The legal references are the ones the rules engine applies (docs/rules.md). */
export const FT = {
  kind: { en: "Official request form", fr: "Formulaire de demande officielle", ar: "استمارة طلب رسمية" },
  docTitle: {
    en: "Request to use treated wastewater for irrigation",
    fr: "Demande d'utilisation d'eaux usées traitées pour l'irrigation",
    ar: "طلب استعمال المياه المستعملة المعالَجة في الري",
  },
  to: { en: "To", fr: "À", ar: "إلى" },
  toValue: {
    en: "The regional agriculture office (CRDA) and the treatment plant operator (ONAS)",
    fr: "Le Commissariat régional au développement agricole (CRDA) et l'exploitant de la station (ONAS)",
    ar: "المندوبية الجهوية للتنمية الفلاحية (CRDA) ومشغّل المحطة (ONAS)",
  },
  dateOfRequest: { en: "Date of the request", fr: "Date de la demande", ar: "تاريخ الطلب" },
  reference: { en: "Reference", fr: "Référence", ar: "المرجع" },
  referenceValue: { en: "Given when the request is submitted", fr: "Attribuée à l'envoi de la demande", ar: "يُسنَد عند إرسال الطلب" },
  basis: { en: "Legal basis", fr: "Base légale", ar: "الأساس القانوني" },
  basisValue: {
    en: "Decree 89-1047 · standard NT 106.03 · order of 21 June 1994",
    fr: "Décret 89-1047 · norme NT 106.03 · arrêté du 21 juin 1994",
    ar: "الأمر 89-1047 · المواصفة NT 106.03 · قرار 21 جوان 1994",
  },
  required: { en: "required", fr: "obligatoire", ar: "إلزامي" },
  optional: { en: "optional", fr: "facultatif", ar: "اختياري" },

  // 1 applicant
  s1: { en: "Applicant", fr: "Demandeur", ar: "مقدّم الطلب" },
  fullName: { en: "Full name", fr: "Nom et prénom", ar: "الاسم واللقب" },
  capacity: { en: "Capacity", fr: "Qualité", ar: "الصفة" },
  capOwner: { en: "Owner of the farm", fr: "Propriétaire de l'exploitation", ar: "مالك الضيعة" },
  capTenant: { en: "Tenant or farm operator", fr: "Locataire ou exploitant", ar: "مستأجر أو مستغِلّ" },
  capGda: { en: "Representative of the farmers' association (GDA)", fr: "Représentant du groupement (GDA)", ar: "ممثّل مجمع التنمية الفلاحية (GDA)" },
  phone: { en: "Telephone", fr: "Téléphone", ar: "الهاتف" },

  // 2 farm and crop
  s2: { en: "Farm and crop", fr: "Exploitation et culture", ar: "الضيعة والزراعة" },
  farm: { en: "Farm", fr: "Exploitation", ar: "الضيعة" },
  crop: { en: "Crop", fr: "Culture", ar: "الزراعة" },
  area: { en: "Area", fr: "Superficie", ar: "المساحة" },
  source: { en: "Fresh water used today", fr: "Eau douce utilisée aujourd'hui", ar: "الماء العذب المستعمل حاليًا" },
  srcWell: { en: "Well", fr: "Puits", ar: "بئر" },
  srcBorehole: { en: "Borehole", fr: "Forage", ar: "فوراج" },
  srcNetwork: { en: "Public network", fr: "Réseau public", ar: "الشبكة العمومية" },
  method: { en: "Irrigation method", fr: "Mode d'irrigation", ar: "طريقة الري" },
  mDrip: { en: "Drip", fr: "Goutte à goutte", ar: "بالتقطير" },
  mSurface: { en: "Surface (furrows, basins)", fr: "Gravitaire (sillons, bassins)", ar: "بالجاذبية (أخاديد، أحواض)" },
  mSprinkler: { en: "Sprinkler", fr: "Aspersion", ar: "بالرش" },
  sprinklerHint: {
    en: "Fruit trees may be irrigated with treated wastewater only without sprinklers (order of 21 June 1994).",
    fr: "Les arbres fruitiers ne peuvent être irrigués avec des eaux usées traitées que sans aspersion (arrêté du 21 juin 1994).",
    ar: "لا يجوز ري الأشجار المثمرة بالمياه المستعملة المعالَجة إلا دون رش (قرار 21 جوان 1994).",
  },
  precheck: { en: "Check against the rules today", fr: "Vérification selon les règles aujourd'hui", ar: "التحقق وفق القواعد اليوم" },
  precheckBlocked: {
    en: "This farm cannot receive treated water, so the request cannot be sent.",
    fr: "Cette exploitation ne peut pas recevoir d'eau traitée : la demande ne peut pas être envoyée.",
    ar: "لا يمكن لهذه الضيعة تلقّي الماء المعالَج، لذلك لا يمكن إرسال الطلب.",
  },
  precheckCare: {
    en: "Allowed with care: the volume may be reduced to protect the soil.",
    fr: "Autorisé avec précaution : le volume peut être réduit pour protéger le sol.",
    ar: "مسموح بحذر: قد يُخفَّض الحجم لحماية التربة.",
  },
  precheckOk: { en: "Allowed by the rules today.", fr: "Autorisé par les règles aujourd'hui.", ar: "مسموح وفق القواعد اليوم." },

  // 3 water requested
  s3: { en: "Water requested", fr: "Eau demandée", ar: "الماء المطلوب" },
  volume: { en: "Volume requested (m³)", fr: "Volume demandé (m³)", ar: "الحجم المطلوب (م³)" },
  from: { en: "Needed from", fr: "Nécessaire à partir du", ar: "مطلوب ابتداءً من" },
  until: { en: "Needed until", fr: "Nécessaire jusqu'au", ar: "مطلوب إلى غاية" },
  volumeNote: {
    en: "The volume may be reduced or refused after the checks (water quality, soil salt, the farm's own need).",
    fr: "Le volume peut être réduit ou refusé après les contrôles (qualité de l'eau, sel du sol, besoin de l'exploitation).",
    ar: "قد يُخفَّض الحجم أو يُرفض بعد التحقق (جودة الماء، ملوحة التربة، حاجة الضيعة).",
  },

  // 4 declarations
  s4: { en: "Declarations", fr: "Déclarations", ar: "التصريحات" },
  decIntro: {
    en: "I declare, on my honour, that:",
    fr: "Je déclare sur l'honneur que :",
    ar: "أصرّح على شرفي بأن:",
  },
  not_eaten_raw: {
    en: "the crop is not a vegetable and is not eaten raw (Decree 89-1047, article 5);",
    fr: "la culture n'est ni maraîchère ni consommée crue (décret 89-1047, article 5) ;",
    ar: "الزراعة ليست خضروات ولا تؤكل نيئة (الأمر 89-1047، الفصل 5)؛",
  },
  no_grazing: {
    en: "no animal will graze directly on the irrigated plot; fodder will be cut and carried (Decree 89-1047, article 6);",
    fr: "aucun animal ne pâturera directement sur la parcelle irriguée ; le fourrage sera fauché puis apporté (décret 89-1047, article 6) ;",
    ar: "لن ترعى أي حيوانات مباشرة في القطعة المسقية؛ وسيُحصد العلف ويُنقل (الأمر 89-1047، الفصل 6)؛",
  },
  crop_on_list: {
    en: "the crop is on the list of crops allowed by the order of 21 June 1994;",
    fr: "la culture figure sur la liste des cultures autorisées par l'arrêté du 21 juin 1994 ;",
    ar: "الزراعة مدرجة ضمن قائمة الزراعات المسموح بها بقرار 21 جوان 1994؛",
  },
  water_limits: {
    en: "I understand that the water must respect standard NT 106.03 and that the lab analyses of the batch must be valid (Decree 89-1047, article 3), and that the request can be refused if they are not;",
    fr: "je comprends que l'eau doit respecter la norme NT 106.03 et que les analyses du lot doivent être valides (décret 89-1047, article 3), et que la demande peut être refusée dans le cas contraire ;",
    ar: "أعلم أن الماء يجب أن يحترم المواصفة NT 106.03 وأن تحاليل الدفعة يجب أن تكون صالحة (الأمر 89-1047، الفصل 3)، وأنه يمكن رفض الطلب إن لم يكن الأمر كذلك؛",
  },
  accuracy: {
    en: "the information in this form is accurate.",
    fr: "les informations de ce formulaire sont exactes.",
    ar: "المعلومات الواردة في هذه الاستمارة صحيحة.",
  },

  // 5 signature
  s5: { en: "Signature", fr: "Signature", ar: "الإمضاء" },
  signedName: { en: "Type your full name to sign", fr: "Saisissez votre nom complet pour signer", ar: "اكتب اسمك الكامل للإمضاء" },
  signNote: {
    en: "Typing your name here has the same value as your signature on this form, for this demo.",
    fr: "Saisir votre nom ici tient lieu de signature sur ce formulaire, pour cette démonstration.",
    ar: "كتابة اسمك هنا تقوم مقام إمضائك على هذه الاستمارة، في هذا العرض التجريبي.",
  },

  // submit and result
  submit: { en: "Submit the request", fr: "Envoyer la demande", ar: "إرسال الطلب" },
  submitting: { en: "Sending…", fr: "Envoi…", ar: "جارٍ الإرسال…" },
  fixErrors: { en: "Please complete the fields marked below.", fr: "Veuillez compléter les champs signalés ci-dessous.", ar: "يرجى استكمال الحقول المشار إليها أدناه." },
  errName: { en: "Enter your full name.", fr: "Saisissez votre nom complet.", ar: "أدخل اسمك الكامل." },
  errVolume: { en: "Enter a volume above 0.", fr: "Saisissez un volume supérieur à 0.", ar: "أدخل حجمًا أكبر من 0." },
  errDates: { en: "Choose the dates; the end cannot be before the start.", fr: "Choisissez les dates ; la fin ne peut pas précéder le début.", ar: "اختر التواريخ؛ لا يمكن أن تسبق النهاية البداية." },
  errDeclarations: { en: "Every declaration must be accepted.", fr: "Toutes les déclarations doivent être acceptées.", ar: "يجب قبول جميع التصريحات." },
  errSign: { en: "Type your full name to sign.", fr: "Saisissez votre nom complet pour signer.", ar: "اكتب اسمك الكامل للإمضاء." },
  errSignMatch: { en: "The signature must match the applicant's name.", fr: "La signature doit correspondre au nom du demandeur.", ar: "يجب أن يطابق الإمضاء اسم مقدّم الطلب." },
  receivedTitle: { en: "Request received", fr: "Demande reçue", ar: "تم استلام الطلب" },
  receivedLead: {
    en: "Your request is pending. The operator will approve or reject it; keep this reference.",
    fr: "Votre demande est en attente. L'opérateur l'approuvera ou la refusera ; conservez cette référence.",
    ar: "طلبك قيد الانتظار. سيوافق عليه المشغّل أو يرفضه؛ احتفظ بهذا المرجع.",
  },
  another: { en: "Send another request", fr: "Envoyer une autre demande", ar: "إرسال طلب آخر" },
  period: { en: "Period", fr: "Période", ar: "المدة" },
  applicant: { en: "Applicant", fr: "Demandeur", ar: "مقدّم الطلب" },
} satisfies Record<string, Tr>;
