from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.engine.heatwave import run_scenario
from app.schemas import HeatwaveResult

router = APIRouter(prefix="/api", tags=["heatwave"])


class HeatwaveRequest(BaseModel):
    scenario_id: str = Field(examples=["heatwave_outage"])


@router.post("/scenarios/heatwave", response_model=HeatwaveResult,
             summary="Heatwave and grid outage: the QATRA plan against the naive one")
def heatwave(req: HeatwaveRequest):
    try:
        return run_scenario(req.scenario_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown scenario {req.scenario_id!r}")
