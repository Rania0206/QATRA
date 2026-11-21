from fastapi import APIRouter

from app.engine.rules_config import Rule, get_rules

router = APIRouter(prefix="/api", tags=["rules"])


@router.get("/rules", response_model=list[Rule])
def rules() -> list[Rule]:
    """Debug: the full normalised rule list (A-03a). Compatibility endpoint comes in A-03b."""
    return get_rules()
