from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.engine import messages as engine
from app.engine.farms import get_farm
from app.schemas import Allocation, Message

router = APIRouter(prefix="/api", tags=["messages"])


class ReplyBody(BaseModel):
    farm_id: str
    text: str = Field(min_length=1, max_length=500)


@router.get("/messages", response_model=list[Message], summary="Messages for the latest allocation, the answers and the replies")
def messages(farm_id: Optional[str] = Query(None, description="Only this farm")):
    """The first offer of each farm (French + Tunisian Arabic; the Arabic is flagged `needs_human_review`), the answers of
    the farmers, the replies of the service and the "volume added" messages after a refusal, oldest first. A saving line
    appears only when Dev A's savings engine returns a value for the farm."""
    if farm_id is not None and get_farm(farm_id) is None:
        raise HTTPException(status_code=404, detail=f"Unknown farm {farm_id!r}")
    return engine.list_messages(farm_id)


@router.post("/messages/reply", response_model=Message, status_code=201, summary="A farmer answers 1 (accept), 2 (refuse), 3 (postpone) or 4 (call me)")
def reply(body: ReplyBody):
    """Stores the answer and returns the reply of the service (an outgoing message). 2 runs the allocator again without
    that farm and stores the new allocation (`GET /api/allocation/current`); a second 2 does not re-plan again. Any other
    text gets a help message and changes nothing. Arabic-Indic digits work too."""
    if get_farm(body.farm_id) is None:
        raise HTTPException(status_code=404, detail=f"Unknown farm {body.farm_id!r}")
    try:
        return engine.add_reply(body.farm_id, body.text.strip())
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/allocation/current", response_model=Allocation, summary="The allocation as it stands after the farmers' answers")
def current_allocation():
    """The first plan of the latest batch, or the plan run again after a refusal."""
    alloc = engine.current_allocation()
    if alloc is None:
        raise HTTPException(status_code=404, detail="No batch to plan")
    return alloc
