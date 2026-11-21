from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.engine import batches as engine
from app.engine.batches import (VALIDITY_DAYS, analysis_status, analysis_warnings, get_batch,
                                list_batches, make_analysis)
from app.main import app
from app.schemas import Batch

STALE_DAYS = {"SSUD-20260712", "SSUD-20260719", "SSUD-20260728",
              "SSUD-20260803", "SSUD-20260810", "SSUD-20260818"}  # analysis > 30 days old in the data pack


@pytest.fixture(autouse=True)
def clean_operator_batches():
    engine._operator_batches.clear()
    yield
    engine._operator_batches.clear()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------- A-02a
def test_list_returns_60_batches_newest_first():
    batches = list_batches()
    assert len(batches) == 60
    dates = [b.date for b in batches]
    assert dates == sorted(dates, reverse=True)
    assert batches[0].id == "SSUD-20260829"


def test_plant_filter():
    assert len(list_batches("w27944541")) == 60
    assert list_batches("unknown-plant") == []


def test_get_batch_maps_real_values():
    b = get_batch("SSUD-20260701")
    assert b is not None
    assert b.plant_id == "w27944541" and b.date == "2026-07-01" and b.volume_m3 == 1680
    assert b.status == "pending_rules"
    assert b.tag.status == "SIMULATED" and b.tag.source == "data/simulated/sim_batches"
    by_type = {a.type: a for a in b.analyses}
    assert by_type["physico_chemical"].values["EC_dS_m"] == 3.34
    assert by_type["parasite_eggs"].values["helminth_eggs_per_L"] == 0.42
    assert "metals" not in by_type  # no metal columns in the data: not invented


def test_get_unknown_batch_is_none():
    assert get_batch("NOPE") is None


# ---------------------------------------------------------------- A-02b validity
def test_validity_days_from_decree():
    assert VALIDITY_DAYS == {"physico_chemical": 30, "parasite_eggs": 15, "metals": 182}


def test_20_day_old_physico_chemical_is_valid():
    a = make_analysis("physico_chemical", "2026-07-01", "2026-07-21", {"BOD5_mg_L": 20})
    assert a.is_valid and a.valid_until == "2026-07-31"


def test_20_day_old_parasite_eggs_is_expired():
    a = make_analysis("parasite_eggs", "2026-07-01", "2026-07-21", {"helminth_eggs_per_L": 0.2})
    assert not a.is_valid and a.valid_until == "2026-07-16"
    pc = make_analysis("physico_chemical", "2026-07-01", "2026-07-21", {"BOD5_mg_L": 20})
    assert analysis_status([pc, a]) == "expired"


def test_boundary_day_is_still_valid():
    assert make_analysis("parasite_eggs", "2026-07-01", "2026-07-16", {"x": 1}).is_valid


def test_no_parasite_eggs_is_missing():
    pc = make_analysis("physico_chemical", "2026-07-20", "2026-07-21", {"BOD5_mg_L": 20})
    assert analysis_status([pc]) == "missing"


def test_metals_absent_is_warning_not_missing():
    pc = make_analysis("physico_chemical", "2026-07-20", "2026-07-21", {"BOD5_mg_L": 20})
    pe = make_analysis("parasite_eggs", "2026-07-20", "2026-07-21", {"helminth_eggs_per_L": 0.2})
    assert analysis_status([pc, pe]) == "valid"
    assert any("metals" in w.lower() for w in analysis_warnings([pc, pe]))


def test_stale_days_in_data_pack_are_expired():
    by_id = {b.id: b for b in list_batches()}
    for bid in STALE_DAYS:
        assert by_id[bid].analysis_status == "expired", bid
    statuses = {b.analysis_status for b in by_id.values()}
    assert {"valid", "expired"} <= statuses


# ---------------------------------------------------------------- API
def test_api_list(client):
    r = client.get("/api/batches")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 60
    for b in body:
        Batch.model_validate(b)


def test_api_get_one_and_404(client):
    assert client.get("/api/batches/SSUD-20260808").json()["id"] == "SSUD-20260808"
    r = client.get("/api/batches/NOPE")
    assert r.status_code == 404
    assert "NOPE" in r.json()["detail"]


def test_post_batch_computes_status(client):
    today = date(2026, 8, 30)
    body = {
        "plant_id": "w27944541", "date": today.isoformat(), "volume_m3": 1500, "treatment_level": "secondary",
        "analyses": [
            {"type": "physico_chemical", "date": (today - timedelta(days=20)).isoformat(), "values": {"BOD5_mg_L": 21}},
            {"type": "parasite_eggs", "date": (today - timedelta(days=20)).isoformat(), "values": {"helminth_eggs_per_L": 0.3}},
        ],
    }
    r = client.post("/api/batches", json=body)
    assert r.status_code == 201
    b = r.json()
    assert b["analysis_status"] == "expired"  # eggs 20 days old > 15
    assert b["tag"] == {"status": "REPORTED", "source": "operator input"}
    assert b["id"].startswith("OP-20260830-")
    # stored in memory: listed and retrievable
    assert client.get(f"/api/batches/{b['id']}").status_code == 200
    assert len(client.get("/api/batches").json()) == 61


def test_post_without_eggs_is_missing(client):
    r = client.post("/api/batches", json={
        "plant_id": "w27944541", "date": "2026-08-30", "volume_m3": 800, "treatment_level": "secondary",
        "analyses": [{"type": "physico_chemical", "date": "2026-08-29", "values": {"BOD5_mg_L": 21}}]})
    assert r.status_code == 201 and r.json()["analysis_status"] == "missing"


def test_post_rejects_bad_input(client):
    assert client.post("/api/batches", json={"plant_id": "x", "date": "not-a-date", "volume_m3": 1,
                                             "treatment_level": "s"}).status_code == 422
    assert client.post("/api/batches", json={"plant_id": "x", "date": "2026-08-30", "volume_m3": -5,
                                             "treatment_level": "s"}).status_code == 422


def test_batch_warnings_field_filled(client):
    b = client.get("/api/batches/SSUD-20260701").json()
    assert b["warnings"] and "metals" in b["warnings"][0].lower()
