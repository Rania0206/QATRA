from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from app.engine import requests as engine
from app.engine.farms import get_farm
from app.schemas import RequestIn, RequestPatch, WaterRequest

router = APIRouter(prefix="/api", tags=["requests"])


@router.post("/requests", response_model=WaterRequest, status_code=201, summary="A farm asks for water")
def create_request(body: RequestIn):
    """Stores a pending request. 404 if the farm does not exist, 422 if `requested_m3` is not positive or the date is not valid."""
    if get_farm(body.farm_id) is None:
        raise HTTPException(status_code=404, detail=f"Unknown farm {body.farm_id!r}")
    return engine.create(body)


@router.get("/requests", response_model=list[WaterRequest], summary="Water requests, oldest first")
def list_requests(status: Optional[Literal["pending", "approved", "rejected"]] = Query(None, description="Only this status")):
    return engine.list_requests(status)


@router.patch("/requests/{req_id}", response_model=WaterRequest, summary="Approve or reject a pending request")
def decide_request(req_id: str, body: RequestPatch):
    """404 for an unknown id; 409 when the request was already approved or rejected (a decision is final)."""
    req = engine.get(req_id)
    if req is None:
        raise HTTPException(status_code=404, detail=f"Unknown request {req_id!r}")
    if req.status != "pending":
        raise HTTPException(status_code=409, detail=f"Request {req_id} is already {req.status}")
    return engine.decide(req, body.status)
