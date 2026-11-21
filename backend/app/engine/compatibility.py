"""Responses of the compatibility endpoints: look up farms and batch, then call rules.evaluate()."""
from typing import Optional

from pydantic import BaseModel

from app.engine.batches import get_batch, list_batches
from app.engine.farms import get_farm, list_farms
from app.engine.rules import Status, evaluate
from app.schemas import Batch, Farm, RuleResult, Tag

TAG = Tag(status="ESTIMATE", source="rules_config: NT 106.03, Decree 89-1047, 1994 order, FAO-29")


class Compatibility(BaseModel):
    farm_id: str
    batch_id: str
    decision: Status  # contract name for evaluate()["status"]
    results: list[RuleResult]
    tag: Tag


class AllFarmsCompatibility(BaseModel):
    batch_id: str
    batch_status: str  # Batch.status: compliant | conditional | non_compliant | analysis_invalid
    items: list[Compatibility]  # one per farm, same order as GET /api/farms
    tag: Tag


def default_batch() -> Optional[Batch]:
    """Latest batch whose status is not analysis_invalid."""
    return next((b for b in list_batches() if b.status != "analysis_invalid"), None)


def _resolve_batch(batch_id: Optional[str]) -> Optional[Batch]:
    return get_batch(batch_id) if batch_id else default_batch()


def _one(farm: Farm, batch: Batch) -> Compatibility:
    ev = evaluate(farm, batch)
    return Compatibility(farm_id=farm.id, batch_id=batch.id, decision=ev["status"], results=ev["results"], tag=TAG)


def compatibility(farm_id: str, batch_id: Optional[str] = None) -> Optional[Compatibility]:
    """None if the farm or the batch does not exist."""
    farm, batch = get_farm(farm_id), _resolve_batch(batch_id)
    if farm is None or batch is None:
        return None
    return _one(farm, batch)


def all_farms(batch_id: Optional[str] = None) -> Optional[AllFarmsCompatibility]:
    """None if the batch does not exist."""
    batch = _resolve_batch(batch_id)
    if batch is None:
        return None
    return AllFarmsCompatibility(batch_id=batch.id, batch_status=batch.status,
                                 items=[_one(f, batch) for f in list_farms()], tag=TAG)
