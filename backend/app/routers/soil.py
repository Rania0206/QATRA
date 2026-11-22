"""POST /api/soil/simulate: 30-year soil salinity, naive vs QATRA managed leaching (B-03c)."""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.engine import farms as farm_engine
from app.engine import soil_inputs
from app.engine.batches import get_batch
from app.schemas import SoilSimulation

router = APIRouter(prefix="/api", tags=["soil"])


class SoilSimulateRequest(BaseModel):
    farm_id: str = Field(examples=["A"])
    batch_id: str = Field(examples=["SSUD-20260713"])
    days: Optional[int] = Field(None, ge=1, description="Legacy field, accepted and ignored: the model runs in yearly steps.")
    years: int = Field(30, ge=1, le=100)
    soil_ece: Optional[float] = Field(None, ge=0, le=30, description="Override the farm's soil ECe (dS/m).")
    ecw: Optional[float] = Field(None, gt=0, le=20, description="Override the batch water EC (dS/m).")


def _batch_ecw(batch) -> Optional[float]:
    for a in batch.analyses:
        if "EC_dS_m" in a.values:
            return a.values["EC_dS_m"]
    return None


@router.post("/soil/simulate", response_model=SoilSimulation)
def simulate(req: SoilSimulateRequest):
    farm = farm_engine.get_farm(req.farm_id)
    if farm is None:
        raise HTTPException(404, f"Unknown farm {req.farm_id!r}")
    batch = get_batch(req.batch_id)
    if batch is None:
        raise HTTPException(404, f"Unknown batch {req.batch_id!r}")
    ecw = req.ecw if req.ecw is not None else _batch_ecw(batch)
    if ecw is None:
        raise HTTPException(422, f"Batch {req.batch_id!r} has no EC_dS_m value: pass `ecw` explicitly")
    try:
        res = soil_inputs.simulate_farm(farm.model_dump(), ecw, ece0=req.soil_ece, years=req.years)
    except soil_inputs.UnknownCropError as e:
        raise HTTPException(422, str(e)) from e
    res["series"] = [{"day": y * soil_inputs.DAYS_PER_YEAR, "ece": v} for y, v in zip(res["years"], res["qatra"]["series"])]
    res["leaching_fraction"] = res["qatra"]["leaching_fraction"]
    return SoilSimulation(farm_id=farm.id, batch_id=batch.id, **res)
