"""A-14c: per-hectare economics of the pilot and what they would be at a larger scale.

From the default savings report (engine/savings: the default plan, one day) the pilot's figures are turned into
per-hectare, per-season figures, then multiplied by a number of hectares:

    pilot_ha            = sum of the areas of the farms that receive water (blocked farms and farms with 0 m3 are out)
    per_ha_season(x)    = sum over those farms of (x of one day) x irrigation_days / pilot_ha      (projection: the day repeated)
    scenario(ha)        = per_ha_season(x) x seasons_per_year x ha x adoption_rate                 (same saving per hectare)

x is: the farmers' net saving, QATRA's fee, the well water replaced (m3), the pumping electricity saved (kWh) and
the nitrogen delivered (kg). QATRA's revenue is only its fee (10% of the saving, the savings rule): the data has no
QATRA costs, so no profit is computed.

Hectares of the territory are REPORTED (data/clean/context_figures.csv); every money, water and energy figure is a
PROJECTION (it is the pilot's saving per hectare, scaled). The two are never mixed in one tag.
"""
import re
from typing import Literal, Optional

from pydantic import BaseModel

from app.engine.farms import get_farm
from app.engine.needs import forecast_dates
from app.engine.plan import plan
from app.engine.savings import WELL_SOURCES, Assumption, SavingsReport, savings
from app.schemas import BusinessView, Tag
from app.store import get_store

CONTEXT_DATASET = "context_figures"
AREA_NAME = "Zaouiet-Sousse (Sousse Sud)"
PRESET_HA = (100.0, 1000.0)  # round numbers between the pilot and the national figures


class TerritoryFigure(BaseModel):
    id: str  # id in context_figures.csv
    key: Literal["equipped_ha", "irrigated_ha", "perimeter_ha", "perimeters"]
    label: str
    value: float
    unit: str
    period: str
    source: str
    source_url: str
    note: Optional[str] = None
    tag: Tag


class PilotMetrics(BaseModel):
    date: Optional[str] = None
    farms_total: int
    farms_receiving: int  # farms that get more than 0 m3
    total_area_ha: float  # all farms of the demo
    pilot_ha: float  # farms that receive water
    irrigation_days: float
    seasons_per_year: float
    farmers_net_tnd_per_ha_season: float
    qatra_fee_tnd_per_ha_season: float
    well_water_replaced_m3_per_ha_season: float
    electricity_saved_kwh_per_ha_season: float
    nitrogen_kg_per_ha_season: float
    tag: Tag


class Scenario(BaseModel):
    id: str
    label: str
    kind: Literal["pilot", "preset", "perimeter", "territory", "custom"]
    ha: float
    ha_tag: Tag  # where the hectares come from (REPORTED for the territory figures)
    adoption_rate: float
    farmers_saving_tnd_per_year: float
    qatra_revenue_tnd_per_year: float
    well_water_saved_m3_per_year: float
    electricity_saved_kwh_per_year: float
    nitrogen_kg_per_year: float
    tag: Tag  # the money, water and energy figures: PROJECTION


class BusinessReport(BusinessView):
    """GET /api/business: the original BusinessView fields (for the Zaouiet-Sousse perimeter) plus the pilot and scale-up."""

    date: Optional[str] = None
    adoption_rate: float = 1.0
    pilot: PilotMetrics
    territory: list[TerritoryFigure]
    scenarios: list[Scenario]
    assumptions: list[Assumption]
    warnings: list[str]


# ---------------------------------------------------------------- territory figures (REPORTED), through the store
def _num(text) -> Optional[float]:
    m = re.search(r"[\d][\d\s.,]*", str(text))
    if not m:
        return None
    try:
        return float(re.sub(r"[\s,]", "", m.group(0)))
    except ValueError:
        return None


def _territory() -> list[TerritoryFigure]:
    wanted = {  # id -> (key, label)
        "CF10": ("equipped_ha", "Treated-wastewater perimeters, equipped area (Tunisia)"),
        "CF11": ("irrigated_ha", "Treated-wastewater perimeters, area actually irrigated (Tunisia)"),
        "CF31": ("perimeter_ha", "Zaouiet-Sousse perimeter, equipped area (fed by Sousse Sud)"),
        "CF09": ("perimeters", "Treated-wastewater irrigated perimeters (Tunisia)"),
    }
    try:
        df = get_store()[CONTEXT_DATASET]
    except KeyError:
        return []
    official = df[df["id"] == "CF12"]
    check = f"official dataset 2021/22 (Agridata): {official.iloc[0]['value']} ha" if len(official) else None
    out = []
    for fid, (key, label) in wanted.items():
        row = df[df["id"] == fid]
        v = _num(row.iloc[0]["value"]) if len(row) else None
        if v is None:
            continue
        r = row.iloc[0]
        note = check if key in ("equipped_ha", "irrigated_ha") else None
        if str(r["publication_date"]).upper() == "TO_VERIFY":
            note = "; ".join(x for x in (note, "publication date to verify") if x)
        out.append(TerritoryFigure(id=fid, key=key, label=label, value=v, unit=str(r["unit"]), period=str(r["period"]),
                                   source=str(r["source_name"]), source_url=str(r["source_url"]), note=note or None,
                                   tag=Tag(status="REPORTED", source=f"context_figures.csv {fid}: {r['source_name']}")))
    return out


def _steg_cost_tnd_per_kwh() -> Optional[float]:
    """STEG average production cost 2025 (REPORTED, press): 456.3 millimes/kWh. Used only for the old steg_value_tnd field."""
    try:
        return float(get_store()["energy_params"]["steg_average_production_cost_2025"]["value"]) / 1000.0
    except (KeyError, TypeError, ValueError):
        return None


# ---------------------------------------------------------------- the calculation
def business(hectares: Optional[float] = None, adoption_rate: float = 1.0, report: Optional[SavingsReport] = None) -> BusinessReport:
    """Pilot per-hectare economics and scale-up scenarios. `report` defaults to the savings of the default plan."""
    if report is None:
        dates = forecast_dates()
        report = savings(plan(), date=dates[0] if dates else None)
    warnings: list[str] = []
    a = {x.name: x for x in report.assumptions}
    days = a["irrigation_days"].value if "irrigation_days" in a else 150.0
    seasons = a["seasons_per_year"].value if "seasons_per_year" in a else 1.0
    fee_pct = a["qatra_fee_pct"].value if "qatra_fee_pct" in a else 10.0

    # --- pilot: the farms that receive water
    receiving = [i for i in report.items if i.m3 > 0 and i.status != "blocked"]
    area = {i.farm_id: (get_farm(i.farm_id).area_ha if get_farm(i.farm_id) else 0.0) for i in report.items}
    total_ha = sum(area.values())
    pilot_ha = sum(area[i.farm_id] for i in receiving)  # hectares that get water
    on_well = [i for i in receiving if (get_farm(i.farm_id) and get_farm(i.farm_id).fresh_source in WELL_SOURCES)]

    def per_ha(values: list[float]) -> float:
        """sum of one day's figure x irrigation days / pilot hectares = the figure of one hectare for one season."""
        return round(sum(values) * days / pilot_ha, 2) if pilot_ha > 0 else 0.0

    pilot = PilotMetrics(
        date=report.date, farms_total=len(report.items), farms_receiving=len(receiving), total_area_ha=round(total_ha, 2),
        pilot_ha=round(pilot_ha, 2), irrigation_days=days, seasons_per_year=seasons,
        farmers_net_tnd_per_ha_season=per_ha([i.farmer_net_tnd for i in receiving]),
        qatra_fee_tnd_per_ha_season=per_ha([i.qatra_fee_tnd for i in receiving]),
        well_water_replaced_m3_per_ha_season=per_ha([i.m3 for i in on_well]),  # only farms that stop pumping a well
        electricity_saved_kwh_per_ha_season=per_ha([i.well_kwh_saved for i in receiving]),
        nitrogen_kg_per_ha_season=per_ha([i.nitrogen_kg for i in receiving]),
        tag=Tag(status="PROJECTION", source=f"default plan of {report.date or 'the first forecast day'} x {days:g} irrigation days"),
    )
    if pilot_ha <= 0:
        warnings.append("No farm receives water in the default plan: every per-hectare figure is 0.")

    # --- scenarios
    territory = _territory()
    by_key = {t.key: t for t in territory}
    proj = Tag(status="PROJECTION", source="pilot saving per hectare x hectares x adoption rate (same saving per hectare as the pilot)")
    pilot_tag = Tag(status="SIMULATED", source="areas of the demo farms (data/simulated/sim_farms)")

    def scenario(sid: str, label: str, kind: str, ha: float, ha_tag: Tag) -> Scenario:
        """each total = per-hectare season figure x seasons per year x hectares x adoption rate."""
        k = seasons * ha * adoption_rate
        return Scenario(
            id=sid, label=label, kind=kind, ha=ha, ha_tag=ha_tag, adoption_rate=adoption_rate,
            farmers_saving_tnd_per_year=round(pilot.farmers_net_tnd_per_ha_season * k, 2),
            qatra_revenue_tnd_per_year=round(pilot.qatra_fee_tnd_per_ha_season * k, 2),
            well_water_saved_m3_per_year=round(pilot.well_water_replaced_m3_per_ha_season * k, 1),
            electricity_saved_kwh_per_year=round(pilot.electricity_saved_kwh_per_ha_season * k, 1),
            nitrogen_kg_per_year=round(pilot.nitrogen_kg_per_ha_season * k, 1), tag=proj)

    rows: list[Scenario] = [scenario("pilot", "The pilot farms", "pilot", pilot.pilot_ha, pilot_tag)]
    for ha in PRESET_HA:
        rows.append(scenario(f"ha-{ha:g}", f"{ha:,.0f} ha", "preset", ha, Tag(status="ESTIMATE", source="round number chosen for the demo")))
    if "perimeter_ha" in by_key:
        t = by_key["perimeter_ha"]
        rows.append(scenario("perimeter", "Zaouiet-Sousse perimeter", "perimeter", t.value, t.tag))
    if "irrigated_ha" in by_key:
        t = by_key["irrigated_ha"]
        rows.append(scenario("irrigated", "Treated-water area irrigated in Tunisia", "territory", t.value, t.tag))
    if "equipped_ha" in by_key:
        t = by_key["equipped_ha"]
        rows.append(scenario("equipped", "Treated-water area equipped in Tunisia", "territory", t.value, t.tag))
    if hectares is not None:
        rows.append(scenario("custom", f"{hectares:,.0f} ha (your figure)", "custom", hectares, Tag(status="ESTIMATE", source="hectares given in the request")))
    if not territory:
        warnings.append("Territory figures (context_figures) are not available: the national scenarios are missing.")

    # --- the original BusinessView fields, for the Zaouiet-Sousse perimeter
    peri = next((s for s in rows if s.id == "perimeter"), rows[0])
    steg = _steg_cost_tnd_per_kwh()
    n_perimeters = by_key["perimeters"].value if "perimeters" in by_key else 36

    # --- assumptions: the savings ones (with their TO_VERIFY) plus the scale-up ones
    assumptions = list(report.assumptions) + [
        Assumption(name="saving_per_hectare", value=pilot.farmers_net_tnd_per_ha_season, unit="TND/ha/season", status="PROJECTION",
                   source="same saving per hectare as the pilot (crop mix, water and well depths of the pilot farms)"),
        Assumption(name="adoption_rate", value=adoption_rate, unit="share (0..1)", status="PROJECTION",
                   source="share of the hectares that join; 100% by default, set by the request"),
        Assumption(name="qatra_revenue_rule", value=fee_pct, unit="% of the farmers' saving", status="ESTIMATE",
                   source="QATRA's only income is its share of the saving; no cost data, so no profit is shown"),
    ]
    to_verify = [x.name for x in report.assumptions if x.status == "TO_VERIFY"]
    if to_verify:
        warnings.append("Built on prices still to be verified: " + ", ".join(to_verify) + ".")
    warnings.append("Scale-up assumes the same saving per hectare as the pilot; water supply is not checked "
                    "(more hectares need more treated water than one plant gives).")
    warnings.append("Revenue only: the data has no QATRA costs, so no profit is shown.")
    if adoption_rate < 1:
        warnings.append(f"Adoption rate {adoption_rate * 100:g}%: only that share of the hectares is counted.")

    return BusinessReport(
        area_name=AREA_NAME, area_ha=by_key["perimeter_ha"].value if "perimeter_ha" in by_key else pilot.total_area_ha,
        farms=pilot.farms_total, total_saving_tnd=peri.farmers_saving_tnd_per_year, qatra_share_pct=fee_pct,
        qatra_revenue_tnd=peri.qatra_revenue_tnd_per_year, steg_kwh_avoided=peri.electricity_saved_kwh_per_year,
        steg_value_tnd=round(peri.electricity_saved_kwh_per_year * steg, 2) if steg is not None else 0.0,
        national_areas=int(n_perimeters),
        tag=Tag(status="PROJECTION", source="Zaouiet-Sousse perimeter at the pilot's saving per hectare; STEG value at the 2025 production cost "
                                            "(456.3 millimes/kWh, REPORTED)"),
        date=report.date, adoption_rate=adoption_rate, pilot=pilot, territory=territory, scenarios=rows,
        assumptions=assumptions, warnings=warnings)
