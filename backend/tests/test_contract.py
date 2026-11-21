"""The frontend mocks must match the shared Pydantic schemas (docs/api-contract.md)."""
import json
from pathlib import Path

from app.schemas import Allocation, Batch, Farm, RuleResult

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
