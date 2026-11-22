from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engine.plan import plan
from app.engine.schedule import Scenario
from app.engine.farms import get_farm
from app.schemas import Allocation, PlanDate

router = APIRouter(prefix="/api", tags=["optimiser"])


class AllocateIn(BaseModel):
    batch_id: Optional[str] = None  # default: the latest batch that is not analysis_invalid
    date: PlanDate = None  # YYYY-MM-DD, 2020-2035 (else 422); default: the first day of the weather forecast (the batch date does not have to match)
    scenario: Scenario = "normal"  # "outage": no grid between 13:00 and 17:00
    farm_ids: Optional[list[str]] = None


@router.post("/allocate", response_model=Allocation)
def allocate(body: AllocateIn = AllocateIn()):
    """Allocation of one batch between the farms plus the 24-hour pump schedule (A-05)."""
    for fid in body.farm_ids or []:
        if get_farm(fid) is None:
            raise HTTPException(404, detail=f"Unknown farm '{fid}'")
    res = plan(body.batch_id, body.date, body.scenario, body.farm_ids)
    if res is None:
        raise HTTPException(404, detail=f"Unknown batch '{body.batch_id}'")
    return res
