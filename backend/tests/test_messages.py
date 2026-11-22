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


def test_replies_are_kept_in_memory_and_listed_after_the_messages(client):
    r = client.post("/api/messages/reply", json={"farm_id": "B", "text": "1"})
    assert r.status_code == 201
    msg = Message.model_validate(r.json())
    assert msg.direction == "in" and msg.text == "1" and msg.farm_id == "B"
    b = client.get("/api/messages", params={"farm_id": "B"}).json()
    assert [x["direction"] for x in b] == ["out", "in"] and b[-1]["text"] == "1"
    assert [x["farm_id"] for x in client.get("/api/messages", params={"farm_id": "A"}).json()] == ["A"]  # another farm: no reply


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
