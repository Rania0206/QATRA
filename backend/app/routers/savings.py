from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engine.farms import get_farm
from app.engine.needs import forecast_dates
from app.engine.plan import plan
from app.engine.savings import Overrides, SavingsReport, savings
from app.engine.schedule import Scenario

router = APIRouter(prefix="/api", tags=["savings"])


class SavingsIn(BaseModel):
    batch_id: Optional[str] = None  # default: the latest batch that is not analysis_invalid
    date: Optional[str] = None  # default: the first day of the weather forecast
    scenario: Scenario = "normal"
    farm_id: Optional[str] = None  # only this farm in the answer (the plan is still shared between all farms)
    overrides: Optional[Overrides] = None  # editable prices


@router.post("/savings", response_model=SavingsReport)
def post_savings(body: SavingsIn = SavingsIn()):
    """Money saved per farm for one day of the plan, plus season and year projections (A-14a)."""
    if body.farm_id and get_farm(body.farm_id) is None:
        raise HTTPException(404, detail=f"Unknown farm '{body.farm_id}'")
    p = plan(body.batch_id, body.date, body.scenario)
    if p is None:
        raise HTTPException(404, detail=f"Unknown batch '{body.batch_id}'")
    dates = forecast_dates()
    return savings(p, body.overrides, body.farm_id, body.date or (dates[0] if dates else None), body.scenario)
