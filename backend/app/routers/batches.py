from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.engine.batches import create_batch, get_batch, list_batches
from app.schemas import Batch

router = APIRouter(prefix="/api", tags=["batches"])


class AnalysisIn(BaseModel):
    type: Literal["physico_chemical", "parasite_eggs", "metals"]
    date: str = Field(examples=["2026-08-25"])
    values: dict[str, float] = Field(examples=[{"BOD5_mg_L": 21.0, "COD_mg_L": 70.0, "EC_dS_m": 3.5}])


class BatchIn(BaseModel):
    plant_id: str = Field(examples=["w27944541"])
    date: str = Field(examples=["2026-08-30"])
    volume_m3: float = Field(gt=0, examples=[1500])
    treatment_level: str = Field(examples=["secondary"])
    analyses: list[AnalysisIn] = []


@router.get("/batches", response_model=list[Batch], summary="List batches, newest first")
def batches(plant_id: str | None = Query(None, description="Filter by plant id, e.g. w27944541")):
    return list_batches(plant_id)


@router.get("/batches/{batch_id}", response_model=Batch, summary="One batch by id")
def batch(batch_id: str):
    b = get_batch(batch_id)
    if b is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    return b


@router.post("/batches", response_model=Batch, status_code=201,
             summary="Register a batch (operator input, kept in memory)")
def add_batch(body: BatchIn):
    try:
        return create_batch(plant_id=body.plant_id, batch_date=body.date, volume_m3=body.volume_m3,
                            treatment_level=body.treatment_level,
                            analyses=[a.model_dump() for a in body.analyses])
    except ValueError as e:  # bad date format
        raise HTTPException(status_code=422, detail=str(e))
