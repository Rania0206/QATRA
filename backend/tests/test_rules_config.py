"""A-03a: the normalised rule list is complete, sourced and never invents a limit."""
import math
import re

import pandas as pd
from fastapi.testclient import TestClient

from app.engine.rules_config import get_rule, get_rules
from app.main import app
from app.store import get_store, init_store

init_store()


def _numbers_in(obj) -> set[float]:
    """Every number found anywhere in a dataset (JSON values, CSV cells, numbers inside strings)."""
    out: set[float] = set()
    if isinstance(obj, pd.DataFrame):
        for v in obj.to_numpy().ravel():
            out |= _numbers_in(v)
    elif isinstance(obj, dict):
        for v in obj.values():
            out |= _numbers_in(v)
    elif isinstance(obj, list):
        for v in obj:
            out |= _numbers_in(v)
    elif isinstance(obj, bool) or obj is None:
        pass
    elif isinstance(obj, (int, float)):
        if not math.isnan(obj):
            out.add(float(obj))
    elif isinstance(obj, str):
        out |= {float(x) for x in re.findall(r"\d+(?:\.\d+)?", obj)}
    return out


def test_rules_load():
    rules = get_rules()
    ids = [r.rule_id for r in rules]
    assert len(ids) == len(set(ids)), "rule ids must be unique"
    for rid in ["R-ANALYSIS", "R-NEMATODE", "R-COLIFORM", "R-CROP-ALLOWED", "R-RAW-EATEN",
                "R-GRAZING", "R-GRAZING-FODDER", "R-SALINITY-WATER", "R-LIMIT-BOD5", "R-LIMIT-PH"]:
        assert rid in ids
    families = {r.family for r in rules}
    assert families == {"analysis", "water_limit", "crop", "use", "salinity"}


def test_every_rule_has_legal_ref_and_tag():
    for r in get_rules():
        assert r.legal_ref.strip(), r.rule_id
        assert r.tag.status, r.rule_id
        assert r.text_en.strip() and r.text_fr.strip(), r.rule_id


def test_who_coliform_rule_is_to_verify_condition():
    r = get_rule("R-COLIFORM")
    assert r.tag.status == "TO_VERIFY"
    assert r.severity_if_failed == "condition"
    assert "WHO guideline — not Tunisian law" in r.text_en


def test_no_limit_outside_the_data():
    store = get_store()
    known = set()
    for name in ("nt106003_rules", "irrigation_water_quality_guidelines", "crop_salt_tolerance"):
        known |= _numbers_in(store[name])
    for r in get_rules():
        for v in (r.limit, r.limit_min):
            if v is not None:
                assert v in known, f"{r.rule_id}: limit {v} not found in the data files"


def test_missing_values_are_to_verify():
    for r in get_rules():
        if r.family in ("water_limit", "salinity") and r.limit is None:
            assert r.tag.status == "TO_VERIFY", r.rule_id


def test_legal_rules_block_and_agronomic_rules_do_not():
    for r in get_rules():
        if r.rule_id.startswith("R-LIMIT-") or r.rule_id in ("R-NEMATODE", "R-ANALYSIS", "R-RAW-EATEN", "R-GRAZING"):
            assert r.severity_if_failed == "block", r.rule_id
        if r.family == "salinity":
            assert r.severity_if_failed == "condition" and r.legal_ref.startswith("FAO-29")


def test_rules_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/rules")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == len(get_rules())
    assert all(r["legal_ref"] and r["tag"]["status"] for r in body)
