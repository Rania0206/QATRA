"""The frontend mocks must match the shared Pydantic schemas (docs/api-contract.md)."""
import json
from pathlib import Path

from app.schemas import Allocation, Batch, BusinessView, Farm, RuleResult, SavingsResult

MOCKS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks"


def load(name):
    return json.loads((MOCKS / name).read_text(encoding="utf-8"))


def test_batches_mock_matches_schema():
    for b in load("batches.json"):
        Batch.model_validate(b)
    Batch.model_validate(load("batches_id.json"))
    Batch.model_validate(load("post_batches.json"))


def test_farms_mock_matches_schema():
    for f in load("farms.json"):
        Farm.model_validate(f)


def test_compatibility_mock_matches_schema():
    for r in load("farms_id_compatibility.json")["results"]:
        RuleResult.model_validate(r)


def test_allocation_mocks_match_schema():
    Allocation.model_validate(load("post_allocate.json"))
    Allocation.model_validate(load("post_scenarios_heatwave.json")["allocation"])


def _reject_constant(name):
    raise ValueError(f"non-standard JSON constant {name}")


def test_all_mocks_are_strict_json():
    """Browsers reject NaN/Infinity; Python's json accepts them unless told not to."""
    files = sorted(MOCKS.glob("*.json"))
    assert files
    for f in files:
        json.loads(f.read_text(encoding="utf-8"), parse_constant=_reject_constant)


def test_lite_mocks_match_schema():
    SavingsResult.model_validate(load("post_savings.json"))
    BusinessView.model_validate(load("business.json"))


def test_compatibility_mock_matches_engine_model():
    from app.engine.compatibility import Compatibility

    Compatibility.model_validate(load("farms_id_compatibility.json"))


def test_a03c_mocks_match_engine_models():
    from app.engine.compatibility import AllFarmsCompatibility
    from app.engine.rules_config import Rule

    AllFarmsCompatibility.model_validate(load("compatibility.json"))
    for r in load("rules.json"):
        Rule.model_validate(r)


def test_soil_simulate_mock_matches_schema():
    from app.schemas import SoilSimulation
    m = SoilSimulation.model_validate(load("post_soil_simulate.json"))
    assert len(m.years) == len(m.naive.series) == len(m.qatra.series) == len(m.series)


def test_needs_mock_matches_engine_model():
    from app.engine.needs import NeedsForecast

    body = NeedsForecast.model_validate(load("forecast_needs.json"))
    assert body.days == 7 and len(body.items) == 70
