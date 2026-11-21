from fastapi import APIRouter, HTTPException, Query

from app.engine.batches import get_batch, list_batches
from app.schemas import Batch

router = APIRouter(prefix="/api", tags=["batches"])


@router.get("/batches", response_model=list[Batch], summary="List batches, newest first")
def batches(plant_id: str | None = Query(None, description="Filter by plant id, e.g. w27944541")):
    return list_batches(plant_id)


@router.get("/batches/{batch_id}", response_model=Batch, summary="One batch by id")
def batch(batch_id: str):
    b = get_batch(batch_id)
    if b is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    return b


# TODO (A-02b+): POST /api/batches
