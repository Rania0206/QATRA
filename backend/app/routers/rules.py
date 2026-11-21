from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.engine.compatibility import AllFarmsCompatibility, Compatibility, all_farms, compatibility
from app.engine.rules_config import Rule, get_rules

router = APIRouter(prefix="/api", tags=["rules"])

BATCH_QUERY = Query(None, description="Batch to check. Default: latest batch whose status is not analysis_invalid")


@router.get("/rules", response_model=list[Rule])
def rules() -> list[Rule]:
    """The full normalised rule list (A-03a). The UI reads each rule's status tag from here."""
    return get_rules()


@router.get("/farms/{farm_id}/compatibility", response_model=Compatibility)
def farm_compatibility(farm_id: str, batch_id: Optional[str] = BATCH_QUERY):
    """Can this batch irrigate this farm? Fixed legal rules + FAO salinity advice."""
    res = compatibility(farm_id, batch_id)
    if res is None:
        raise HTTPException(404, detail=f"Unknown farm '{farm_id}' or batch '{batch_id}'")
    return res


@router.get("/compatibility", response_model=AllFarmsCompatibility)
def compatibility_all(batch_id: Optional[str] = BATCH_QUERY):
    """Every farm against one batch (map, compatibility screen, savings calculator)."""
    res = all_farms(batch_id)
    if res is None:
        raise HTTPException(404, detail=f"Unknown batch '{batch_id}'")
    return res
