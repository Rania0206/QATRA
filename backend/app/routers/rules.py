from fastapi import APIRouter, HTTPException, Query

from app.engine.compatibility import Compatibility, compatibility
from app.engine.rules_config import Rule, get_rules

router = APIRouter(prefix="/api", tags=["rules"])


@router.get("/rules", response_model=list[Rule])
def rules() -> list[Rule]:
    """Debug: the full normalised rule list (A-03a)."""
    return get_rules()


@router.get("/farms/{farm_id}/compatibility", response_model=Compatibility)
def farm_compatibility(farm_id: str, batch_id: str = Query(..., description="Batch to check, e.g. SSUD-20260708")):
    """A-03b: can this batch irrigate this farm? Fixed legal rules + FAO salinity advice."""
    res = compatibility(farm_id, batch_id)
    if res is None:
        raise HTTPException(404, detail=f"Unknown farm '{farm_id}' or batch '{batch_id}'")
    return res
