import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.engine import messages as m
from app.engine.farms import get_farm
from app.main import app
from app.schemas import AllocationItem, Message, ScheduleSlot
from app.store import init_store

MOCK = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks" / "messages.json"


@pytest.fixture(scope="module", autouse=True)
def store():
    init_store()


@pytest.fixture(autouse=True)
def clean_replies():
    m.reset_replies()
    yield
    m.reset_replies()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def item(farm_id="B", status="allocated", m3=450.0, reason=None):
    return AllocationItem(farm_id=farm_id, status=status, m3=m3, cap_reason=reason)


WINDOW = (7, 11)


# ---------------------------------------------------------------- templates by status
def test_allocated_has_the_volume_the_window_and_how_to_answer():
    r = m.render(item(), get_farm("B"), window=WINDOW)
    assert "450 m³" in r["text_fr"] and "07:00 à 11:00" in r["text_fr"] and "Répondez 1" in r["text_fr"] and "2 pour refuser" in r["text_fr"]
    assert "450 م³" in r["text_ar"] and "07:00" in r["text_ar"] and "11:00" in r["text_ar"] and "بـ 1" in r["text_ar"] and "بـ 2" in r["text_ar"]


def test_a_decimal_volume_is_printed_as_it_is():
    r = m.render(item(m3=70.5), get_farm("B"), window=WINDOW)
    assert "70,5 m³" in r["text_fr"] and "70.5 م³" in r["text_ar"]


def test_conditional_says_the_condition_and_the_volume():
    r = m.render(item("A", "conditional", 35.0), get_farm("A"), window=WINDOW)
    assert "35 m³" in r["text_fr"] and "35 م³" in r["text_ar"]
    assert "avec une condition" in r["text_fr"] and "laver le sel" in r["text_fr"] and "salinité" in r["text_fr"]
    assert "بشرط" in r["text_ar"] and "الملح" in r["text_ar"]


@pytest.mark.parametrize("reason,fr,ar", [
    ("anti-rebound: not more than the 103.9 m3/day already taken from the borehole", "à la place de l'eau de votre forage", "ماء الفوراج"),
    ("shared in proportion: the batch is smaller than the total need", "partagée entre toutes les fermes", "الضيعات الكل"),
    ("soil salinity: limited volume (x)", "protéger votre sol du sel", "تربتك من الملح"),
    (None, "selon le plan du jour", "حسب خطة اليوم"),
])
def test_capped_says_why_with_the_volume(reason, fr, ar):
    r = m.render(item("B", "capped", 103.8, reason), get_farm("B"), window=WINDOW)
    assert "103,8 m³" in r["text_fr"] and "103.8 م³" in r["text_ar"]
    assert "Volume limité" in r["text_fr"] and fr in r["text_fr"]
    assert "محدودة" in r["text_ar"] and ar in r["text_ar"]


@pytest.mark.parametrize("reason,fr,ar", [
    ("Lettuce is eaten raw: forbidden (Decree 89-1047 Art. 5)", "se mange crue", "تتاكل نيّة"),
    ("Lettuce is not on the allowed crop list (1994 order)", "liste des cultures autorisées", "قائمة الزراعات"),
    ("Analysis expired (physico-chemical): batch cannot be used (Decree 89-1047 Art. 3)", "analyse de laboratoire", "تحليل المخبر"),
    ("a measured value is above an NT 106.03 limit", "contrôles de qualité", "فحوصات الجودة"),
    ("Direct grazing on this plot: forbidden (Decree 89-1047 Art. 6)", "pâturage direct", "الرعي المباشر"),
    (None, "règle de sécurité", "قانون الأمان"),
])
def test_blocked_says_why_in_simple_words_with_no_volume_and_no_money(reason, fr, ar):
    r = m.render(item("C", "blocked", 0.0, reason), get_farm("C"), window=WINDOW, saving_tnd=500.0)  # even if a saving is passed
    for text in (r["text_fr"], r["text_ar"]):
        assert not re.search(r"\d", text), text  # no volume, no hour, no money: no digit at all
        assert "m3" not in text and "m³" not in text and "م³" not in text and "TND" not in text and "دينار" not in text
    assert fr in r["text_fr"] and ar in r["text_ar"]


def test_blocked_puts_safety_first_and_never_blames_the_farmer():
    r = m.render(item("C", "blocked", 0.0, "Lettuce is eaten raw: forbidden"), get_farm("C"))
    assert "règle de sécurité" in r["text_fr"] and "santé de tous" in r["text_fr"] and "reproche" in r["text_fr"]
    assert "قانون أمان" in r["text_ar"] and "صحة الكل" in r["text_ar"] and "موش غلطة منك" in r["text_ar"]
    for bad in ("faute", "erreur", "infraction", "vous avez"):
        assert bad not in r["text_fr"].lower()


# ---------------------------------------------------------------- the saving line
def test_the_tnd_line_appears_only_when_a_saving_is_passed():
    without = m.render(item(), get_farm("B"), window=WINDOW)
    assert "TND" not in without["text_fr"] and "دينار" not in without["text_ar"]
    with_ = m.render(item(), get_farm("B"), window=WINDOW, saving_tnd=412.35)
    assert "Environ 412,35 TND économisés cette saison (estimation)." in with_["text_fr"]
    assert "412.35 دينار" in with_["text_ar"] and "تقدير" in with_["text_ar"]


def test_the_saving_is_printed_exactly_as_returned_never_computed():
    for v in (876.0, 0.5, 1234.56):
        r = m.render(item(), get_farm("B"), saving_tnd=v)
        assert f"{v:g}".replace(".", ",") + " TND" in r["text_fr"]
        assert f"{v:g}" + " دينار" in r["text_ar"]


@pytest.mark.parametrize("value", [None, 0.0, -12.0])
def test_no_saving_line_when_missing_zero_or_negative(value):
    r = m.render(item(), get_farm("B"), saving_tnd=value)
    assert "TND" not in r["text_fr"] and "دينار" not in r["text_ar"]


# ---------------------------------------------------------------- language and the review marker
def test_both_languages_by_default_and_one_on_request():
    both = m.render(item(), get_farm("B"))
    assert {"text_fr", "text_ar", "needs_human_review"} == set(both)
    fr = m.render(item(), get_farm("B"), "fr")
    assert set(fr) == {"text_fr"}  # no Arabic, so nothing to review
    ar = m.render(item(), get_farm("B"), "ar")
    assert set(ar) == {"text_ar", "needs_human_review"}
    with pytest.raises(ValueError):
        m.render(item(), get_farm("B"), "en")


def test_every_arabic_template_is_marked_for_human_review():
    assert m.AR and set(m.AR) == set(m.FR)  # one Arabic template for each French one
    for key, tpl in m.AR.items():
        assert tpl["needs_human_review"] is True, key
        assert re.search(r"[\u0600-\u06FF]", tpl["text"]), key
    assert m.render(item(), get_farm("B"))["needs_human_review"] is True


def test_the_review_sheet_lists_every_arabic_template():
    md = m.review_markdown()
    for tpl in m.AR.values():
        assert tpl["text"] in md
    assert "needs_human_review" in md


# ---------------------------------------------------------------- the delivery window
def slots(*hours):
    return [ScheduleSlot(hour=h, pump_kw=44.6 if h in hours else 0.0, source="solar" if h in hours else "off", basin_m3=0.0) for h in range(24)]


def test_window_is_the_longest_block_of_pump_hours():
    assert m.delivery_window(slots(6, 11, 12, 13, 14, 18)) == (11, 15)  # not 06:00-19:00
    assert m.delivery_window(slots(7, 8, 9, 10)) == (7, 11)
    assert m.delivery_window(slots(5, 6, 20, 21)) == (5, 7)  # same length: the earliest
    assert m.delivery_window(slots()) is None


def test_no_window_means_no_invented_hours():
    r = m.render(item(), get_farm("B"), window=None)
    assert "L'horaire de livraison vous sera confirmé" in r["text_fr"] and not re.search(r"\d\d:\d\d", r["text_fr"])
    assert "باش نأكدوه" in r["text_ar"]


# ---------------------------------------------------------------- the messages of the latest allocation
def test_one_message_per_farm_with_the_allocation_volumes():
    from app.engine.plan import plan
    alloc = plan()
    msgs = {x["farm_id"]: x for x in m.outgoing_messages()}
    assert set(msgs) == {i.farm_id for i in alloc.items} and len(msgs) == 10
    for it in alloc.items:
        x = msgs[it.farm_id]
        assert x["direction"] == "out" and x["channel"] == "sms" and x["id"] == f"OUT-{alloc.batch_id}-{it.farm_id}"
        if it.status == "blocked":
            assert not re.search(r"\d", x["text_fr"])
        else:
            assert m.fmt_number(it.m3, "fr") + " m³" in x["text_fr"] and m.fmt_number(it.m3, "ar") + " م³" in x["text_ar"]
        assert x["needs_human_review"] is True


def test_an_outgoing_message_knows_its_batch_and_status_for_the_passport_link():
    from app.engine.plan import plan
    alloc = plan()
    for x in m.outgoing_messages():
        assert x["batch_id"] == alloc.batch_id
        assert x["status"] == next(i.status for i in alloc.items if i.farm_id == x["farm_id"])
    assert {x["farm_id"]: x["status"] for x in m.outgoing_messages()}["C"] == "blocked"


def test_the_saving_comes_from_dev_as_savings_engine_for_that_farm_and_season():
    from app.engine.plan import plan
    from app.engine.savings import savings
    alloc = plan()
    msgs = {x["farm_id"]: x for x in m.outgoing_messages()}
    for it in alloc.items:
        report = savings(alloc, None, it.farm_id, None, "normal")
        value = report.season.farmer_net_tnd
        if it.status == "blocked":
            assert "TND" not in msgs[it.farm_id]["text_fr"]
        elif value > 0:
            assert m.fmt_number(value, "fr") + " TND" in msgs[it.farm_id]["text_fr"]
            assert m.fmt_number(value, "ar") + " دينار" in msgs[it.farm_id]["text_ar"]


def test_blocked_farm_c_has_no_volume_and_no_tnd_line():
    c = next(x for x in m.outgoing_messages() if x["farm_id"] == "C")
    assert "laitue" in c["text_fr"].lower() and "الخسّ" in c["text_ar"]
    assert not re.search(r"\d", c["text_fr"]) and "TND" not in c["text_fr"]


# ---------------------------------------------------------------- the endpoints
def test_get_messages_has_the_contract_shape(client):
    r = client.get("/api/messages")
    assert r.status_code == 200
    msgs = [Message.model_validate(x) for x in r.json()]
    assert len(msgs) == 10 and all(x.direction == "out" and x.text_fr and x.text_ar and x.needs_human_review for x in msgs)
    assert [x.at for x in msgs] == sorted(x.at for x in msgs)


def test_filter_by_farm_and_unknown_farm(client):
    only = client.get("/api/messages", params={"farm_id": "B"}).json()
    assert [x["farm_id"] for x in only] == ["B"]
    assert client.get("/api/messages", params={"farm_id": "Z"}).status_code == 404


def test_a_reply_returns_the_service_answer_and_both_are_kept_in_memory(client):
    r = client.post("/api/messages/reply", json={"farm_id": "B", "text": "1"})
    assert r.status_code == 201
    msg = Message.model_validate(r.json())
    assert msg.direction == "out" and msg.farm_id == "B" and "confirmé" in msg.text_fr and msg.needs_human_review
    b = client.get("/api/messages", params={"farm_id": "B"}).json()
    assert [x["direction"] for x in b] == ["out", "in", "out"] and b[1]["text"] == "1"  # offer, the answer, the reply
    assert [x["farm_id"] for x in client.get("/api/messages", params={"farm_id": "A"}).json()] == ["A"]  # another farm: no answer


def test_bad_replies(client):
    assert client.post("/api/messages/reply", json={"farm_id": "Z", "text": "1"}).status_code == 404
    assert client.post("/api/messages/reply", json={"farm_id": "B", "text": ""}).status_code == 422
    assert client.post("/api/messages/reply", json={"farm_id": "B"}).status_code == 422


def test_mock_matches_the_real_shape(client):
    mock = json.loads(MOCK.read_text(encoding="utf-8"))
    for x in mock:
        Message.model_validate(x)
    real_out = [x for x in client.get("/api/messages").json()]
    assert {k for x in mock if x["direction"] == "out" for k in x} == set(real_out[0])  # same keys as a real outgoing message
    assert [x["id"] for x in mock if x["direction"] == "out"] == [x["id"] for x in real_out]


# ================================================================ B-08c: the farmers answer 1 / 2 / 3 / 4
SMALL_BATCH = "SSUD-20260827"  # 700 m3: smaller than the total need, so the sharing binds and a refusal frees water for the others


def volumes(alloc):
    return {i.farm_id: i.m3 for i in alloc.items}


@pytest.fixture
def plan_calls(monkeypatch):
    """Counts the runs of the live allocator (engine/plan.plan) and keeps their arguments."""
    calls = []
    real = m.plan

    def spy(*a, **kw):
        calls.append((a, kw))
        return real(*a, **kw)

    monkeypatch.setattr(m, "plan", spy)
    return calls


@pytest.mark.parametrize("text,expected", [
    ("1", "1"), (" 2 ", "2"), ("3", "3"), ("4", "4"), ("١", "1"), ("٢", "2"), ("٣", "3"), ("٤", "4"), ("۲", "2"),
    ("1.", "1"), ("2!", "2"), ("٢؟", "2"), ("\n3\n", "3"),
    ("12", None), ("0", None), ("٠", None), ("5", None), ("oui", None), ("OK", None), ("", None), ("   ", None), ("1 2", None),
])
def test_parse_choice(text, expected):
    assert m.parse_choice(text) == expected


def test_accept_confirms_and_does_not_replan(plan_calls):
    before = m.current_allocation(SMALL_BATCH)
    n = len(plan_calls)
    r = m.add_reply("B", "1", batch_id=SMALL_BATCH)
    assert "confirmé" in r["text_fr"] and m.fmt_number(volumes(before)["B"], "fr") + " m³" in r["text_fr"]
    assert "تأكّدت" in r["text_ar"] and r["needs_human_review"] is True
    assert "B" in m._state_for(SMALL_BATCH).confirmed
    assert len(plan_calls) == n and m.current_allocation(SMALL_BATCH) is before  # nothing re-planned


def test_refusal_by_b_changes_the_other_farms_volumes_and_tells_them(plan_calls):
    before = volumes(m.current_allocation(SMALL_BATCH))
    m.add_reply("B", "2", batch_id=SMALL_BATCH)
    alloc = m.current_allocation(SMALL_BATCH)
    after = volumes(alloc)
    assert after["B"] == 0 and before["B"] > 0
    grew = {f for f in after if f not in ("B", "C") and after[f] > before[f] + 0.05}
    assert grew == {"A", "D", "E", "F", "G", "H", "I", "J"}  # every farm that can receive water gets more
    assert all(after[f] >= before[f] for f in after if f != "B")  # nobody loses
    assert sum(after.values()) <= 700 + 0.5  # still within the batch
    b = next(i for i in alloc.items if i.farm_id == "B")
    assert b.status == "capped" and "refused" in b.cap_reason
    updates = {x["farm_id"]: x for x in m.list_messages() if "-U" in x["id"]}
    assert set(updates) == grew
    for f, x in updates.items():
        delta = m.fmt_number(round(after[f] - before[f], 1), "fr")
        assert f"+{delta} m³" in x["text_fr"] and f"{m.fmt_number(after[f], 'fr')} m³ au total" in x["text_fr"]
        assert m.fmt_number(after[f], "ar") + " م³" in x["text_ar"] and x["needs_human_review"] is True
        assert x["batch_id"] == SMALL_BATCH and x["direction"] == "out"
    assert any("refused its volume" in w for w in alloc.warnings)


def test_the_allocator_runs_again_for_the_same_batch_without_the_farm_and_without_blocked_ones(plan_calls):
    m.current_allocation(SMALL_BATCH)
    n = len(plan_calls)
    m.add_reply("B", "2", batch_id=SMALL_BATCH)
    (args, kwargs), = plan_calls[n:]  # exactly one new run
    assert args[0] == SMALL_BATCH
    assert set(kwargs["farm_ids"]) == {"A", "D", "E", "F", "G", "H", "I"} | {"J"}  # previous eligible farms minus B
    assert "B" not in kwargs["farm_ids"] and "C" not in kwargs["farm_ids"]


def test_blocked_farm_c_never_receives_the_freed_volume():
    m.add_reply("B", "2", batch_id=SMALL_BATCH)
    alloc = m.current_allocation(SMALL_BATCH)
    c = next(i for i in alloc.items if i.farm_id == "C")
    assert c.status == "blocked" and c.m3 == 0
    assert not any("-U" in x["id"] and x["farm_id"] == "C" for x in m.list_messages())


def test_a_second_refusal_does_not_replan_twice(plan_calls):
    m.current_allocation(SMALL_BATCH)
    m.add_reply("B", "2", batch_id=SMALL_BATCH)
    n, alloc, updates = len(plan_calls), m.current_allocation(SMALL_BATCH), [x["id"] for x in m.list_messages() if "-U" in x["id"]]
    again = m.add_reply("B", "٢", batch_id=SMALL_BATCH)  # Arabic-Indic 2
    assert "déjà enregistré" in again["text_fr"] and "من قبل" in again["text_ar"]
    assert len(plan_calls) == n  # no new run
    assert m.current_allocation(SMALL_BATCH) is alloc
    assert [x["id"] for x in m.list_messages() if "-U" in x["id"]] == updates  # no new messages for the other farms


def test_two_farms_can_refuse_one_after_the_other():
    m.add_reply("B", "2", batch_id=SMALL_BATCH)
    after_b = volumes(m.current_allocation(SMALL_BATCH))
    m.add_reply("D", "2", batch_id=SMALL_BATCH)
    after_d = volumes(m.current_allocation(SMALL_BATCH))
    assert after_d["B"] == 0 and after_d["D"] == 0 and after_d["J"] > after_b["J"]


def test_accept_after_a_refusal_is_closed():
    m.add_reply("B", "2", batch_id=SMALL_BATCH)
    r = m.add_reply("B", "1", batch_id=SMALL_BATCH)
    assert "refusé" in r["text_fr"] and "B" not in m._state_for(SMALL_BATCH).confirmed


def test_unknown_text_gets_a_help_reply_and_no_replan(plan_calls):
    m.current_allocation(SMALL_BATCH)
    n, alloc = len(plan_calls), m.current_allocation(SMALL_BATCH)
    for text in ("oui", "OK", "12", "5", "?"):
        r = m.add_reply("B", text, batch_id=SMALL_BATCH)
        for k in ("1", "2", "3", "4"):
            assert k in r["text_fr"] and k in r["text_ar"]
        assert "Envoyez 1 pour accepter" in r["text_fr"] and "ابعث 1" in r["text_ar"]
    assert len(plan_calls) == n and m.current_allocation(SMALL_BATCH) is alloc
    assert not m._state_for(SMALL_BATCH).confirmed and not m._state_for(SMALL_BATCH).refused


def test_postpone_and_call_me_are_logged_without_replan(plan_calls, caplog):
    m.current_allocation(SMALL_BATCH)
    n = len(plan_calls)
    with caplog.at_level("INFO", logger="app.engine.messages"):
        p = m.add_reply("B", "3", batch_id=SMALL_BATCH)
        c = m.add_reply("D", "٤", batch_id=SMALL_BATCH)
    assert "report" in p["text_fr"] and "conseiller" in c["text_fr"] and "رجعلك" in p["text_ar"] and "يعيّطلك" in c["text_ar"]
    assert [x["request"] for x in m._state_for(SMALL_BATCH).log] == ["postpone", "call-me"]
    assert "asked to postpone" in caplog.text and "asked to be called" in caplog.text
    assert len(plan_calls) == n and not m._state_for(SMALL_BATCH).refused


def test_a_blocked_farm_has_nothing_to_accept_or_refuse(plan_calls):
    m.current_allocation(SMALL_BATCH)
    n, alloc = len(plan_calls), m.current_allocation(SMALL_BATCH)
    for text in ("1", "2"):
        r = m.add_reply("C", text, batch_id=SMALL_BATCH)
        assert "Aucune eau ne vous est proposée" in r["text_fr"] and not re.search(r"\d", r["text_fr"].replace("Ferme C", ""))
    assert len(plan_calls) == n and m.current_allocation(SMALL_BATCH) is alloc and "C" not in m._state_for(SMALL_BATCH).refused


def test_on_a_large_batch_nobody_gets_more_and_the_water_stays_in_the_basin():
    before = volumes(m.current_allocation())  # default batch: 1,500 m3, every farm is already at its own cap
    m.add_reply("B", "2")
    after = volumes(m.current_allocation())
    assert after["B"] == 0 and all(after[f] == before[f] for f in after if f != "B")
    assert not [x for x in m.list_messages() if "-U" in x["id"]]  # no "volume added" message when nothing was added
    assert any("not allocated" in w and "basin" in w for w in m.current_allocation().warnings)


def test_new_arabic_templates_are_flagged_and_listed_for_review():
    for key in ("reply_accept", "reply_refuse", "reply_refuse_again", "reply_closed", "reply_no_offer", "reply_postpone", "reply_callme", "reply_help", "update"):
        assert m.AR[key]["needs_human_review"] is True and key in m.FR
        assert m.AR[key]["text"] in m.review_markdown()


# ---- the endpoints
def test_api_refusal_stores_the_new_allocation_and_the_messages(client):
    r = client.post("/api/messages/reply", json={"farm_id": "B", "text": "٢"})
    assert r.status_code == 201 and "refusez" in r.json()["text_fr"]
    cur = client.get("/api/allocation/current")
    assert cur.status_code == 200
    items = {i["farm_id"]: i for i in cur.json()["items"]}
    assert items["B"]["m3"] == 0 and items["B"]["status"] == "capped" and items["C"]["status"] == "blocked"
    from app.schemas import Allocation
    Allocation.model_validate(cur.json())
    thread = client.get("/api/messages", params={"farm_id": "B"}).json()
    assert [x["direction"] for x in thread] == ["out", "in", "out"] and thread[1]["text"] == "٢"


def test_api_repeated_refusal_is_idempotent(client):
    client.post("/api/messages/reply", json={"farm_id": "B", "text": "2"})
    first = client.get("/api/allocation/current").json()
    again = client.post("/api/messages/reply", json={"farm_id": "B", "text": "2"})
    assert again.status_code == 201 and "déjà enregistré" in again.json()["text_fr"]
    assert client.get("/api/allocation/current").json() == first


def test_api_unknown_text_is_a_help_reply(client):
    r = client.post("/api/messages/reply", json={"farm_id": "B", "text": "peut-être"})
    assert r.status_code == 201 and "Envoyez 1 pour accepter" in r.json()["text_fr"]
    assert client.get("/api/allocation/current").json()["items"] == [i.model_dump() for i in m._state_for().base.items]
