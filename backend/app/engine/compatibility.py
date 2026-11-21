"""Response of GET /api/farms/{id}/compatibility: looks up the farm and batch, then calls rules.evaluate()."""
from typing import Optional

from pydantic import BaseModel

from app.engine.batches import get_batch
from app.engine.farms import get_farm
from app.engine.rules import Status, evaluate
from app.schemas import RuleResult, Tag

TAG = Tag(status="ESTIMATE", source="rules_config: NT 106.03, Decree 89-1047, 1994 order, FAO-29")


class Compatibility(BaseModel):
    farm_id: str
    batch_id: str
    decision: Status  # contract name for evaluate()["status"]
    results: list[RuleResult]
    tag: Tag


def compatibility(farm_id: str, batch_id: str) -> Optional[Compatibility]:
    """None if the farm or the batch does not exist."""
    farm, batch = get_farm(farm_id), get_batch(batch_id)
    if farm is None or batch is None:
        return None
    ev = evaluate(farm, batch)
    return Compatibility(farm_id=farm.id, batch_id=batch.id, decision=ev["status"], results=ev["results"], tag=TAG)
