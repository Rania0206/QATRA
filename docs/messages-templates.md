# Message templates: review by a Tunisian speaker

Generated from `backend/app/engine/messages.py` (`cd backend && python -m app.engine.messages`).
Every Arabic template is marked `needs_human_review: true` until it is approved.
Placeholders: `{farm}` farm name, `{m3}` volume, `{when}` delivery sentence, `{why}` reason, `{crop}`, `{source}` (well, borehole or network), `{tnd}` saving, `{a}`/`{b}` hours.

| # | Use | French | Arabic (Tunisian) |
|---|---|---|---|
| 1 | Water available | Bonjour, {farm}. {m3} m³ d'eau traitée disponibles pour vous.{when} Répondez 1 pour accepter, 2 pour refuser. | مرحبا، {farm}. عندك {m3} م³ من الماء المعالج متوفّرين.{when} جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض. |
| 2 | Water available with a condition | Bonjour, {farm}. {m3} m³ d'eau traitée disponibles, avec une condition : arrosez de façon à laver le sel du sol et surveillez la salinité de votre terre.{when} Répondez 1 pour accepter, 2 pour refuser. | مرحبا، {farm}. عندك {m3} م³ من الماء المعالج، بشرط: اسقي بطريقة تغسل الملح من التربة وراقب ملوحة تربتك.{when} جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض. |
| 3 | Volume limited | Bonjour, {farm}. {m3} m³ d'eau traitée disponibles. Volume limité : {why}.{when} Répondez 1 pour accepter, 2 pour refuser. | مرحبا، {farm}. عندك {m3} م³ من الماء المعالج. الكمية محدودة: {why}.{when} جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض. |
| 4 | Nothing can be delivered | Bonjour, {farm}. Aujourd'hui, nous ne pouvons pas vous livrer d'eau traitée : {why}. C'est une règle de sécurité qui protège la santé de tous, vous compris. Ce n'est en rien un reproche à votre égard. | مرحبا، {farm}. اليوم ما نجموش نبعثولك ماء معالج: {why}. هذا قانون أمان باش نحميو صحة الكل، وانت منهم. موش غلطة منك. |
| 5 | Delivery time |  Livraison demain de {a} à {b}. |  التسليم غدوة من {a} إلى {b}. |
| 6 | Delivery time unknown |  L'horaire de livraison vous sera confirmé. |  وقت التسليم باش نأكدوه. |
| 7 | Saving line (added only when the savings engine gives a value) |  Environ {tnd} TND économisés cette saison (estimation). |  تقريبًا {tnd} دينار تتوفّر عليك الموسم هذا (تقدير). |
| 8 | Why limited: replaces the farm's own water | vous recevez de l'eau traitée à la place de l'eau de votre {source}, pas en plus | نعطيوك الماء المعالج بدل ماء {source} متاعك، موش زيادة عليه |
| 9 | Why limited: batch shared | l'eau du jour est partagée entre toutes les fermes | ماء اليوم مقسوم بين الضيعات الكل |
| 10 | Why limited: soil salt | pour protéger votre sol du sel | باش نحميو تربتك من الملح |
| 11 | Why limited: other | selon le plan du jour | حسب خطة اليوم |
| 12 | Why blocked: crop eaten raw | la culture « {crop} » se mange crue, et l'eau traitée ne peut pas l'arroser | {crop} تتاكل نيّة، وما تتسقاش بالماء المعالج |
| 13 | Why blocked: crop not on the allowed list | la culture « {crop} » n'est pas sur la liste des cultures autorisées avec l'eau traitée | {crop} موش في قائمة الزراعات المسموح بيها بالماء المعالج |
| 14 | Why blocked: lab analysis | l'analyse de laboratoire de l'eau du jour est trop ancienne ou manque | تحليل المخبر متاع ماء اليوم قديم ولا ناقص |
| 15 | Why blocked: quality limit | l'eau du jour n'a pas passé tous les contrôles de qualité | ماء اليوم ما عدّاش كل فحوصات الجودة |
| 16 | Why blocked: direct grazing | le pâturage direct est interdit sur les terres arrosées d'eau traitée | الرعي المباشر ممنوع في الأرض اللي تتسقى بالماء المعالج |
| 17 | Why blocked: other | la règle de sécurité ne le permet pas aujourd'hui | قانون الأمان ما يسمحش بيه اليوم |

