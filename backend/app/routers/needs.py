from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.engine.farms import list_farms
from app.engine.needs import NeedsForecast, forecast_response
from app.schemas import Farm

router = APIRouter(prefix="/api", tags=["needs"])


@router.get("/farms", response_model=list[Farm])
def farms() -> list[Farm]:
    """The 10 demo farms (A-03c)."""
    return list_farms()


@router.get("/forecast/needs", response_model=NeedsForecast)
def forecast_needs(
    start: Optional[str] = Query(None, description="First day (YYYY-MM-DD). Default: first day of the forecast"),
    days: int = Query(7, ge=1, le=14, description="Number of days; the data pack forecast covers 7"),
    farm_id: Optional[str] = Query(None, description="Only this farm"),
):
    """Daily irrigation need per farm: ET0 x Kc - effective rain, in mm and m3 (A-04)."""
    res = forecast_response(days, farm_id, start)
    if res is None:
        raise HTTPException(404, detail=f"Unknown farm '{farm_id}' or start day '{start}' (not in the forecast)")
    return res
