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

Replies (B-08c). A farmer answers with 1 (accept), 2 (refuse), 3 (postpone) or 4 (call me); Arabic-Indic digits work too.
Anything else gets a help message and changes nothing. Accept marks the offer confirmed. Refuse gives the volume back: the
allocator (engine/plan.plan, the live function, no HTTP round trip) is run again for the same batch without that farm, the
new allocation is stored and the farms whose volume changed get a new message. A second 2 from the same farm does not
re-plan again. Postpone and call-me are logged, nothing is re-planned. Everything is kept in memory only (no database), until
the application restarts.
"""
import logging
import threading
from datetime import date as _date
from datetime import datetime, timedelta
from typing import Any, Optional

from app.engine.farms import get_farm
from app.engine.needs import forecast_dates
from app.engine.plan import AllocateOptions, plan
from app.engine.savings import savings
from app.schemas import Allocation, AllocationItem, Farm, ScheduleSlot

log = logging.getLogger(__name__)

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

# Placeholders: {farm} {m3} {when} {old} {delta}
FR.update({
    "reply_accept": "Merci, {farm}. Votre volume de {m3} m³ est confirmé.{when}",
    "reply_refuse": "C'est noté, {farm} : vous refusez cette livraison. Nous proposons ce volume aux autres fermes. Merci de nous avoir prévenus.",
    "reply_refuse_again": "Votre refus est déjà enregistré, {farm}. Il n'y a rien d'autre à faire.",
    "reply_closed": "Vous avez refusé cette livraison, {farm}. Si vous changez d'avis, envoyez 4 et un conseiller vous rappelle.",
    "reply_no_offer": "Aucune eau ne vous est proposée aujourd'hui, {farm}. Il n'y a rien à confirmer.",
    "reply_postpone": "C'est noté, {farm} : votre demande de report est enregistrée. Un conseiller reviendra vers vous.",
    "reply_callme": "C'est noté, {farm} : un conseiller vous rappelle.",
    "reply_help": "Message non compris, {farm}. Envoyez 1 pour accepter, 2 pour refuser, 3 pour reporter, 4 pour être rappelé.",
    "update": "Bonne nouvelle, {farm} : +{delta} m³ d'eau traitée ajoutés, soit {m3} m³ au total (avant : {old} m³).{when} Répondez 1 pour accepter, 2 pour refuser.",
})
AR.update({
    "reply_accept": _ar("شكرا، {farm}. كمية {m3} م³ تأكّدت.{when}"),
    "reply_refuse": _ar("مفهوم، {farm}: رفضت التسليم هذا. باش نعرضو الكمية على الضيعات الأخرى. يعطيك الصحة على الخبر."),
    "reply_refuse_again": _ar("رفضك مسجّل من قبل، {farm}. ما عندك حاجة أخرى تعملها."),
    "reply_closed": _ar("رفضت التسليم هذا، {farm}. كان بدّلت رأيك ابعث 4 وواحد من المستشارين يعيّطلك."),
    "reply_no_offer": _ar("ما فماش ماء معروض عليك اليوم، {farm}. ما فما حتى حاجة باش تأكّدها."),
    "reply_postpone": _ar("مفهوم، {farm}: طلب التأجيل تسجّل. واحد من المستشارين باش يرجعلك."),
    "reply_callme": _ar("مفهوم، {farm}: واحد من المستشارين باش يعيّطلك."),
    "reply_help": _ar("ما فهمتش الرسالة، {farm}. ابعث 1 باش تقبل، 2 باش ترفض، 3 باش تأجّل، 4 باش نعيّطولك."),
    "update": _ar("خبر باهي، {farm}: زدناك {delta} م³ ماء معالج، ويولّي عندك {m3} م³ في الكل (قبل: {old} م³).{when} جاوب بـ 1 باش تقبل ولا بـ 2 باش ترفض."),
})

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


# ---------------------------------------------------------------- the allocation state of the day
class _State:
    """The allocation of one batch, as it stands after the farmers' answers."""

    def __init__(self, base: Allocation, day: Optional[str], sent: str):
        self.base = base  # the allocation of the first offers
        self.alloc = base  # the current one: changes when a farm refuses
        self.day, self.sent = day, sent
        self.refused: set[str] = set()
        self.confirmed: set[str] = set()
        self.log: list[dict] = []  # postpone / call-me requests (no re-plan)
        self.offers: list[dict] = []  # the first offer of each farm
        self.extra: list[dict] = []  # system replies and "volume added" messages


_lock = threading.RLock()
_states: dict[str, _State] = {}
_inbox: list[dict] = []  # what the farmers wrote
_seq = {"reply": 0, "update": 0}


def _season_saving(alloc: Allocation, farm_id: str, day: Optional[str]) -> Optional[float]:
    """The saving of this farm for the season, exactly as Dev A's savings engine returns it (None if it has none)."""
    report = savings(alloc, None, farm_id, day, "normal")
    if report is None or not report.items:
        return None
    return float(getattr(report.season, SAVING_FIELD))


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _state_for(batch_id: Optional[str] = None) -> Optional[_State]:
    """The state of the batch (the latest usable batch by default), created from the first allocation on first use."""
    with _lock:
        if batch_id is not None and batch_id in _states:
            return _states[batch_id]
        if batch_id is None and _states:
            return next(iter(_states.values()))
        alloc = plan(batch_id)
        if alloc is None:
            return None
        if alloc.batch_id in _states:
            return _states[alloc.batch_id]
        dates = forecast_dates()
        day = dates[0] if dates else None
        sent = f"{(_date.fromisoformat(day) - timedelta(days=1)).isoformat()}T{SEND_HOUR}" if day else f"1970-01-01T{SEND_HOUR}"
        st = _State(alloc, day, sent)
        window = delivery_window(alloc.schedule)
        for item in alloc.items:
            saving = _season_saving(alloc, item.farm_id, day) if item.status != "blocked" else None
            st.offers.append({"id": f"OUT-{alloc.batch_id}-{item.farm_id}", "farm_id": item.farm_id, "direction": "out", "channel": "sms",
                              "at": sent, "batch_id": alloc.batch_id, "status": item.status,
                              **render(item, get_farm(item.farm_id), DEFAULT_LANG, saving, window)})
        _states[alloc.batch_id] = st
        return st


def current_allocation(batch_id: Optional[str] = None) -> Optional[Allocation]:
    """The allocation as it stands now: the first plan, or the re-plan after a refusal."""
    st = _state_for(batch_id)
    return st.alloc if st else None


def outgoing_messages(batch_id: Optional[str] = None) -> list[dict]:
    """The first offer of each farm for the latest allocation (default batch and day of engine/plan.plan)."""
    st = _state_for(batch_id)
    return [dict(m) for m in st.offers] if st else []


# ---------------------------------------------------------------- the replies
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")  # Arabic-Indic and Persian digits


def parse_choice(text: str) -> Optional[str]:
    """"1" accept, "2" refuse, "3" postpone, "4" call-me. Whitespace, a final full stop or "!" and Arabic-Indic digits are fine;
    anything else (including "12" or "yes") is None."""
    t = (text or "").translate(_DIGITS).strip().rstrip(".!؟?").strip()
    return t if t in ("1", "2", "3", "4") else None


def _system(st: _State, farm_id: str, key: str, item: Optional[AllocationItem] = None, window: Optional[tuple[int, int]] = None) -> dict:
    """A reply of the service to a farmer, in both languages (the Arabic waits for review)."""
    farm_label = {"fr": f"Ferme {farm_id}", "ar": f"ضيعة {farm_id}"}
    out: dict = {}
    for code in ("fr", "ar"):
        when = _template("when", code).format(a=_hhmm(window[0]), b=_hhmm(window[1])) if window else ""
        out[f"text_{code}"] = _template(key, code).format(farm=farm_label[code], m3=fmt_number(item.m3, code) if item else "", when=when)
    _seq["reply"] += 1
    return {"id": f"OUT-REPLY-{_seq['reply']}", "farm_id": farm_id, "direction": "out", "channel": "sms", "at": _now(),
            "batch_id": st.alloc.batch_id, "status": item.status if item else None, "needs_human_review": True, **out}


def _item(alloc: Allocation, farm_id: str) -> Optional[AllocationItem]:
    return next((i for i in alloc.items if i.farm_id == farm_id), None)


def _replan_without(st: _State, farm_id: str) -> list[dict]:
    """The farm refused: run the allocator again for the same batch without it, store the new allocation and return the
    messages of the farms whose volume changed. Uses the live engine function, not an HTTP call."""
    old = st.alloc
    st.refused.add(farm_id)
    eligible = [i.farm_id for i in old.items if i.status != "blocked" and i.farm_id not in st.refused]
    new = plan(old.batch_id, None, "normal", farm_ids=eligible)
    if new is None:  # cannot happen for a batch that already has a plan; keep the old plan and say so
        st.refused.discard(farm_id)
        raise RuntimeError(f"batch {old.batch_id} has no plan any more")
    by_farm = {i.farm_id: i for i in new.items}
    merged = []
    for it in old.items:
        if it.farm_id in by_farm:
            merged.append(by_farm[it.farm_id])
        elif it.farm_id in st.refused:  # refused: nothing delivered, with the reason
            merged.append(AllocationItem(farm_id=it.farm_id, status="capped", m3=0.0, cap_reason="refused by the farmer: the volume goes to the other farms"))
        else:  # blocked by the rules: unchanged, never receives the freed volume
            merged.append(it)
    st.alloc = Allocation(batch_id=new.batch_id, items=merged, schedule=new.schedule, energy_kwh=new.energy_kwh, solar_share=new.solar_share,
                          fresh_replaced_m3=new.fresh_replaced_m3,
                          warnings=[*new.warnings, f"Farm {farm_id} refused its volume: the plan was run again for the other farms."])
    window = delivery_window(new.schedule)
    out = []
    for it in merged:
        before = _item(old, it.farm_id)
        if it.farm_id in st.refused or it.status == "blocked" or before is None or it.m3 - before.m3 <= 0.05:
            continue  # only the farms that got more water are told
        saving = _season_saving(st.alloc, it.farm_id, st.day)
        _seq["update"] += 1
        text = {}
        for code in ("fr", "ar"):
            when = _template("when", code).format(a=_hhmm(window[0]), b=_hhmm(window[1])) if window else _template("when_unknown", code)
            label = f"Ferme {it.farm_id}" if code == "fr" else f"ضيعة {it.farm_id}"
            body = _template("update", code).format(farm=label, delta=fmt_number(round(it.m3 - before.m3, 1), code), m3=fmt_number(it.m3, code),
                                                    old=fmt_number(before.m3, code), when=when)
            if saving is not None and saving > 0:
                body += _template("saving", code).format(tnd=fmt_number(saving, code))
            text[f"text_{code}"] = body
        out.append({"id": f"OUT-{st.alloc.batch_id}-{it.farm_id}-U{_seq['update']}", "farm_id": it.farm_id, "direction": "out", "channel": "sms",
                    "at": _now(), "batch_id": st.alloc.batch_id, "status": it.status, "needs_human_review": True, **text})
    return out


def add_reply(farm_id: str, text: str, at: Optional[str] = None, batch_id: Optional[str] = None) -> dict:
    """A farmer's answer. Stores it, acts on it (1 to 4) and returns the reply of the service (an outgoing message).

    Idempotent: a second 2 from a farm that already refused does not re-plan again."""
    with _lock:
        inbound = {"id": f"IN-{len(_inbox) + 1}", "farm_id": farm_id, "direction": "in", "channel": "sms", "at": at or _now(), "text": text}
        _inbox.append(inbound)
        st = _state_for(batch_id)
        if st is None:
            raise LookupError("no batch to answer about")
        choice, item, window = parse_choice(text), _item(st.alloc, farm_id), delivery_window(st.alloc.schedule)
        has_offer = item is not None and item.status != "blocked" and (item.m3 > 0 or farm_id in st.refused)
        if choice is None:
            key = "reply_help"
        elif choice in ("3", "4"):
            log.info("farm %s asked to %s (batch %s): recorded, nothing re-planned", farm_id, "postpone" if choice == "3" else "be called", st.alloc.batch_id)
            st.log.append({"farm_id": farm_id, "request": "postpone" if choice == "3" else "call-me", "at": inbound["at"]})
            key = "reply_postpone" if choice == "3" else "reply_callme"
        elif not has_offer:
            key = "reply_no_offer"  # a blocked farm, or a farm with no water: nothing to confirm or refuse
        elif choice == "1":
            key = "reply_closed" if farm_id in st.refused else "reply_accept"
            if key == "reply_accept":
                st.confirmed.add(farm_id)
        elif farm_id in st.refused:  # a second 2: already handled
            key = "reply_refuse_again"
        else:
            st.confirmed.discard(farm_id)
            st.extra.extend(_replan_without(st, farm_id))
            key = "reply_refuse"
        reply = _system(st, farm_id, key, item if key == "reply_accept" else None, window if key == "reply_accept" else None)
        st.extra.append(reply)
        return dict(reply)


def reset_replies() -> None:
    """Forget every answer, every re-plan and every state (tests, demo reset)."""
    with _lock:
        _inbox.clear()
        _states.clear()
        _seq.update(reply=0, update=0)


reset_state = reset_replies


def list_messages(farm_id: Optional[str] = None, batch_id: Optional[str] = None) -> list[dict]:
    """The first offers, the farmers' answers, the replies of the service and the "volume added" messages, oldest first.
    farm_id: only that farm."""
    with _lock:
        st = _state_for(batch_id)
        msgs = [*(dict(m) for m in (st.offers if st else [])), *(dict(m) for m in _inbox), *(dict(m) for m in (st.extra if st else []))]
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
        "reply_accept": "Reply to 1: confirmed", "reply_refuse": "Reply to 2: refusal noted", "reply_refuse_again": "Reply to a second 2",
        "reply_closed": "Reply to 1 after a refusal", "reply_no_offer": "Reply when no water is offered (blocked farm)",
        "reply_postpone": "Reply to 3: postpone noted", "reply_callme": "Reply to 4: a counsellor calls", "reply_help": "Reply to anything else: how to answer",
        "update": "Volume added after another farm refused",
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
