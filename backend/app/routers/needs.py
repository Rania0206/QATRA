from fastapi import APIRouter

from app.engine.farms import list_farms
from app.schemas import Farm

router = APIRouter(prefix="/api", tags=["needs"])


@router.get("/farms", response_model=list[Farm])
def farms() -> list[Farm]:
    """The 10 demo farms (A-03c). Water-needs endpoints still TODO."""
    return list_farms()


# TODO: implement needs endpoints (GET /api/forecast/needs)
