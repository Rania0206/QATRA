"""Shared API objects. Mirror of frontend/src/api/types.ts. Change only by agreement."""
import re
from datetime import date as date_type
from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, Field

PLAN_YEARS = (2020, 2035)  # the years a plan date may be in


def check_plan_date(v: Optional[str]) -> Optional[str]:
    """A plan date is YYYY-MM-DD, a real calendar day, in 2020-2035. Anything else is a 422 with a clear message."""
    if v is None:
        return v
    try:
        ok = re.fullmatch(r"\d{4}-\d{2}-\d{2}", v) and date_type.fromisoformat(v).isoformat() == v
    except ValueError:
        ok = False
    if not ok:
        raise ValueError(f"date must be a real day written YYYY-MM-DD, for example 2026-08-26 (got {v!r})")
    if not PLAN_YEARS[0] <= int(v[:4]) <= PLAN_YEARS[1]:
        raise ValueError(f"date must be between {PLAN_YEARS[0]} and {PLAN_YEARS[1]} (got {v!r})")
    return v


PlanDate = Annotated[Optional[str], AfterValidator(check_plan_date)]

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
    date: Optional[str] = None  # the day the plan is for, YYYY-MM-DD (additive field)
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
    soil_ece: Optional[float] = None  # soil ECe the simulation started from (the farm's, or the judge's override)
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


class HeatwaveHour(BaseModel):
    hour: int
    outage: bool
    demand_m3: float
    delivered_m3: float
    unserved_m3: float
    grid_kw: float
    solar_kw: float
    basin_m3: Optional[float] = None  # null for the naive policy (no basin)
    source: Literal["solar", "grid", "basin", "off"]


class HeatwaveRun(BaseModel):
    policy: Literal["naive", "qatra"]
    hours_without_water: int
    unserved_m3: float
    delivered_m3: float
    grid_kwh: float
    solar_kwh: float
    hourly: list[HeatwaveHour]  # 24 rows


class HeatwaveBaseline(BaseModel):
    energy_kwh: float
    solar_share: float


class HeatwaveResult(BaseModel):
    scenario_id: str
    label: str
    date: str
    dates: list[str]  # the days that can be chosen: the days with an outage window
    allocated_m3: float  # what the plan allocated that day; 0 when the batch of the day cannot be used
    allocation: Allocation
    baseline: HeatwaveBaseline  # the naive run: all grid, no solar
    naive: HeatwaveRun
    qatra: HeatwaveRun
    caveat: str
    tag: Tag


class Message(BaseModel):
    id: str
    farm_id: str
    direction: Literal["in", "out"]
    channel: str  # "sms"
    at: str  # ISO datetime
    text: Optional[str] = None  # incoming messages: what the farmer wrote
    text_fr: Optional[str] = None  # outgoing messages: French and Tunisian Arabic (no language column in the data)
    text_ar: Optional[str] = None
    needs_human_review: bool = False  # true while the Arabic text has not been approved by a Tunisian speaker
    batch_id: Optional[str] = None  # outgoing: the batch of the allocation (the UI links to its passport)
    status: Optional[str] = None  # outgoing: allocated | conditional | capped | blocked


class ReplyIn(BaseModel):
    farm_id: str
    text: str


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


# ---- B-10a: GET /api/meta/sources
class SourceRow(BaseModel):
    """One row of data/data_catalog.csv. `status` is the catalogue's own text (e.g. "REPORTED (incomplete)")."""
    id: str
    title: str
    file: str
    status: str
    source_name: str
    source_url: Optional[str] = None  # a few rows have no public URL
    # A-17 (additive, all optional): what the row is, and its year, so the Sources page can say "where from, and when"
    publication_date: Optional[str] = None  # the catalogue's text, e.g. "2025" or "2026-11-21 extract"
    period_covered: Optional[str] = None  # e.g. "2021/22-2023/24" or "current"
    scope: Optional[str] = None  # e.g. "Tunisia", "Sousse"
    definition: Optional[str] = None  # what the dataset is


class SafeFigure(BaseModel):
    """One of the 5 REPORTED/PROJECTION figures safe to cite (data/README.md section 4). Values come from context_figures.csv."""
    id: str  # SF1..SF5
    label: str
    value: str
    unit: str
    definition: str  # distinct for every figure; related rows keep their own definitions
    status: str
    source_name: str
    source_url: str
    as_of: str  # publication date of the source, ISO


class MetaSources(BaseModel):
    sources: list[SourceRow]
    safe_figures: list[SafeFigure]


# ---- B-11b: water requests (POST/GET /api/requests, PATCH /api/requests/{id})
RequestStatus = Literal["pending", "approved", "rejected"]


class RequestIn(BaseModel):
    farm_id: str
    requested_m3: float = Field(gt=0, le=100000)
    date: date_type  # ISO date of the day the water is wanted


class RequestPatch(BaseModel):
    status: Literal["approved", "rejected"]


class WaterRequest(BaseModel):
    id: str  # REQ-001, REQ-002, ...
    farm_id: str
    requested_m3: float
    date: date_type
    status: RequestStatus
    created_at: str  # ISO datetime
