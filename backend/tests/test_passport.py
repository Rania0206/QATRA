import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.engine.batches import list_batches
from app.engine.rules import batch_compliance
from app.main import app
from app.schemas import Passport

MOCK = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks" / "batches_id_passport.json"
OK_BATCH = "SSUD-20260708"
EXPIRED_BATCH = "SSUD-20260712"  # physico-chemical analysis older than 30 days in the data pack
ORIGINAL_KEYS = {"batch_id", "plant", "date", "volume_m3", "analysis_status", "risk_colour", "allowed_crops",
                 "blocked_crops", "destinations", "issued_at", "qr_payload", "tag"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def get(client, batch_id):
    return client.get(f"/api/batches/{batch_id}/passport")


def test_valid_batch_passport(client):
    r = get(client, OK_BATCH)
    assert r.status_code == 200
    p = Passport.model_validate(r.json())  # response validates against the pydantic model
    assert ORIGINAL_KEYS <= set(r.json())  # every original field is kept
    assert p.analysis_status == "valid" and p.risk_colour == "green"
    assert p.plant == "Sousse Sud WWTP (identity TO_VERIFY)" and p.volume_m3 == 1200
    assert p.qr_payload == f"qatra:passport:{OK_BATCH}" and p.issued_at == "2026-07-08T07:00:00"
    assert p.tag.status == "SIMULATED"
    assert all(c.is_valid for c in p.checks if c.required)


def test_quality_summary_rows_limits_and_flags(client):
    q = {r["param"]: r for r in get(client, OK_BATCH).json()["quality_summary"]}
    assert list(q) == ["EC", "BOD5", "COD", "TSS", "pH", "helminth_eggs", "faecal_coliforms"]
    assert (q["EC"]["value"], q["EC"]["limit_max"], q["EC"]["unit"]) == (3.66, 7.0, "dS/m")  # 7000 uS/cm
    assert (q["BOD5"]["limit_max"], q["COD"]["limit_max"], q["TSS"]["limit_max"]) == (30, 90, 30)
    assert (q["pH"]["limit_min"], q["pH"]["limit_max"]) == (6.5, 8.5)
    assert q["helminth_eggs"]["limit_max"] == 1.0
    assert all(q[k]["ok"] is True for k in ("EC", "BOD5", "COD", "TSS", "pH", "helminth_eggs"))
    assert all(q[k]["tag"]["status"] == "REPORTED" for k in ("EC", "BOD5", "pH"))


def test_faecal_coliform_limit_is_a_to_verify_fallback_not_law(client):
    f = {r["param"]: r for r in get(client, OK_BATCH).json()["quality_summary"]}["faecal_coliforms"]
    assert f["tag"]["status"] == "TO_VERIFY" and f["limit_max"] == 1000
    assert "not Tunisian law" in f["legal_ref"] and "No limit in NT 106.03" in f["legal_ref"]
    assert f["ok"] is False  # 171873 CFU/100 mL, far above the WHO-derived design value
    # ... yet it does not decide the colour: the law has no limit, so the batch stays green
    assert get(client, OK_BATCH).json()["risk_colour"] == "green"


def test_checks_use_the_decree_validity_periods(client):
    c = {x["type"]: x for x in get(client, OK_BATCH).json()["checks"]}
    assert [c[k]["validity_days"] for k in ("physico_chemical", "parasite_eggs", "metals")] == [30, 15, 182]
    assert c["physico_chemical"]["valid_until"] == "2026-08-03" and c["parasite_eggs"]["valid_until"] == "2026-07-19"
    assert c["metals"]["required"] is False and c["metals"]["present"] is False and c["metals"]["is_valid"] is None


def test_expired_analysis_shows_is_valid_false(client):
    d = get(client, EXPIRED_BATCH).json()
    c = {x["type"]: x for x in d["checks"]}
    assert d["analysis_status"] == "expired"
    assert c["physico_chemical"]["is_valid"] is False
    assert d["risk_colour"] == "red" and d["allowed_crops"] == []  # not usable: no crop is announced as allowed
    assert d["blocked_crops"]  # the blocked list stays


def test_non_compliant_batch_is_red(client):
    bad = next(b for b in list_batches() if batch_compliance(b) == "non_compliant")
    d = get(client, bad.id).json()
    assert d["risk_colour"] == "red" and d["allowed_crops"] == []
    assert any(q["ok"] is False and q["tag"]["status"] == "REPORTED" for q in d["quality_summary"])


def test_crops_come_from_the_1994_list_and_nothing_else(client):
    d = get(client, OK_BATCH).json()
    allowed, blocked = d["allowed_crops"], d["blocked_crops"]
    for crop in ("wheat", "barley", "oat", "forest trees"):
        assert crop in allowed
    assert "date palm (no sprinkler)" in allowed  # fruit trees only without sprinklers
    assert {"olive (to verify)", "alfalfa (to verify)"} <= set(allowed)  # allowed by interpretation, flagged
    assert not {"lettuce", "tomato"} & set(allowed)
    assert {"lettuce", "tomato"} <= set(blocked) and any("Art.5" in b for b in blocked)


def test_destinations_empty_and_no_delivery_claimed_without_an_allocation(client):
    d = get(client, OK_BATCH).json()
    assert d["destinations"] == []
    assert [e["event"] for e in d["timeline"]] == [
        "Sampled for laboratory analysis", "Checked against NT 106.03 limits and analysis validity", "Passport issued"]
    assert d["timeline"][0]["at"] == "2026-07-04"


def test_unknown_batch_is_404(client):
    assert get(client, "NOPE").status_code == 404


def test_mock_matches_the_real_shape(client):
    mock = json.loads(MOCK.read_text(encoding="utf-8"))
    real = get(client, OK_BATCH).json()
    Passport.model_validate(mock)
    assert set(mock) == set(real)
    for key in ("quality_summary", "checks", "timeline"):
        assert set(mock[key][0]) == set(real[key][0])
    assert [q["param"] for q in mock["quality_summary"]] == [q["param"] for q in real["quality_summary"]]
