"""The pilot figures must agree between Allocation, Savings, Impact and Business (the screens read these responses)."""
import pytest

from app.engine.business import business
from app.engine.farms import get_farm
from app.engine.plan import plan
from app.engine.savings import savings
from app.store import init_store

init_store()

DAYS = 150


@pytest.fixture(scope="module")
def pilot():
    a = plan()
    s = savings(a, date="2026-11-21")
    return a, s, business(report=s)


def test_allocation_and_savings_show_the_same_water_and_money(pilot):
    a, s, _ = pilot
    assert sum(i.m3 for i in a.items) == pytest.approx(s.day.m3, abs=0.05)  # 799.3
    assert a.fresh_replaced_m3 == pytest.approx(s.day.m3, abs=0.05)
    assert s.day.farmer_net_tnd == pytest.approx(97.23, abs=0.005)
    assert s.season.farmer_net_tnd == pytest.approx(s.day.farmer_net_tnd * DAYS, abs=0.01)  # 14,584.5, shown as 14,585
    assert s.season.m3 == pytest.approx(s.day.m3 * DAYS, abs=0.1)  # 119,895


def test_business_per_hectare_pilot_agrees_with_the_savings_totals_to_its_rounding(pilot):
    _, s, b = pilot
    ha = b.pilot.pilot_ha
    assert b.pilot.farmers_net_tnd_per_ha_season * ha == pytest.approx(s.season.farmer_net_tnd, abs=1.0)
    assert b.pilot.qatra_fee_tnd_per_ha_season * ha == pytest.approx(s.season.qatra_fee_tnd, abs=1.0)
    kwh_day = sum(i.well_kwh_saved for i in s.items)
    assert b.pilot.electricity_saved_kwh_per_ha_season * ha == pytest.approx(kwh_day * DAYS, abs=1.0)


def test_per_hectare_well_water_differs_from_the_total_only_by_the_network_farm(pilot):
    """Business counts farms with their own well; the allocator counts all treated water. The gap is farm H (on the network)."""
    _, s, b = pilot
    network = sum(i.m3 for i in s.items if get_farm(i.farm_id).fresh_source not in ("well", "borehole")) * DAYS
    per_ha_total = b.pilot.well_water_replaced_m3_per_ha_season * b.pilot.pilot_ha
    assert s.season.m3 - per_ha_total == pytest.approx(network, abs=5.0)
