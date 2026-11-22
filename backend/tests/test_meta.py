import json
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import MetaSources

ROOT = Path(__file__).resolve().parents[2]
MOCK = ROOT / "frontend" / "src" / "mocks" / "meta_sources.json"


@pytest.fixture(scope="module")
def body():
    with TestClient(app) as c:
        r = c.get("/api/meta/sources")
        assert r.status_code == 200
        return r.json()


def test_every_catalogue_row_is_present(body):
    cat = pd.read_csv(ROOT / "data" / "data_catalog.csv")
    assert len(body["sources"]) == len(cat) == 64
    assert [s["id"] for s in body["sources"]] == cat["id"].tolist()
    for s in body["sources"]:
        assert set(s) == {"id", "title", "file", "status", "source_name", "source_url", "publication_date", "period_covered", "scope", "definition"}
        assert s["status"] and s["title"]


def test_catalogue_rows_carry_their_year_and_what_they_are(body):
    cat = pd.read_csv(ROOT / "data" / "data_catalog.csv").set_index("id")
    by = {s["id"]: s for s in body["sources"]}
    assert by["D26"]["publication_date"] == str(cat.loc["D26", "publication_date"]) == "2025"  # STEG tariffs
    assert by["D01"]["period_covered"] == "current" and by["D01"]["definition"]
    assert sum(1 for s in body["sources"] if s["publication_date"]) > 50  # nothing guessed: a blank cell stays None


def test_five_safe_figures_with_status_and_url(body):
    figs = body["safe_figures"]
    assert len(figs) == 5
    for f in figs:
        assert set(f) == {"id", "label", "value", "unit", "definition", "status", "source_name", "source_url", "as_of"}
        assert f["status"] and f["source_url"].startswith("http") and f["as_of"] and f["value"]


def test_values_come_from_the_csv(body):
    cf = pd.read_csv(ROOT / "data" / "clean" / "context_figures.csv").set_index("id")
    by = {f["id"]: f for f in body["safe_figures"]}
    for sid, cid in (("SF1", "CF01"), ("SF2", "CF04"), ("SF3", "CF10"), ("SF4", "CF16"), ("SF5", "CF23")):
        assert float(by[sid]["value"]) == float(cf.loc[cid, "value"])
        assert by[sid]["source_url"] == cf.loc[cid, "source_url"] and by[sid]["as_of"] == cf.loc[cid, "publication_date"]
    assert by["SF4"]["status"] == "PROJECTION" and all(by[k]["status"] == "REPORTED" for k in ("SF1", "SF2", "SF3", "SF5"))


def test_definitions_are_distinct_and_the_reuse_shares_are_not_merged(body):
    defs = [f["definition"] for f in body["safe_figures"]]
    assert len(set(defs)) == 5
    text = json.dumps(body["safe_figures"])
    assert "3.8" in text and "2024" in by_id(body, "SF2")["definition"]
    for other in ("22", "<10", "all uses"):  # CF06 / CF08 have other definitions: not in the headline figures
        assert other not in " ".join(defs)
    assert "Court of Auditors" not in text  # 61 % (audit 2008-2011) is not a headline figure


def by_id(body, sid):
    return next(f for f in body["safe_figures"] if f["id"] == sid)


def test_mock_matches_the_response(body):
    mock = json.loads(MOCK.read_text(encoding="utf-8"))
    MetaSources.model_validate(mock)
    assert mock == body
