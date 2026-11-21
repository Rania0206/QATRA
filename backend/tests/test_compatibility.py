"""A-03b: farm x batch compatibility from the fixed rules."""
import pytest
from fastapi.testclient import TestClient

from app.engine.compatibility import Compatibility, compatibility
from app.engine.rules import overall as decide
from app.main import app
from app.schemas import RuleResult
from app.store import get_store, init_store

init_store()
BATCH = "SSUD-20260708"  # valid analyses, within all NT 106.03 limits


def ids(c, failed_only=True):
    return {r.rule_id for r in c.results if not (failed_only and r.passed)}


def test_demo_farms_a_b_c():
    a, b, c = (compatibility(f, BATCH) for f in "ABC")
    assert a.decision == "conditional" and ids(a) == {"R-SALINITY-ALFALFA"}
    assert b.decision == "compatible" and ids(b) == set()
    assert c.decision == "blocked" and {"R-CROP-ALLOWED", "R-RAW-EATEN"} <= ids(c)


def test_matches_expected_decision_in_sim_farms():
    farms = get_store()["sim_farms"]
    for _, f in farms[farms["expected_decision"].notna()].iterrows():
        assert compatibility(f["farm_id"], BATCH).decision == f["expected_decision"], f["farm_id"]


def test_fodder_gets_cut_and_carry_info():
    a = compatibility("A", BATCH)  # alfalfa
    info = next(r for r in a.results if r.rule_id == "R-GRAZING-FODDER")
    assert info.passed and info.severity == "info" and "cut-and-carry" in info.reason_en
    assert "R-GRAZING-FODDER" not in ids(compatibility("B", BATCH), failed_only=False)


def test_olive_salinity_not_assessed():
    b = compatibility("B", BATCH)
    r = next(r for r in b.results if r.rule_id == "R-SALINITY-NONE")
    assert r.passed and r.severity == "info" and r.source_type == "agronomic_advice"


def test_every_planned_problem_batch_blocks_and_nothing_else():
    d = get_store()["sim_batches"]
    planned = set(d.loc[d["injected_issue"].notna(), "batch_id"])
    blocked = {bid for bid in d["batch_id"] if compatibility("B", bid).decision == "blocked"}
    assert blocked == planned


@pytest.mark.parametrize("batch_id,rule", [
    ("SSUD-20260712", "R-ANALYSIS"),       # stale analysis
    ("SSUD-20260718", "R-LIMIT-BOD5"),     # BOD5/COD/TSS above NT 106.03
    ("SSUD-20260808", "R-NEMATODE"),       # helminth eggs > 1/L
])
def test_problem_batches_fail_the_right_rule(batch_id, rule):
    c = compatibility("B", batch_id)
    assert c.decision == "blocked" and rule in ids(c)


def test_ec_is_converted_to_us_cm():
    ec = next(r for r in compatibility("B", BATCH).results if r.rule_id == "R-LIMIT-EC")
    assert ec.passed and ec.reason_en.startswith("EC 3.66 dS/m within limit 7")


def test_unmeasured_metals_are_info_not_pass_or_fail():
    nm = next(r for r in compatibility("B", BATCH).results if r.rule_id == "R-LIMIT-NOT-MEASURED")
    assert nm.severity == "info" and "Arsenic" in nm.reason_en
    assert "R-LIMIT-ARSENIC" not in ids(compatibility("B", BATCH), failed_only=False)


def test_every_result_has_legal_ref_and_source_type():
    for f in "ABCDEFGHIJ":
        for r in compatibility(f, BATCH).results:
            assert r.legal_ref and r.source_type in ("tunisian_law", "agronomic_advice"), r.rule_id


def test_decide():
    mk = lambda passed, sev: RuleResult(rule_id="x", passed=passed, severity=sev, reason_en="", reason_fr="", legal_ref="")
    assert decide([mk(True, "block"), mk(True, "condition")]) == "compatible"
    assert decide([mk(False, "condition"), mk(True, "block")]) == "conditional"
    assert decide([mk(False, "condition"), mk(False, "block")]) == "blocked"
    assert decide([mk(False, "info")]) == "compatible"


def test_unknown_farm_or_batch():
    assert compatibility("Z", BATCH) is None
    assert compatibility("A", "NOPE") is None


def test_endpoint():
    with TestClient(app) as client:
        ok = client.get(f"/api/farms/C/compatibility?batch_id={BATCH}")
        assert ok.status_code == 200
        body = Compatibility.model_validate(ok.json())
        assert body.decision == "blocked" and body.tag.status
        assert client.get(f"/api/farms/Z/compatibility?batch_id={BATCH}").status_code == 404
        assert client.get("/api/farms/A/compatibility?batch_id=NOPE").status_code == 404
        assert client.get("/api/farms/A/compatibility").status_code == 422
