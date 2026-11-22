from typing import Optional

from fastapi import APIRouter, Query

from app.engine.business import BusinessReport, business

router = APIRouter(prefix="/api", tags=["business"])


@router.get("/business", response_model=BusinessReport)
def get_business(
    hectares: Optional[float] = Query(None, ge=0, le=1_000_000, description="one extra scenario with this many hectares"),
    adoption_rate: float = Query(1.0, ge=0, le=1, description="share of the hectares that join (0..1), default 100%"),
):
    """Per-hectare economics of the pilot and scale-up scenarios (A-14c)."""
    return business(hectares, adoption_rate)
