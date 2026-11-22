from fastapi import APIRouter, HTTPException

from app.engine.passport import build_passport
from app.schemas import Passport

router = APIRouter(prefix="/api", tags=["passport"])


@router.get("/batches/{batch_id}/passport", response_model=Passport, summary="Passport of one batch")
def passport(batch_id: str):
    p = build_passport(batch_id)
    if p is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    return p
