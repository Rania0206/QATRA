"""Shared API objects. Mirror of frontend/src/api/types.ts. Change only by agreement."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

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
    warnings: list[str] = Field(default_factory=list)
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
    well_depth_m: Optional[float] = None
    pump_efficiency: Optional[float] = None
    tag: Tag


class RuleResult(BaseModel):
    rule_id: str
    passed: bool
    severity: Literal["block", "condition", "info"]
    source_type: Optional[Literal["tunisian_law", "agronomic_advice"]] = None
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


class SavingsLine(BaseModel):
    label: str
    value: float
    unit: str
    tag: Tag


class SavingsResult(BaseModel):
    water_need_m3: float
    well_kwh_avoided: float
    well_cost_avoided_tnd: float
    treated_water_cost_tnd: float
    nitrogen_kg: float
    fertiliser_kg_ammonium_nitrate: float
    fertiliser_saved_tnd: float
    net_saving_tnd: float
    kwh_off_grid: float
    well_water_kept_m3: float
    compatibility_status: str
    breakdown: list[SavingsLine]


class BusinessView(BaseModel):
    area_name: str
    area_ha: float
    farms: int
    total_saving_tnd: float
    qatra_share_pct: float
    qatra_revenue_tnd: float
    steg_kwh_avoided: float
    steg_value_tnd: float
    national_areas: int = 36
    tag: Tag


class SoilPoint(BaseModel):
    day: int  # legacy field: year * 365
    ece: float


class SoilPolicy(BaseModel):
    series: list[float]  # ECe (dS/m) at the start of each year, index = year (0..years)
    first_year_over: Optional[int] = None  # first year ECe > threshold, null if never
    water_used_m3_season: float
    yield_loss_pct_30y: Optional[float] = None  # null when the crop has no published yield slope


class SoilQatraPolicy(SoilPolicy):
    leaching_fraction: float


class SoilSimulation(BaseModel):
    farm_id: str
    batch_id: str
    crop: str
    threshold_ece: float
    ecw: float
    years: list[int]  # [0..N]
    naive: SoilPolicy
    qatra: SoilQatraPolicy
    # legacy fields (original contract): `series` is the QATRA curve, day = year * 365
    series: list[SoilPoint]
    leaching_fraction: float  # = qatra.leaching_fraction
    blocked_reason: Optional[str] = None  # set when the crop cannot receive TWW by law: the UI shows no simulation
    warning: Optional[str] = None
    tag: Tag


class PassportQuality(BaseModel):
    param: str  # EC, BOD5, COD, TSS, pH, helminth_eggs, faecal_coliforms
    label: str
    value: Optional[float] = None  # null when the parameter was not measured
    unit: str
    limit_min: Optional[float] = None  # only for ranges (pH)
    limit_max: Optional[float] = None
    ok: Optional[bool] = None  # null when not measured
    legal_ref: str
    tag: Tag  # faecal coliforms: TO_VERIFY (WHO-derived fallback, not Tunisian law)


class PassportCheck(BaseModel):
    type: Literal["physico_chemical", "parasite_eggs", "metals"]
    required: bool  # metals are not required per batch (once per semester)
    present: bool
    analysed_on: Optional[str] = None
    valid_until: Optional[str] = None
    validity_days: int  # 30, 15, 182 (Decree 89-1047 Art.3)
    is_valid: Optional[bool] = None  # null when not applicable (no metals analysis)
    legal_ref: str


class PassportEvent(BaseModel):
    at: str  # ISO date or datetime
    event: str


class PassportDestination(BaseModel):
    farm_id: str
    m3: float


class Passport(BaseModel):
    batch_id: str
    plant: str
    date: str
    volume_m3: float
    analysis_status: Literal["valid", "expired", "missing"]
    risk_colour: Optional[Literal["green", "amber", "red"]] = None
    allowed_crops: list[str]  # the 1994 order; empty when the batch is not usable
    blocked_crops: list[str]
    destinations: list[PassportDestination]  # from the allocation; [] until it exists
    issued_at: str
    qr_payload: str
    quality_summary: list[PassportQuality]
    checks: list[PassportCheck]
    timeline: list[PassportEvent]
    tag: Tag


class HealthResponse(BaseModel):
    status: str
    datasets: dict[str, int]
    errors: dict[str, str] = {}


class Plant(BaseModel):
    id: str
    name: str
    governorate: str
    serves_perimeter: Optional[str] = None
    treatment_level: str
    capacity_m3_d: Optional[float] = None  # TREATMENT capacity, not volume available to farmers
    lat: Optional[float] = None  # null when no coordinates are known (never invented)
    lon: Optional[float] = None
    tag: Tag


class MapFeature(BaseModel):
    """id, name, lat, lon plus layer-specific extras (crop, capacity_m3, area_ha...)."""
    model_config = {"extra": "allow"}

    id: str
    name: str
    lat: Optional[float] = None
    lon: Optional[float] = None


class MapLayer(BaseModel):
    id: str
    label: str
    tag: Tag
    features: list[MapFeature]


class MapLayersResponse(BaseModel):
    layers: list[MapLayer]
