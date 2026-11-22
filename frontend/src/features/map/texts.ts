import type { Tr } from "../../i18n";

export const M = {
  eyebrow: { en: "Zaouiet-Sousse", fr: "Zaouiet-Sousse", ar: "زاوية سوسة" },
  title: { en: "Where the water comes from, and where it goes.", fr: "D'où vient l'eau, et où elle va.", ar: "من أين يأتي الماء، وإلى أين يذهب." },
  lead: {
    en: "Treatment plants, the irrigated area, farmland and the storage basin. Tap a marker or a field for details.",
    fr: "Stations d'épuration, périmètre irrigué, terres agricoles et bassin de stockage. Touchez un repère ou un champ pour les détails.",
    ar: "محطات المعالجة، المنطقة السقوية، الأراضي الفلاحية وحوض التخزين. اضغط على علامة أو حقل لرؤية التفاصيل.",
  },
  layers: { en: "On the map", fr: "Sur la carte", ar: "على الخريطة" },
  onMap: { en: "on the map", fr: "sur la carte", ar: "على الخريطة" },
  noLocation: { en: "no location in the data", fr: "pas de position dans les données", ar: "لا يوجد موقع في البيانات" },
  notDrawn: { en: "Not drawn: no location in the data", fr: "Non dessiné : pas de position dans les données", ar: "غير مرسوم: لا يوجد موقع في البيانات" },
  loading: { en: "Loading the map…", fr: "Chargement de la carte…", ar: "جارٍ تحميل الخريطة…" },
  noLayers: { en: "The API returned no map layers.", fr: "L'API n'a renvoyé aucune couche.", ar: "لم تُرجع الواجهة أي طبقة." },
  plantsDown: { en: "Plant details unavailable", fr: "Détails des stations indisponibles", ar: "تفاصيل المحطات غير متوفرة" },
  tilesFailed: {
    en: "The background map could not be loaded (offline?). The QATRA layers are still shown.",
    fr: "Le fond de carte n'a pas pu être chargé (hors ligne ?). Les couches QATRA restent affichées.",
    ar: "تعذّر تحميل خلفية الخريطة (لا اتصال؟). تبقى طبقات قطرة ظاهرة.",
  },
  satellite: { en: "Satellite", fr: "Satellite", ar: "قمر صناعي" },
  streets: { en: "Street map", fr: "Plan des rues", ar: "خريطة الشوارع" },
  farm: { en: "Farm", fr: "Ferme", ar: "مزرعة" },
  capacity: { en: "Capacity", fr: "Capacité", ar: "السعة" },
  unknown: { en: "unknown", fr: "inconnue", ar: "غير معروفة" },
  perDay: { en: "m³/day", fr: "m³/jour", ar: "م³/يوم" },
  capacityNote: {
    en: "Treatment capacity, not the volume available to farmers.",
    fr: "Capacité de traitement, pas le volume disponible pour les agriculteurs.",
    ar: "طاقة المعالجة، وليست الحجم المتاح للفلاحين.",
  },
  treatment: { en: "Treatment level", fr: "Niveau de traitement", ar: "مستوى المعالجة" },
  serves: { en: "Serves", fr: "Dessert", ar: "تزوّد" },
  crop: { en: "Crop", fr: "Culture", ar: "الزراعة" },
  landUse: { en: "Land use", fr: "Occupation du sol", ar: "استعمال الأرض" },
  area: { en: "Area", fr: "Surface", ar: "المساحة" },
  equipped: { en: "equipped", fr: "équipés", ar: "مجهّزة" },
  fedBy: { en: "fed by", fr: "alimenté par", ar: "تُغذّيها" },
  distributed: { en: "distributed", fr: "distribués", ar: "موزّعة" },
} satisfies Record<string, Tr>;

/** Layer names by id; unknown layers fall back to the label sent by the API. */
export const LAYER_LABEL: Record<string, Tr> = {
  plants: { en: "Treatment plants", fr: "Stations d'épuration", ar: "محطات المعالجة" },
  irrigated_areas: { en: "Irrigated area (treated water)", fr: "Périmètre irrigué (eau traitée)", ar: "المنطقة السقوية (ماء معالج)" },
  osm_plants: { en: "Other plants near Sousse", fr: "Autres stations près de Sousse", ar: "محطات أخرى قرب سوسة" },
  farmland: { en: "Farmland", fr: "Terres agricoles", ar: "الأراضي الفلاحية" },
  farms: { en: "Demo farms", fr: "Fermes de démonstration", ar: "مزارع تجريبية" },
  basin: { en: "Storage basin", fr: "Bassin de stockage", ar: "حوض التخزين" },
};
