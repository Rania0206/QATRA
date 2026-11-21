"""Shared API objects. Mirror of frontend/src/api/types.ts. Change only by agreement."""
from typing import Literal, Optional

from pydantic import BaseModel

TagStatus = Literal["REPORTED", "ESTIMATE", "PROJECTION", "SIMULATED", "TO_VERIFY"]


class Tag(BaseModel):
    status: TagStatus
    source: Optional[str] = None


class Analysis(BaseModel):
    type: Literal["physico_chemical", "parasite_eggs", "metals"]
    date: str
    valid_until: str
    is_valid: bool
    values: dict[str, float]


class Batch(BaseModel):
    id: str
    plant_id: str
    date: str
    volume_m3: float
    treatment_level: str
    analyses: list[Analysis]
    analysis_status: Literal["valid", "expired", "missing"]
    status: str
    risk_colour: Optional[Literal["green", "amber", "red"]] = None
    tag: Tag


class Farm(BaseModel):
    id: str
    name: str
    crop: str
    area_ha: float
    lat: float
    lon: float
    soil_texture: str
    soil_ece: float
    head_m: Optional[float] = None
    distance_km: float
    fresh_source: str
    fresh_m3_season: float
    is_small_farm: bool
    tag: Tag


class RuleResult(BaseModel):
    rule_id: str
    passed: bool
    severity: Literal["block", "condition", "info"]
    reason_en: str
    reason_fr: str
    legal_ref: str


class AllocationItem(BaseModel):
    farm_id: str
    status: str
    m3: float
    cap_reason: Optional[str] = None


class ScheduleSlot(BaseModel):
    hour: int
    pump_kw: float
    source: Literal["solar", "grid", "basin", "off"]
    basin_m3: float


class Allocation(BaseModel):
    batch_id: str
    items: list[AllocationItem]
    schedule: list[ScheduleSlot]
    energy_kwh: float
    solar_share: float
    fresh_replaced_m3: float
    warnings: list[str]


class HealthResponse(BaseModel):
    status: str
    datasets: dict[str, int]
    errors: dict[str, str] = {}
