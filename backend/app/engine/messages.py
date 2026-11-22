"""B-08a: messages to the farmers, in French and Tunisian Arabic (Darija).

One outgoing message per farm for the latest allocation (engine/plan.plan), from templates by status:
allocated, conditional, capped, blocked. Rules:

- Every number in a message is a value of the Allocation (the m3 of the farm, the delivery hours of its schedule) or the
  saving returned by Dev A's savings engine (engine/savings.py). Nothing is computed or invented here.
- The saving line "About X TND saved" is added only when a saving value is passed for the farm, is above 0 and the farm is
  not blocked. The value is printed exactly as returned.
- A blocked message gives the reason in simple words, puts safety first and never blames the farmer. It has no volume and
  no money.
- LANGUAGE: sim_farms has no language column, so both languages are always sent (French + Arabic). `lang` can ask for
  one of them ("fr", "ar") but the default is "fr+ar".
- ARABIC: written in Tunisian dialect. EVERY Arabic template carries needs_human_review = True until a Tunisian speaker
  has approved it. Run `python -m app.engine.messages` to print all the templates for that review.

Replies from the farmers are kept in memory only (no database), until the application restarts.
"""
import threading
from datetime import date as _date
from datetime import datetime, timedelta
from typing import Any, Optional

from app.engine.farms import get_farm
from app.engine.needs import forecast_dates
from app.engine.plan import plan
from app.engine.savings import savings
from app.schemas import Allocation, Farm, ScheduleSlot

DEFAULT_LANG = "fr+ar"
SAVING_FIELD = "farmer_net_tnd"  # what the farmer keeps after the QATRA fee (Dev A's savings.season, for this farm)
SEND_HOUR = "18:00:00"  # sent the evening before the delivery: "demain" / "غدوة" is the day of the plan


# ---------------------------------------------------------------- Arabic templates, all to be reviewed
def _ar(text: str) -> dict:
    """An Arabic template: the text and the review marker. Nothing in Arabic is shown as final before a Tunisian speaker approves it."""
    return {"text": text, "needs_human_review": True}


# Placeholders: {farm} {m3} {when} {why} {crop} {source} {tnd}
AR: dict[str, dict] = {
    "allocated": _ar("مرحبا، {farm}. عندك {m3} م³ من الماء المعالج متوفّرين.{when} جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض."),
    "conditional": _ar(
        "مرحبا، {farm}. عندك {m3} م³ من الماء المعالج، بشرط: اسقي بطريقة تغسل الملح من التربة وراقب ملوحة تربتك.{when} "
        "جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض."
    ),
    "capped": _ar("مرحبا، {farm}. عندك {m3} م³ من الماء المعالج. الكمية محدودة: {why}.{when} جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض."),
    "blocked": _ar(
        "مرحبا، {farm}. اليوم ما نجموش نبعثولك ماء معالج: {why}. هذا قانون أمان باش نحميو صحة الكل، وانت منهم. موش غلطة منك."
    ),
    "when": _ar(" التسليم غدوة من {a} إلى {b}."),
    "when_unknown": _ar(" وقت التسليم باش نأكدوه."),
    "saving": _ar(" تقريبًا {tnd} دينار تتوفّر عليك الموسم هذا (تقدير)."),
    # why the volume is limited
    "cap_anti_rebound": _ar("نعطيوك الماء المعالج بدل ماء {source} متاعك، موش زيادة عليه"),
    "cap_sharing": _ar("ماء اليوم مقسوم بين الضيعات الكل"),
    "cap_soil": _ar("باش نحميو تربتك من الملح"),
    "cap_other": _ar("حسب خطة اليوم"),
    # why nothing can be delivered
    "block_raw": _ar("{crop} تتاكل نيّة، وما تتسقاش بالماء المعالج"),
    "block_list": _ar("{crop} موش في قائمة الزراعات المسموح بيها بالماء المعالج"),
    "block_analysis": _ar("تحليل المخبر متاع ماء اليوم قديم ولا ناقص"),
    "block_quality": _ar("ماء اليوم ما عدّاش كل فحوصات الجودة"),
    "block_grazing": _ar("الرعي المباشر ممنوع في الأرض اللي تتسقى بالماء المعالج"),
    "block_other": _ar("قانون الأمان ما يسمحش بيه اليوم"),
}

# ---------------------------------------------------------------- French templates
FR: dict[str, str] = {
    "allocated": "Bonjour, {farm}. {m3} m³ d'eau traitée disponibles pour vous.{when} Répondez 1 pour accepter, 2 pour refuser.",
    "conditional": (
        "Bonjour, {farm}. {m3} m³ d'eau traitée disponibles, avec une condition : arrosez de façon à laver le sel du sol "
        "et surveillez la salinité de votre terre.{when} Répondez 1 pour accepter, 2 pour refuser."
    ),
    "capped": "Bonjour, {farm}. {m3} m³ d'eau traitée disponibles. Volume limité : {why}.{when} Répondez 1 pour accepter, 2 pour refuser.",
    "blocked": (
        "Bonjour, {farm}. Aujourd'hui, nous ne pouvons pas vous livrer d'eau traitée : {why}. C'est une règle de sécurité "
        "qui protège la santé de tous, vous compris. Ce n'est en rien un reproche à votre égard."
    ),
    "when": " Livraison demain de {a} à {b}.",
    "when_unknown": " L'horaire de livraison vous sera confirmé.",
    "saving": " Environ {tnd} TND économisés cette saison (estimation).",
    "cap_anti_rebound": "vous recevez de l'eau traitée à la place de l'eau de votre {source}, pas en plus",
    "cap_sharing": "l'eau du jour est partagée entre toutes les fermes",
    "cap_soil": "pour protéger votre sol du sel",
    "cap_other": "selon le plan du jour",
    "block_raw": "la culture « {crop} » se mange crue, et l'eau traitée ne peut pas l'arroser",
    "block_list": "la culture « {crop} » n'est pas sur la liste des cultures autorisées avec l'eau traitée",
    "block_analysis": "l'analyse de laboratoire de l'eau du jour est trop ancienne ou manque",
    "block_quality": "l'eau du jour n'a pas passé tous les contrôles de qualité",
    "block_grazing": "le pâturage direct est interdit sur les terres arrosées d'eau traitée",
    "block_other": "la règle de sécurité ne le permet pas aujourd'hui",
}

CROPS = {  # same names as the farmer screens (frontend features/compatibility/format.ts)
    "alfalfa": ("Luzerne", "الفصّة"), "olive": ("Olivier", "الزيتون"), "lettuce": ("Laitue", "الخسّ"),
    "tomato": ("Tomate", "الطماطم"), "wheat": ("Blé", "القمح"), "barley": ("Orge", "الشعير"),
    "barley_fodder": ("Orge fourragère", "الشعير العلفي"), "oat_fodder": ("Avoine fourragère", "الشوفان العلفي"),
    "citrus_orange": ("Oranger", "البرتقال"), "pomegranate": ("Grenadier", "الرمّان"),
}
SOURCES = {"well": ("puits", "البير"), "borehole": ("forage", "الفوراج"), "network": ("réseau", "الشبكة")}


# ---------------------------------------------------------------- helpers
def _get(obj: Any, key: str, default: Any = None) -> Any:
    return obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)


def fmt_number(x: float, lang: str) -> str:
    """The number as it is (no rounding of its own): 450 -> "450", 70.5 -> "70,5" in French, "70.5" in Arabic."""
    s = f"{float(x):g}"
    return s.replace(".", ",") if lang == "fr" else s


def _hhmm(h: int) -> str:
    return f"{h:02d}:00"


def delivery_window(schedule: list[ScheduleSlot]) -> Optional[tuple[int, int]]:
    """The longest block of consecutive hours in which the allocation's schedule runs the pump, as (first hour, hour after
    the last); the earliest one if several are as long. None if the pump never runs.

    The pump can also run at other hours (a few grid hours outside the block): announcing first-to-last would promise a
    long window that does not exist, so only the main block is announced."""
    hours = sorted(s.hour for s in schedule if s.pump_kw > 0)
    best: tuple[int, int] = (0, 0)
    start = prev = None
    for h in hours + [None]:
        if start is not None and (h is None or h != prev + 1):
            if prev + 1 - start > best[1] - best[0]:
                best = (start, prev + 1)
            start = None
        if h is not None and start is None:
            start = h
        prev = h
    return best if best[1] > best[0] else None


def classify_block(reason: Optional[str]) -> str:
    r = (reason or "").lower()
    if "eaten raw" in r:
        return "block_raw"
    if "allowed crop list" in r:
        return "block_list"
    if "analysis" in r or "analyse" in r:
        return "block_analysis"
    if "nt 106.03" in r or "limit" in r or "above" in r:
        return "block_quality"
    if "grazing" in r:
        return "block_grazing"
    return "block_other"


def classify_cap(reason: Optional[str]) -> str:
    r = (reason or "").lower()
    if "anti-rebound" in r:
        return "cap_anti_rebound"
    if "shared in proportion" in r:
        return "cap_sharing"
    if "soil salinity" in r:
        return "cap_soil"
    return "cap_other"


def _crop(crop: str, lang: str) -> str:
    fr, ar = CROPS.get(crop, (crop.replace("_", " ").capitalize(),) * 2)
    return fr if lang == "fr" else ar


def _source(farm: Optional[Farm], lang: str) -> str:
    fr, ar = SOURCES.get(getattr(farm, "fresh_source", ""), ("puits", "البير"))
    return fr if lang == "fr" else ar


def _template(key: str, lang: str) -> str:
    return FR[key] if lang == "fr" else AR[key]["text"]


# ---------------------------------------------------------------- one message
def render(item: Any, farm: Optional[Farm], lang: str = DEFAULT_LANG, saving_tnd: Optional[float] = None,
           window: Optional[tuple[int, int]] = None) -> dict:
    """Message of one allocation item for one farm: {text_fr, text_ar, needs_human_review} (only the languages asked).

    item: an AllocationItem (or a dict with farm_id, status, m3, cap_reason). saving_tnd: the saving returned by Dev A's
    savings engine for this farm and season, or None. window: delivery hours (first, hour after the last) from the schedule."""
    if lang not in ("fr", "ar", DEFAULT_LANG):
        raise ValueError(f"lang must be 'fr', 'ar' or 'fr+ar', got {lang!r}")
    status, m3, reason = _get(item, "status"), float(_get(item, "m3", 0.0)), _get(item, "cap_reason")
    farm_id = _get(item, "farm_id") or getattr(farm, "id", "?")
    crop = getattr(farm, "crop", "")
    show_saving = saving_tnd is not None and saving_tnd > 0 and status != "blocked"
    out: dict = {}
    for code in ("fr", "ar"):
        if code not in lang:
            continue
        label = f"Ferme {farm_id}" if code == "fr" else f"ضيعة {farm_id}"
        when = (_template("when", code).format(a=_hhmm(window[0]), b=_hhmm(window[1])) if window else _template("when_unknown", code))
        if status == "blocked":
            why = _template(classify_block(reason), code).format(crop=_crop(crop, code))
            text = _template("blocked", code).format(farm=label, why=why)
        else:
            kind = status if status in ("allocated", "conditional", "capped") else "allocated"
            why = _template(classify_cap(reason), code).format(source=_source(farm, code)) if kind == "capped" else ""
            text = _template(kind, code).format(farm=label, m3=fmt_number(m3, code), when=when, why=why)
        if show_saving:
            text += _template("saving", code).format(tnd=fmt_number(saving_tnd, code))
        out[f"text_{code}"] = text
    if "ar" in lang:
        out["needs_human_review"] = True  # every Arabic template is waiting for a Tunisian speaker
    return out


# ---------------------------------------------------------------- the messages of the latest allocation
def _season_saving(alloc: Allocation, farm_id: str, day: Optional[str]) -> Optional[float]:
    """The saving of this farm for the season, exactly as Dev A's savings engine returns it (None if it has none)."""
    report = savings(alloc, None, farm_id, day, "normal")
    if report is None or not report.items:
        return None
    return float(getattr(report.season, SAVING_FIELD))


def outgoing_messages() -> list[dict]:
    """One message per farm for the latest allocation (default batch and day of engine/plan.plan)."""
    alloc = plan()
    if alloc is None:
        return []
    dates = forecast_dates()
    day = dates[0] if dates else None
    sent = (f"{(_date.fromisoformat(day) - timedelta(days=1)).isoformat()}T{SEND_HOUR}" if day else f"1970-01-01T{SEND_HOUR}")
    window = delivery_window(alloc.schedule)
    out = []
    for item in alloc.items:
        farm = get_farm(item.farm_id)
        saving = _season_saving(alloc, item.farm_id, day) if item.status != "blocked" else None
        out.append({"id": f"OUT-{alloc.batch_id}-{item.farm_id}", "farm_id": item.farm_id, "direction": "out", "channel": "sms",
                    "at": sent, **render(item, farm, DEFAULT_LANG, saving, window)})
    return out


# ---------------------------------------------------------------- replies, in memory only
_lock = threading.Lock()
_replies: list[dict] = []


def add_reply(farm_id: str, text: str, at: Optional[str] = None) -> dict:
    with _lock:
        msg = {"id": f"IN-{len(_replies) + 1}", "farm_id": farm_id, "direction": "in", "channel": "sms",
               "at": at or datetime.now().isoformat(timespec="seconds"), "text": text}
        _replies.append(msg)
        return dict(msg)


def reset_replies() -> None:
    with _lock:
        _replies.clear()


def list_messages(farm_id: Optional[str] = None) -> list[dict]:
    """The messages of the latest allocation plus the replies received, oldest first. farm_id: only that farm."""
    with _lock:
        replies = [dict(r) for r in _replies]
    msgs = [*outgoing_messages(), *replies]
    if farm_id is not None:
        msgs = [m for m in msgs if m["farm_id"] == farm_id]
    return sorted(msgs, key=lambda m: (m["at"], m["id"]))


# ---------------------------------------------------------------- review sheet for a Tunisian speaker
def review_markdown() -> str:
    labels = {
        "allocated": "Water available", "conditional": "Water available with a condition", "capped": "Volume limited",
        "blocked": "Nothing can be delivered", "when": "Delivery time", "when_unknown": "Delivery time unknown",
        "saving": "Saving line (added only when the savings engine gives a value)",
        "cap_anti_rebound": "Why limited: replaces the farm's own water", "cap_sharing": "Why limited: batch shared",
        "cap_soil": "Why limited: soil salt", "cap_other": "Why limited: other",
        "block_raw": "Why blocked: crop eaten raw", "block_list": "Why blocked: crop not on the allowed list",
        "block_analysis": "Why blocked: lab analysis", "block_quality": "Why blocked: quality limit",
        "block_grazing": "Why blocked: direct grazing", "block_other": "Why blocked: other",
    }
    lines = ["# Message templates: review by a Tunisian speaker", "",
             "Generated from `backend/app/engine/messages.py` (`cd backend && python -m app.engine.messages`).",
             "Every Arabic template is marked `needs_human_review: true` until it is approved.",
             "Placeholders: `{farm}` farm name, `{m3}` volume, `{when}` delivery sentence, `{why}` reason, `{crop}`, `{source}` (well, borehole or network), `{tnd}` saving, `{a}`/`{b}` hours.",
             "", "| # | Use | French | Arabic (Tunisian) |", "|---|---|---|---|"]
    for i, key in enumerate(AR, 1):
        lines.append(f"| {i} | {labels.get(key, key)} | {FR[key]} | {AR[key]['text']} |")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    print(review_markdown())
