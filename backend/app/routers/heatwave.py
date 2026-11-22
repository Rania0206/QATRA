from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.engine.heatwave import run_scenario
from app.schemas import HeatwaveResult

router = APIRouter(prefix="/api", tags=["heatwave"])


class HeatwaveRequest(BaseModel):
    scenario_id: str = Field(examples=["heatwave_outage"])
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", examples=["2026-08-26"],
                                description="Another day with an outage window (see `dates` in the response). Default: the scenario's day.")


@router.post("/scenarios/heatwave", response_model=HeatwaveResult,
             summary="Heatwave and grid outage: the QATRA plan against the naive one")
def heatwave(req: HeatwaveRequest):
    try:
        return run_scenario(req.scenario_id, req.date)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown scenario {req.scenario_id!r}")
    except ValueError as e:  # a day without outage window or without batch
        raise HTTPException(status_code=422, detail=str(e))
