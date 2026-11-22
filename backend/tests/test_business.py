"""A-14c: per-hectare economics of the pilot, scale-up scenarios and GET /api/business."""
import time

import pytest
from fastapi.testclient import TestClient

from app.engine.business import BusinessReport, business
from app.main import app
from app.store import init_store

init_store()


def by_id(b, sid):
    return next(s for s in b.scenarios if s.id == sid)


def test_pilot_hectares_are_the_farms_that_receive_water():
    p = business().pilot
    assert p.farms_total == 10 and p.farms_receiving == 9  # lettuce farm C is blocked
    assert p.total_area_ha == pytest.approx(32.4) and p.pilot_ha == pytest.approx(31.4)  # 32.4 ha minus C's 1 ha
    assert p.irrigation_days == 150 and p.tag.status == "PROJECTION"


def test_per_hectare_figures_match_the_savings_report():
    from app.engine.plan import plan
    from app.engine.savings import savings

    r = savings(plan(), date="2026-11-21")
    p = business(report=r).pilot
    farmers_day = sum(i.farmer_net_tnd for i in r.items if i.m3 > 0)
    assert p.farmers_net_tnd_per_ha_season == pytest.approx(farmers_day * 150 / p.pilot_ha, abs=0.01)
    assert p.qatra_fee_tnd_per_ha_season == pytest.approx(sum(i.qatra_fee_tnd for i in r.items) * 150 / p.pilot_ha, abs=0.01)
    assert p.nitrogen_kg_per_ha_season == pytest.approx(sum(i.nitrogen_kg for i in r.items) * 150 / p.pilot_ha, abs=0.01)


def test_scenario_is_hectares_times_per_hectare():
    b = business()
    p = b.pilot
    for s in b.scenarios:
        assert s.farmers_saving_tnd_per_year == pytest.approx(s.ha * p.farmers_net_tnd_per_ha_season * p.seasons_per_year, abs=0.01)
        assert s.qatra_revenue_tnd_per_year == pytest.approx(s.ha * p.qatra_fee_tnd_per_ha_season * p.seasons_per_year, abs=0.01)
        assert s.well_water_saved_m3_per_year == pytest.approx(s.ha * p.well_water_replaced_m3_per_ha_season, abs=0.1)
        assert s.electricity_saved_kwh_per_year == pytest.approx(s.ha * p.electricity_saved_kwh_per_ha_season, abs=0.1)
    assert by_id(b, "ha-1000").farmers_saving_tnd_per_year == pytest.approx(10 * by_id(b, "ha-100").farmers_saving_tnd_per_year, rel=1e-6)


def test_qatra_revenue_is_ten_percent_of_the_farmers_saving():
    # the savings fee rule: the fee is 10% of the NET saving, i.e. 1/9 of what the farmers keep
    for s in business().scenarios:
        assert s.qatra_revenue_tnd_per_year == pytest.approx(s.farmers_saving_tnd_per_year / 9, rel=0.01, abs=0.05)
        total = s.farmers_saving_tnd_per_year + s.qatra_revenue_tnd_per_year
        assert s.qatra_revenue_tnd_per_year == pytest.approx(0.10 * total, rel=0.01, abs=0.05)


def test_territory_hectares_are_reported_and_the_money_is_a_projection():
    b = business()
    keys = {t.key: t for t in b.territory}
    assert keys["equipped_ha"].value == 7819 and keys["irrigated_ha"].value == 2778 and keys["perimeter_ha"].value == 257
    assert all(t.tag.status == "REPORTED" and t.source_url for t in b.territory)
    assert by_id(b, "equipped").ha == 7819 and by_id(b, "irrigated").ha == 2778
    assert by_id(b, "equipped").ha_tag.status == "REPORTED" and by_id(b, "pilot").ha_tag.status == "SIMULATED"
    assert all(s.tag.status == "PROJECTION" for s in b.scenarios)  # a projection is never labelled reported


def test_adoption_rate_scales_linearly():
    full, part = business(adoption_rate=1.0), business(adoption_rate=0.3)
    for a, c in zip(full.scenarios, part.scenarios):
        assert c.adoption_rate == 0.3
        assert c.farmers_saving_tnd_per_year == pytest.approx(0.3 * a.farmers_saving_tnd_per_year, abs=0.02)
        assert c.qatra_revenue_tnd_per_year == pytest.approx(0.3 * a.qatra_revenue_tnd_per_year, abs=0.02)
        assert c.well_water_saved_m3_per_year == pytest.approx(0.3 * a.well_water_saved_m3_per_year, abs=0.2)
    assert any("30%" in w for w in part.warnings)


def test_zero_hectares_and_custom_hectares():
    z = by_id(business(hectares=0), "custom")
    assert z.ha == 0 and z.farmers_saving_tnd_per_year == 0 and z.qatra_revenue_tnd_per_year == 0 and z.well_water_saved_m3_per_year == 0
    c = by_id(business(hectares=500), "custom")
    assert c.ha == 500 and c.ha_tag.status == "ESTIMATE"
    assert c.farmers_saving_tnd_per_year == pytest.approx(5 * by_id(business(), "ha-100").farmers_saving_tnd_per_year, rel=1e-6)
    assert business(adoption_rate=0).scenarios[1].farmers_saving_tnd_per_year == 0


def test_assumptions_inherit_to_verify_and_state_the_scale_up_rule():
    b = business()
    a = {x.name: x for x in b.assumptions}
    assert a["fertiliser_price"].status == "TO_VERIFY" and a["treated_water_price"].status == "TO_VERIFY"
    assert a["saving_per_hectare"].status == "PROJECTION" and "same saving per hectare as the pilot" in a["saving_per_hectare"].source
    assert any("to be verified" in w for w in b.warnings)
    assert any("no profit" in w for w in b.warnings) and not any("profit" in s.id for s in b.scenarios)


def test_original_business_view_fields_are_kept():
    b = business()
    assert b.area_ha == 257 and b.farms == 10 and b.qatra_share_pct == 10 and b.national_areas == 36
    assert b.total_saving_tnd == by_id(b, "perimeter").farmers_saving_tnd_per_year
    assert b.steg_value_tnd == pytest.approx(b.steg_kwh_avoided * 0.4563, rel=1e-4)  # STEG production cost 2025, 456.3 millimes/kWh


def test_endpoint_shape_speed_and_parameters():
    with TestClient(app) as c:
        t0 = time.perf_counter()
        r = c.get("/api/business")
        assert r.status_code == 200 and time.perf_counter() - t0 < 1.0
        BusinessReport.model_validate(r.json())
        body = r.json()
        assert body["pilot"]["pilot_ha"] == pytest.approx(31.4) and len(body["scenarios"]) == 6 and body["adoption_rate"] == 1
        more = c.get("/api/business?hectares=500&adoption_rate=0.3").json()
        assert more["adoption_rate"] == 0.3 and more["scenarios"][-1]["id"] == "custom" and more["scenarios"][-1]["ha"] == 500
        assert c.get("/api/business?hectares=0").status_code == 200
        assert c.get("/api/business?hectares=-1").status_code == 422
        assert c.get("/api/business?adoption_rate=1.5").status_code == 422
