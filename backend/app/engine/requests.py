"""Water requests from farms (B-11b). In memory: lost at restart, like the replies of the messages."""
from datetime import datetime
from typing import Optional

from app.schemas import RequestIn, WaterRequest

_requests: list[WaterRequest] = []


def reset() -> None:
    _requests.clear()


def create(body: RequestIn, now: Optional[datetime] = None) -> WaterRequest:
    req = WaterRequest(
        id=f"REQ-{len(_requests) + 1:03d}", farm_id=body.farm_id, requested_m3=body.requested_m3, date=body.date,
        status="pending", created_at=(now or datetime.now()).isoformat(timespec="seconds"),
    )
    _requests.append(req)
    return req


def list_requests(status: Optional[str] = None) -> list[WaterRequest]:
    return [r for r in _requests if status is None or r.status == status]


def get(req_id: str) -> Optional[WaterRequest]:
    return next((r for r in _requests if r.id == req_id), None)


def decide(req: WaterRequest, status: str) -> WaterRequest:
    """pending -> approved | rejected. The caller checks that the request is still pending."""
    req.status = status  # type: ignore[assignment]
    return req
