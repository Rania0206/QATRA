from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.engine.plan import plan
from app.engine.schedule import Scenario
from app.schemas import Allocation

router = APIRouter(prefix="/api", tags=["optimiser"])


class AllocateIn(BaseModel):
    batch_id: Optional[str] = None  # default: the latest batch that is not analysis_invalid
    date: Optional[str] = None  # default: the first day of the weather forecast (the batch date does not have to match)
    scenario: Scenario = "normal"  # "outage": no grid between 13:00 and 17:00
    farm_ids: Optional[list[str]] = None
    soil_ece: Optional[dict[str, float]] = Field(None, description="Judge override of a farm's soil ECe in dS/m, by farm id, each 0 to 30 (\"break it\" demo)")


@router.post("/allocate", response_model=Allocation)
def allocate(body: AllocateIn = AllocateIn()):
    """Allocation of one batch between the farms plus the 24-hour pump schedule (A-05)."""
    if body.soil_ece and any(not 0 <= v <= 30 for v in body.soil_ece.values()):
        raise HTTPException(422, detail="soil_ece values must be between 0 and 30 dS/m")
    res = plan(body.batch_id, body.date, body.scenario, body.farm_ids, soil_ece=body.soil_ece)
    if res is None:
        raise HTTPException(404, detail=f"Unknown batch '{body.batch_id}'")
    return res
