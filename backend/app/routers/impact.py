from fastapi import APIRouter

from app.engine import impact as engine
from app.engine.impact import ImpactSummary

router = APIRouter(prefix="/api", tags=["impact"])


@router.get("/impact", response_model=ImpactSummary, summary="Aggregated impact of all the simulated batches")
def impact():
    """Totals only (no farm name): treated water allocated, fresh water replaced, pumping energy and solar share, farms served,
    batches that could not send water. `co2_avoided_kg` is null until the grid emission factor is sourced."""
    return engine.impact()
