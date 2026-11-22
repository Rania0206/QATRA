"""A-14a: money saved per farm when treated water replaces well water.

For each farm, for one day of the plan (m3 per farm from engine/plan.plan):

    well_energy_kwh_per_m3 = 0.00272 x well_depth_m / pump_efficiency      (pumping physics, data/clean/energy_params)
    electricity_saved_tnd  = m3 x well_energy_kwh_per_m3 x electricity_price          (the farm stops pumping that water)
    N_kg                   = m3 x N_mg_per_L / 1000                          (1 mg/L = 1 g/m3, so m3 x mg/L / 1000 = kg)
    fertiliser_value_tnd   = N_kg / 0.335 x fertiliser_price x availability_factor
                             (ammonium nitrate is 33.5% N: kg of fertiliser that would carry the same N; availability
                             0.5 = only half of the nutrient is counted, because part is lost by volatilisation or
                             arrives when the crop cannot use it)
    water_cost_tnd         = m3 x treated_water_price
    net_saving_tnd         = electricity_saved + fertiliser_value - water_cost
    qatra_fee_tnd          = qatra_fee_pct % of net_saving, only when net_saving > 0
    farmer_net_tnd         = net_saving - qatra_fee

Blocked farms: everything 0 and a reason. Conditional farms use the capped m3 of the plan. Farms on the public network
(no well of their own) save no pumping electricity. Season and year figures are PROJECTIONS: the daily total x the
irrigation days (x the seasons per year) - they are never mixed into the daily figures.

Prices: electricity, the typical nitrogen of treated water and the default pump efficiency come from the data pack
(through the store). Everything the data pack does not have is in PRICES below, each with its source and tag.
"""
import re
from typing import Optional

from pydantic import BaseModel, Field

from app.engine.batches import get_batch
from app.engine.farms import get_farm
from app.schemas import Allocation, Tag
from app.store import get_store

# --- values NOT in the data pack: single place to change them. (value, unit, source, status)
PRICES: dict[str, dict] = {
    "fertiliser_price": dict(value=1.0, unit="TND/kg", status="TO_VERIFY",
                             source="ammonium nitrate 33.5% N, assumed 1.0 TND/kg - not in the data pack, check with a supplier"),
    "treated_water_price": dict(value=0.020, unit="TND/m3", status="TO_VERIFY",
                                source="20 millimes/m3, treated-wastewater irrigation tariff (2016) - not in the data pack"),
    "availability_factor": dict(value=0.5, unit="share (0..1)", status="ESTIMATE",
                                source="only half of the nitrogen counts as usable fertiliser (losses, timing)"),
    "qatra_fee_pct": dict(value=10.0, unit="% of net saving", status="ESTIMATE",
                          source="QATRA business-model parameter, to be agreed"),
    "irrigation_days": dict(value=150, unit="days/season", status="ESTIMATE",
                            source="length of one irrigation season, for the projection"),
    "seasons_per_year": dict(value=1, unit="seasons/year", status="ESTIMATE",
                             source="one irrigation season per year, for the projection"),
}
N_SHARE_AMMONIUM_NITRATE = 0.335  # ammonium nitrate (NH4NO3) is 33.5% nitrogen by weight (chemistry)
WELL_SOURCES = ("well", "borehole")  # farms on the "network" have no pump of their own

# fallbacks only if the dataset cannot be read
FALLBACK_COEFF, FALLBACK_ETA, FALLBACK_ELEC_MILLIMES, FALLBACK_N_MG_L = 0.00272, 0.65, 290.7, 30.0


class Overrides(BaseModel):
    """Prices a farmer or a judge may edit. Anything left out keeps its default."""

    fertiliser_price: Optional[float] = Field(None, ge=0, le=100)  # TND/kg of ammonium nitrate
    electricity_price: Optional[float] = Field(None, ge=0, le=10)  # TND/kWh
    treated_water_price: Optional[float] = Field(None, ge=0, le=10)  # TND/m3
    availability_factor: Optional[float] = Field(None, ge=0, le=1)
    irrigation_days: Optional[int] = Field(None, ge=1, le=366)
    qatra_fee_pct: Optional[float] = Field(None, ge=0, le=100)
    seasons_per_year: Optional[int] = Field(None, ge=1, le=4)


class Assumption(BaseModel):
    name: str
    value: float
    unit: str
    source: str
    status: str  # REPORTED | ESTIMATE | SIMULATED | TO_VERIFY | PROJECTION


class SavingsItem(BaseModel):
    farm_id: str
    status: str  # plan status: allocated | capped | conditional | blocked
    m3: float
    nitrogen_kg: float
    well_kwh_saved: float
    electricity_saved_tnd: float
    fertiliser_value_tnd: float
    water_cost_tnd: float
    net_saving_tnd: float
    qatra_fee_tnd: float
    farmer_net_tnd: float
    reason: Optional[str] = None  # why the figures are 0 / reduced
    tag: Tag


class SavingsTotals(BaseModel):
    m3: float
    electricity_saved_tnd: float
    fertiliser_value_tnd: float
    water_cost_tnd: float
    net_saving_tnd: float
    qatra_fee_tnd: float
    farmer_net_tnd: float
    tag: Tag


class SavingsReport(BaseModel):
    batch_id: str
    date: Optional[str] = None
    scenario: str = "normal"
    items: list[SavingsItem]
    day: SavingsTotals  # the plan's day: ESTIMATE
    season: SavingsTotals  # day x irrigation_days: PROJECTION
    year: SavingsTotals  # season x seasons_per_year: PROJECTION
    assumptions: list[Assumption]
    warnings: list[str]
    tag: Tag


# ---------------------------------------------------------------- inputs from the data pack
def _coeff() -> float:
    try:
        formula = get_store()["energy_params"]["pump_energy_formula"]["formula"]  # "E_kWh_per_m3 = 0.00272 * H_m / eta"
        return float(re.search(r"=\s*([0-9.]+)\s*\*", formula).group(1))
    except (KeyError, AttributeError, ValueError):
        return FALLBACK_COEFF


def _default_eta() -> float:
    try:
        return float(get_store()["energy_params"]["eta_wire_to_water"]["typical"])
    except (KeyError, TypeError, ValueError):
        return FALLBACK_ETA


def _electricity() -> tuple[float, str, str]:
    """(TND/kWh, source, status). The agricultural pumping tariff is not in the data pack (TO_VERIFY there), so the
    STEG average selling price of 2025 is used as a stand-in."""
    try:
        df = get_store()["steg_tariffs"]
        row = df[df["tariff"].str.contains("average sale price", case=False, na=False)].iloc[0]
        return float(row["value"]) / 1000.0, f"{row['tariff']} (steg_tariffs.csv): average of all customers, NOT the agricultural tariff", "ESTIMATE"
    except (KeyError, IndexError, ValueError, TypeError):
        return FALLBACK_ELEC_MILLIMES / 1000.0, "STEG average sale price 2025 (fallback)", "ESTIMATE"


def _nitrogen(batch) -> tuple[float, str, str]:
    """(mg/L, source, status): the batch's own total_N if it has one, else the typical value of treated wastewater."""
    for a in batch.analyses:
        if "total_N_mg_L" in a.values:
            return a.values["total_N_mg_L"], f"batch {batch.id} analysis of {a.date}", batch.tag.status
    level = "tertiary" if "tertiary" in batch.treatment_level.lower() else "secondary"
    try:
        df = get_store()["tww_quality_ranges"]
        v = float(df[(df["parameter"] == "total_N") & (df["treatment_level"] == level)].iloc[0]["typical"])
    except (KeyError, IndexError, ValueError, TypeError):
        v = FALLBACK_N_MG_L
    return v, f"no nitrogen in the batch: typical total N of {level} effluent (tww_quality_ranges.csv)", "ESTIMATE"


def _p(name: str, overrides: Overrides) -> float:
    v = getattr(overrides, name)
    return PRICES[name]["value"] if v is None else v


# ---------------------------------------------------------------- the calculation
def well_energy_kwh_per_m3(depth_m: float, efficiency: float) -> float:
    """0.00272 x well_depth_m / pump_efficiency (kWh to lift 1 m3 from that depth)."""
    return _coeff() * depth_m / efficiency


def _r(x: float) -> float:
    return round(x + 0.0, 2)  # +0.0 turns -0.0 into 0.0


def _totals(items: list[SavingsItem], factor: float, tag: Tag) -> SavingsTotals:
    def tot(field: str) -> float:
        return _r(sum(getattr(i, field) for i in items) * factor)

    return SavingsTotals(m3=_r(sum(i.m3 for i in items) * factor), electricity_saved_tnd=tot("electricity_saved_tnd"),
                         fertiliser_value_tnd=tot("fertiliser_value_tnd"), water_cost_tnd=tot("water_cost_tnd"),
                         net_saving_tnd=tot("net_saving_tnd"), qatra_fee_tnd=tot("qatra_fee_tnd"),
                         farmer_net_tnd=tot("farmer_net_tnd"), tag=tag)


def savings(plan: Allocation, overrides: Optional[Overrides] = None, farm_id: Optional[str] = None,
            date: Optional[str] = None, scenario: str = "normal") -> Optional[SavingsReport]:
    """Savings of one plan (one day). None if the batch of the plan does not exist. farm_id: only that farm."""
    overrides = overrides or Overrides()
    batch = get_batch(plan.batch_id)
    if batch is None:
        return None
    elec_price, elec_src, elec_status = _electricity()
    if overrides.electricity_price is not None:
        elec_price, elec_src, elec_status = overrides.electricity_price, "set by the user", "ESTIMATE"
    fert_price, water_price = _p("fertiliser_price", overrides), _p("treated_water_price", overrides)
    avail, fee_pct = _p("availability_factor", overrides), _p("qatra_fee_pct", overrides)
    days, seasons = int(_p("irrigation_days", overrides)), int(_p("seasons_per_year", overrides))
    n_mg_l, n_src, n_status = _nitrogen(batch)
    default_eta = _default_eta()
    warnings: list[str] = []
    day_tag = Tag(status="ESTIMATE", source="plan m3 x prices below (see assumptions)")
    proj_tag = Tag(status="PROJECTION", source=f"day x {days} irrigation days x {seasons} season(s)/year")

    items: list[SavingsItem] = []
    for it in plan.items:
        if farm_id and it.farm_id != farm_id:
            continue
        farm = get_farm(it.farm_id)
        m3, reason = it.m3, it.cap_reason
        zero = dict(nitrogen_kg=0.0, well_kwh_saved=0.0, electricity_saved_tnd=0.0, fertiliser_value_tnd=0.0,
                    water_cost_tnd=0.0, net_saving_tnd=0.0, qatra_fee_tnd=0.0, farmer_net_tnd=0.0)
        if it.status == "blocked":  # blocked by the rules: no water, nothing saved
            items.append(SavingsItem(farm_id=it.farm_id, status=it.status, m3=0.0, **zero,
                                     reason=reason or "blocked by the rules", tag=day_tag))
            continue

        # electricity: only a farm with its own pump saves pumping energy
        kwh, note = 0.0, None
        depth = (farm.well_depth_m or farm.head_m) if farm else None  # no well-depth column in the data: head used
        if farm and farm.fresh_source in WELL_SOURCES and depth:
            eta = farm.pump_efficiency or default_eta
            kwh = m3 * well_energy_kwh_per_m3(depth, eta)  # kWh not pumped any more
        elif farm and farm.fresh_source not in WELL_SOURCES:
            note = f"farm uses the {farm.fresh_source}, no own pump: no electricity saved"
        elif farm:
            note = "no well depth or head known: no electricity saved"
        electricity = kwh * elec_price

        n_kg = m3 * n_mg_l / 1000.0  # kg of nitrogen delivered
        fertiliser = n_kg / N_SHARE_AMMONIUM_NITRATE * fert_price * avail
        water_cost = m3 * water_price
        net = _r(electricity) + _r(fertiliser) - _r(water_cost)  # from the rounded lines, so the table adds up
        fee = _r(net * fee_pct / 100.0) if net > 0 else 0.0
        items.append(SavingsItem(
            farm_id=it.farm_id, status=it.status, m3=_r(m3), nitrogen_kg=_r(n_kg), well_kwh_saved=_r(kwh),
            electricity_saved_tnd=_r(electricity), fertiliser_value_tnd=_r(fertiliser), water_cost_tnd=_r(water_cost),
            net_saving_tnd=_r(net), qatra_fee_tnd=fee, farmer_net_tnd=_r(net - fee),
            reason="; ".join(x for x in (reason, note) if x) or None, tag=day_tag))

    warnings.append(f"Season and year are PROJECTIONS: this day repeated for {days} irrigation days; needs change through the season.")
    if n_status == "ESTIMATE":
        warnings.append(f"Batch {batch.id} has no nitrogen value: typical {n_mg_l:g} mg/L used (ESTIMATE).")
    day = _totals(items, 1.0, day_tag)
    season_factor = days
    assumptions = [
        Assumption(name="electricity_price", value=round(elec_price, 4), unit="TND/kWh", source=elec_src, status=elec_status),
        Assumption(name="well_energy_coefficient", value=_coeff(), unit="kWh/(m3*m)", status="REPORTED",
                   source="E = 0.00272 x H / eta (physics, energy_params.json); H = well depth, else the pump head"),
        Assumption(name="default_pump_efficiency", value=default_eta, unit="share (0..1)", status="ESTIMATE",
                   source="used only for a farm with no pump efficiency (energy_params.json, typical)"),
        Assumption(name="nitrogen_in_treated_water", value=n_mg_l, unit="mg/L", source=n_src, status=n_status),
        Assumption(name="ammonium_nitrate_n_share", value=N_SHARE_AMMONIUM_NITRATE, unit="share (0..1)", status="REPORTED",
                   source="ammonium nitrate is 33.5% nitrogen"),
        Assumption(name="fertiliser_price", value=fert_price, unit=PRICES["fertiliser_price"]["unit"],
                   status=PRICES["fertiliser_price"]["status"] if overrides.fertiliser_price is None else "ESTIMATE",
                   source=PRICES["fertiliser_price"]["source"] if overrides.fertiliser_price is None else "set by the user"),
        Assumption(name="treated_water_price", value=water_price, unit=PRICES["treated_water_price"]["unit"],
                   status=PRICES["treated_water_price"]["status"] if overrides.treated_water_price is None else "ESTIMATE",
                   source=PRICES["treated_water_price"]["source"] if overrides.treated_water_price is None else "set by the user"),
        Assumption(name="availability_factor", value=avail, **{k: PRICES["availability_factor"][k] for k in ("unit", "source", "status")}),
        Assumption(name="qatra_fee_pct", value=fee_pct, **{k: PRICES["qatra_fee_pct"][k] for k in ("unit", "source", "status")}),
        Assumption(name="irrigation_days", value=days, **{k: PRICES["irrigation_days"][k] for k in ("unit", "source", "status")}),
        Assumption(name="seasons_per_year", value=seasons, **{k: PRICES["seasons_per_year"][k] for k in ("unit", "source", "status")}),
    ]
    return SavingsReport(batch_id=plan.batch_id, date=date, scenario=scenario, items=items, day=day,
                         season=_totals(items, season_factor, proj_tag), year=_totals(items, season_factor * seasons, proj_tag),
                         assumptions=assumptions, warnings=warnings, tag=day_tag)
