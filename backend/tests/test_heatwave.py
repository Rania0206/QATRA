import pytest

from app.engine import heatwave as hw
from app.store import init_store

HOT_DAY = "2026-08-26"
NORMAL_DAY = "2026-07-08"  # no outage, in the data


@pytest.fixture(scope="module", autouse=True)
def store():
    init_store()


# ---------------------------------------------------------------- inputs
def test_load_day_has_24_hours_and_the_heatwave_day_exists():
    rows = hw.load_day(HOT_DAY)  # 2026-08-26 must exist in the weather series
    assert [r["hour"] for r in rows] == list(range(24))
    assert rows[14]["temp_c"] == pytest.approx(43.97) and rows[14]["radiation_w_m2"] == pytest.approx(736.1)
    assert rows[0]["radiation_w_m2"] == 0


def test_load_day_unknown_date_is_a_clear_error():
    with pytest.raises(ValueError, match="2030-01-01"):
        hw.load_day("2030-01-01")


def test_outage_hours_follow_the_13_to_17_window():
    assert hw.outage_hours(HOT_DAY) == [13, 14, 15, 16]  # 13:00-17:00: the hour starting at 17:00 is served
    assert hw.outage_hours(NORMAL_DAY) == []


def test_scenario_and_pump_come_from_the_data_pack():
    sc = hw.get_scenario("heatwave_outage")
    assert sc["date"] == HOT_DAY and sc["basin_initial_m3"] == 600
    p = hw.default_pump()
    assert (p["flow_m3_h"], p["power_kW"]) == (150, 44.6)
    assert p["kwh_per_m3"] == pytest.approx(44.6 / 150)


# ---------------------------------------------------------------- demand profile
def test_demand_is_spread_over_06_to_20_and_scaled_by_et0():
    d = hw.demand_profile(HOT_DAY)
    assert len(d) == 24
    assert all(d[h] > 0 for h in range(6, 20)) and all(d[h] == 0 for h in list(range(6)) + [20, 21, 22, 23])
    assert len(set(d[6:20])) == 1  # even spread
    expected = sum(f["need_m3"] for f in hw.farm_needs(HOT_DAY)) / hw.EFFICIENCY  # Dev A's need formula / 0.9
    assert sum(d) == pytest.approx(expected)
    assert 500 < sum(d) < 3000  # plausible order of magnitude for ~11 ha of olive and alfalfa


def test_only_farms_in_season_and_allowed_for_treated_water_need_water():
    crops = {f["crop"] for f in hw.growing_farms(HOT_DAY)}  # August
    assert crops == {"olive", "alfalfa"}  # winter cereals are not growing, lettuce is forbidden
    assert {f["farm_id"] for f in hw.growing_farms(HOT_DAY)} == {"A", "B", "D", "H", "I"}


def test_demand_scales_with_et0():
    assert hw.daily_rain("2026-07-08") == 0 and hw.daily_rain(HOT_DAY) == 0  # no rain credit on either day
    low, high = hw.demand_profile("2026-07-08"), hw.demand_profile(HOT_DAY)
    ratio = sum(high) / sum(low)
    assert ratio == pytest.approx(hw.daily_et0(HOT_DAY) / hw.daily_et0("2026-07-08"))


# ---------------------------------------------------------------- the naive run
def test_heatwave_day_leaves_the_farms_without_water_during_the_outage():
    demand = hw.demand_profile(HOT_DAY)
    r = hw.naive_run(HOT_DAY, demand)
    outage_with_demand = [h for h in hw.outage_hours(HOT_DAY) if demand[h] > 0]
    assert r["hours_without_water"] > 0
    assert r["hours_without_water"] == len(outage_with_demand) == 4
    for h in outage_with_demand:
        row = r["hourly"][h]
        assert (row["pump_on"], row["delivered_m3"], row["grid_kw"]) == (False, 0, 0)
        assert row["unserved_m3"] == pytest.approx(demand[h], abs=0.001)
    assert r["unserved_m3"] == pytest.approx(sum(demand[h] for h in outage_with_demand), abs=0.1)
    assert r["delivered_m3"] + r["unserved_m3"] == pytest.approx(r["demand_m3"], abs=0.2)  # each total is rounded to 0.1


def test_outside_the_outage_the_pump_serves_the_demand_from_the_grid():
    demand = hw.demand_profile(HOT_DAY)
    r = hw.naive_run(HOT_DAY, demand)
    pump = hw.default_pump()
    for row in r["hourly"]:
        if not row["outage"] and demand[row["hour"]] > 0:
            assert row["pump_on"] and row["delivered_m3"] == pytest.approx(demand[row["hour"]], abs=0.001)
            assert row["grid_kw"] == pytest.approx(row["delivered_m3"] * pump["kwh_per_m3"], abs=0.001)
    assert r["grid_kwh"] == pytest.approx(r["delivered_m3"] * pump["kwh_per_m3"], abs=0.2)


def test_a_day_without_outage_has_no_hour_without_water():
    r = hw.naive_day(NORMAL_DAY)
    assert r["outage_hours"] == [] and r["hours_without_water"] == 0 and r["unserved_m3"] == 0
    assert r["delivered_m3"] == pytest.approx(r["demand_m3"])


def test_pump_capacity_limits_delivery_even_without_outage():
    demand = [0.0] * 24
    demand[10] = 400.0  # more than the 150 m3/h of TP1
    r = hw.naive_run(NORMAL_DAY, demand)
    assert r["hourly"][10]["delivered_m3"] == 150 and r["hourly"][10]["unserved_m3"] == 250
    assert r["hours_without_water"] == 0  # water was delivered, only part of the demand


def test_no_demand_hour_is_not_a_hour_without_water():
    r = hw.naive_run(HOT_DAY, [0.0] * 24)
    assert r["hours_without_water"] == 0 and r["demand_m3"] == 0


def test_result_is_labelled_and_complete():
    r = hw.naive_day(HOT_DAY)
    assert r["tag"]["status"] == "SIMULATED" and r["tag"]["source"]
    assert r["caveat"] == "NASA POWER ~0.5 deg grid: coastal extremes smoothed"
    assert r["demand_status"] == "ESTIMATE" and r["policy"] == "naive"
    assert len(r["hourly"]) == 24 and {"hour", "pump_on", "delivered_m3", "grid_kw", "unserved_m3"} <= set(r["hourly"][0])
    assert r["hourly"][14]["temp_c"] == pytest.approx(43.97)


def test_wrong_demand_length_is_rejected():
    with pytest.raises(ValueError):
        hw.naive_run(HOT_DAY, [1.0] * 12)


# ================================================================ B-05b: QATRA policy
@pytest.fixture(scope="module")
def scenario():
    return hw.get_scenario("heatwave_outage")


@pytest.fixture(scope="module")
def qatra(scenario):
    return hw.qatra_run(HOT_DAY, basin_initial_m3=scenario["basin_initial_m3"], pv_kwp=scenario["pv_kWp"],
                        batch_m3=scenario["batch_volume_m3"])


def test_naive_leaves_hours_without_water_and_qatra_does_not(qatra):
    assert hw.naive_day(HOT_DAY)["hours_without_water"] > 0
    assert qatra["hours_without_water"] == 0 and qatra["unserved_m3"] == 0
    assert qatra["delivered_m3"] == pytest.approx(qatra["demand_m3"], abs=0.2)


def test_no_grid_power_during_the_outage(qatra):
    for r in qatra["hourly"]:
        if r["outage"]:
            assert r["grid_kw"] == 0 and r["source"] != "grid"
    assert qatra["outage_hours"] == [13, 14, 15, 16]
    assert all(qatra["hourly"][h]["source"] == "basin" for h in qatra["outage_hours"])  # irrigated by gravity


def test_basin_never_below_zero_or_above_capacity(qatra):
    assert qatra["basin_capacity_m3"] == 3000
    for r in qatra["hourly"]:
        assert 0 <= r["basin_m3"] <= 3000
    assert qatra["hourly"][0]["basin_m3"] == 600  # starts at the scenario level


def test_basin_balance_adds_up_hour_by_hour(qatra):
    level = 600.0
    for r in qatra["hourly"]:
        level = level - r["basin_out_m3"] + r["basin_in_m3"]
        assert r["basin_m3"] == pytest.approx(level, abs=0.01)


def test_pump_power_and_solar_stay_within_their_limits(qatra, scenario):
    solar = hw.pv_kw(HOT_DAY, scenario["pv_kWp"])
    pump = hw.default_pump()
    for r in qatra["hourly"]:
        assert r["pump_kw"] <= pump["power_kW"] + 0.01
        assert r["solar_kw"] <= solar[r["hour"]] + 0.01  # never more solar than the array makes
    assert qatra["solar_kwh"] <= sum(solar) + 0.1


def test_pv_is_the_50_kwp_estimate_scaled_to_60():
    base, scaled = hw.pv_kw(HOT_DAY, 50), hw.pv_kw(HOT_DAY, 60)
    assert scaled[12] == pytest.approx(base[12] * 1.2) and base[12] == pytest.approx(36.888)
    assert scaled[0] == 0 and scaled[23] == 0


def test_surplus_solar_fills_the_basin_in_the_morning(qatra):
    assert sum(qatra["hourly"][h]["basin_in_m3"] for h in range(8, 13)) > 0
    assert qatra["hourly"][12]["basin_m3"] > qatra["hourly"][8]["basin_m3"]


def test_without_solar_and_an_empty_basin_the_outage_cannot_be_covered():
    q = hw.qatra_run(HOT_DAY, basin_initial_m3=0, pv_kwp=0)  # the rules do not invent water
    assert q["hours_without_water"] == 4 and q["unserved_m3"] > 0
    assert all(q["hourly"][h]["grid_kw"] == 0 for h in range(13, 17))
    assert q["solar_kwh"] == 0 and q["grid_kwh"] > 0  # outside the outage the grid is the backup


def test_the_plant_batch_limits_what_can_be_pumped():
    q = hw.qatra_run(HOT_DAY, basin_initial_m3=0, pv_kwp=60, batch_m3=300)
    pumped = sum(r["delivered_m3"] - r["basin_out_m3"] + r["basin_in_m3"] for r in q["hourly"])
    assert pumped <= 300.1


def test_a_huge_array_never_overfills_the_basin():
    q = hw.qatra_run(HOT_DAY, basin_initial_m3=2900, pv_kwp=600)
    assert max(r["basin_m3"] for r in q["hourly"]) <= 3000 + 1e-6


def test_a_day_without_outage_is_served_too():
    q = hw.qatra_run(NORMAL_DAY)
    assert q["outage_hours"] == [] and q["hours_without_water"] == 0 and q["unserved_m3"] == 0


def test_scenario_result_has_the_contract_shape():
    r = hw.run_scenario("heatwave_outage")
    assert {"scenario_id", "label", "date", "allocation", "baseline", "naive", "qatra", "caveat", "tag"} <= set(r)
    a = r["allocation"]
    assert a["batch_id"] == "SSUD-20260826" and len(a["schedule"]) == 24
    assert {s["source"] for s in a["schedule"]} <= {"solar", "grid", "basin", "off"}
    assert [s["hour"] for s in a["schedule"]] == list(range(24))
    assert r["baseline"]["energy_kwh"] == r["naive"]["grid_kwh"] and r["baseline"]["solar_share"] == 0
    assert r["naive"]["hours_without_water"] > 0 and r["qatra"]["hours_without_water"] == 0
    assert a["energy_kwh"] == pytest.approx(r["qatra"]["solar_kwh"] + r["qatra"]["grid_kwh"], abs=0.1)
    assert a["fresh_replaced_m3"] == r["qatra"]["delivered_m3"]
    assert len(r["naive"]["hourly"]) == len(r["qatra"]["hourly"]) == 24
    assert r["tag"]["status"] == "SIMULATED" and r["caveat"] == "NASA POWER ~0.5 deg grid: coastal extremes smoothed"


def test_stub_allocation_is_said_and_never_waters_a_blocked_crop():
    a = hw.run_scenario("heatwave_outage")["allocation"]
    assert any("Stub allocation" in w and "A-05" in w for w in a["warnings"])
    items = {i["farm_id"]: i for i in a["items"]}
    assert items["C"]["status"] == "blocked" and items["C"]["m3"] == 0 and "Art. 5" in items["C"]["cap_reason"]
    assert {k for k, v in items.items() if v["status"] == "allocated"} == {"A", "B", "D", "H", "I"}
    assert sum(i["m3"] for i in a["items"]) == pytest.approx(a["fresh_replaced_m3"], abs=0.3)


def test_unknown_scenario_raises_keyerror():
    with pytest.raises(KeyError):
        hw.run_scenario("nope")
