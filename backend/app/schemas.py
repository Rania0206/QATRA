from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    datasets: dict[str, int]
    errors: dict[str, str] = {}
