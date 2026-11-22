from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.engine import messages as engine
from app.engine.farms import get_farm
from app.schemas import Message

router = APIRouter(prefix="/api", tags=["messages"])


class ReplyBody(BaseModel):
    farm_id: str
    text: str = Field(min_length=1, max_length=500)


@router.get("/messages", response_model=list[Message], summary="Messages for the latest allocation, plus the replies received")
def messages(farm_id: Optional[str] = Query(None, description="Only this farm")):
    """One outgoing message per farm (French + Tunisian Arabic; the Arabic is flagged `needs_human_review`), then the
    replies kept in memory. A saving line appears only when Dev A's savings engine returns a value for the farm."""
    if farm_id is not None and get_farm(farm_id) is None:
        raise HTTPException(status_code=404, detail=f"Unknown farm {farm_id!r}")
    return engine.list_messages(farm_id)


@router.post("/messages/reply", response_model=Message, status_code=201, summary="Record a reply from a farmer (kept in memory)")
def reply(body: ReplyBody):
    if get_farm(body.farm_id) is None:
        raise HTTPException(status_code=404, detail=f"Unknown farm {body.farm_id!r}")
    return engine.add_reply(body.farm_id, body.text.strip())
