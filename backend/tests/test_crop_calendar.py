"""A-05f: crop calendar (needs.CROP_CALENDAR), one growing rule for the plan and the heatwave screen,
soil cap for every farm, date validation, plan date, honest leftover wording."""
import pytest
from fastapi.testclient import TestClient

from app.engine import needs
from app.engine.batches import get_batch
from app.engine.farms import get_farm, list_farms
from app.engine.heatwave import growing_farms
from app.engine.needs import daily_need, is_growing, kc_for
from app.engine.plan import allocate, plan
from app.main import app
from app.store import init_store

init_store()

HEATWAVE = "2026-08-26"
HEATWAVE_BATCH = "SSUD-20260826"


def day(month: int) -> str:
    return f"2026-{month:02d}-15"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------- the calendar
@pytest.mark.parametrize("crop", ["wheat", "barley", "barley_fodder", "oat_fodder"])
def test_winter_cereals_are_idle_from_june_to_october(crop):
    assert all(kc_for(crop, day(m)) == 0.0 for m in range(6, 11))
    assert not is_growing(crop, "2026-08-26")


def test_winter_cereal_stages_follow_fao56_from_crop_kc():
    ini, mid, end = 0.4, 1.15, 0.3  # wheat in crop_kc.csv
    assert kc_for("wheat", day(11)) == ini and kc_for("wheat", day(12)) == ini  # sown Nov-Dec
    assert ini < kc_for("wheat", day(1)) < kc_for("wheat", day(2)) < mid  # development: interpolated
    assert kc_for("wheat", day(3)) == mid and kc_for("wheat", day(4)) == mid  # mid-season Mar-Apr
    assert kc_for("wheat", day(5)) == end  # late May
    assert (kc_for("barley", day(11)), kc_for("barley", day(4)), kc_for("barley_fodder", day(4))) == (0.3, 1.15, 1.15)  # alias
    assert (kc_for("oat_fodder", day(11)), kc_for("oat_fodder", day(4))) == (0.3, 1.15)


@pytest.mark.parametrize("crop", ["olive", "alfalfa"])
def test_perennials_need_water_all_year_with_a_lower_kc_in_winter(crop):
    ini, mid = {"olive": (0.65, 0.70), "alfalfa": (0.40, 0.95)}[crop]
    assert all(kc_for(crop, day(m)) > 0 for m in range(1, 13))
    assert all(kc_for(crop, day(m)) == ini for m in (12, 1, 2))
    assert all(kc_for(crop, day(m)) == mid for m in range(4, 11))
    assert ini < kc_for(crop, day(3)) < mid and ini < kc_for(crop, day(11)) < mid  # shoulder months


def test_lettuce_is_grown_from_september_to_april_only():
    assert all(kc_for("lettuce", day(m)) > 0 for m in (9, 10, 11, 12, 1, 2, 3, 4))
    assert all(kc_for("lettuce", day(m)) == 0.0 for m in (5, 6, 7, 8))


def test_none_only_for_an_unknown_crop_and_zero_outside_the_season():
    assert kc_for("dragonfruit", "2026-08-26") is None and not is_growing("dragonfruit", "2026-08-26")
    assert kc_for("wheat", "2026-08-26") == 0.0 and kc_for("wheat", "2026-08-26") is not None


def test_without_a_usable_date_the_mid_season_kc_is_used():
    assert kc_for("wheat") == kc_for("wheat", None) == kc_for("wheat", "not a date") == 1.15


def test_every_crop_of_the_demo_farms_has_a_calendar():
    assert {needs.KC_ALIAS.get(f.crop, f.crop) for f in list_farms()} <= set(needs.CROP_CALENDAR)
    assert all(len(cal) == 12 for cal in needs.CROP_CALENDAR.values())


def test_a_sleeping_crop_has_zero_need_and_keeps_its_row():
    n = daily_need(get_farm("F"), HEATWAVE)  # wheat in August
    assert n.kc == 0 and n.need_m3 == 0 and n.et0_mm > 5


def test_21_nov_cereals_need_about_8_to_11_m3_per_ha():
    per_ha = {f.id: daily_need(f, "2026-11-21").need_m3 / f.area_ha for f in list_farms() if f.crop in ("wheat", "barley", "barley_fodder", "oat_fodder")}
    assert per_ha and all(7.5 <= v <= 11.5 for v in per_ha.values()), per_ha


# ---------------------------------------------------------------- the plan agrees with the heatwave screen
def test_26_aug_plan_has_the_heatwave_screens_farms_and_volumes(client):
    body = {"date": HEATWAVE, "batch_id": HEATWAVE_BATCH}
    a = client.post("/api/allocate", json=body).json()
    h = client.post("/api/scenarios/heatwave", json={"scenario_id": "heatwave_outage"}).json()
    assert h["date"] == HEATWAVE and h["allocation"]["batch_id"] == HEATWAVE_BATCH
    plan_m3 = {i["farm_id"]: i["m3"] for i in a["items"]}
    screen_m3 = {i["farm_id"]: i["m3"] for i in h["allocation"]["items"]}
    assert {f for f, v in plan_m3.items() if v > 0} == {f for f, v in screen_m3.items() if v > 0} == {"A", "B", "D", "H", "I"}
    assert all(plan_m3[f] == screen_m3[f] for f in screen_m3)  # same numbers farm by farm
    assert sum(plan_m3.values()) == pytest.approx(h["allocated_m3"], abs=0.05)  # 410.8
    assert {f for f, v in plan_m3.items() if v == 0} == {"C", "E", "F", "G", "J"}  # lettuce is blocked, the cereals idle


def test_both_screens_use_one_growing_rule():
    growing = {f["farm_id"] for f in growing_farms(HEATWAVE)}
    assert growing == {"A", "B", "D", "H", "I"}
    assert growing == {f.id for f in list_farms() if daily_need(f, HEATWAVE).need_m3 > 0}  # the plan's needs: the same farms


def test_an_idle_farm_is_named_in_a_warning_and_shows_zero():
    p = allocate(get_batch(HEATWAVE_BATCH), HEATWAVE)
    f = next(i for i in p.items if i.farm_id == "F")
    assert f.m3 == 0 and f.need_m3 == 0 and f.status == "allocated"
    assert any(w.startswith("Farm F: its crop is not growing this month") for w in p.warnings)
    assert not any(w.startswith("Farm C:") and "growing" in w for w in p.warnings)  # a blocked farm has its own reason


def test_21_nov_plan_is_about_half_of_the_old_one():
    a = plan()
    total = sum(i.m3 for i in a.items)
    assert 380 <= total <= 410  # was 799.3 with mid-season Kc all year
    assert a.date == "2026-11-21"


# ---------------------------------------------------------------- soil cap for every farm
def test_farm_i_is_capped_by_the_soil_and_farm_a_is_unchanged():
    items = {i.farm_id: i for i in allocate(get_batch("SSUD-20260829")).items}
    a, i = items["A"], items["I"]
    assert a.status == "conditional" and a.m3 == pytest.approx(a.need_m3 * 0.689, abs=0.15)
    assert i.compat_status == "compatible" and i.status == "capped" and i.m3 == pytest.approx(i.need_m3 * 0.689, abs=0.15)
    assert i.cap_reason.startswith("soil salinity: limited volume")


# ---------------------------------------------------------------- dates are validated
BAD_DATES = ["banana", "2026-02-30", "2026-8-26", "20260826", "9999-12-31", "2019-12-31", "2036-01-01", "2026-08-26T10:00", " 2026-08-26", "2026-W35-3", ""]


@pytest.mark.parametrize("path", ["/api/allocate", "/api/savings"])
@pytest.mark.parametrize("bad", BAD_DATES)
def test_a_bad_date_is_a_422_with_a_clear_message(client, path, bad):
    r = client.post(path, json={"date": bad})
    assert r.status_code == 422, (path, bad, r.status_code)
    assert "YYYY-MM-DD" in r.text or "between 2020 and 2035" in r.text


@pytest.mark.parametrize("path", ["/api/allocate", "/api/savings"])
@pytest.mark.parametrize("ok", ["2026-11-21", "2026-08-26", "2028-02-29", "2020-01-01", "2035-12-31"])
def test_a_good_date_is_accepted(client, path, ok):
    assert client.post(path, json={"date": ok}).status_code == 200


def test_a_date_that_is_not_a_string_is_a_422(client):
    assert client.post("/api/allocate", json={"date": 20260826}).status_code == 422


def test_the_response_carries_the_plan_date(client):
    assert client.post("/api/allocate", json={}).json()["date"] == "2026-11-21"  # default: first forecast day
    assert client.post("/api/allocate", json={"date": "2026-08-26"}).json()["date"] == "2026-08-26"
    assert client.post("/api/scenarios/heatwave", json={"scenario_id": "heatwave_outage"}).json()["allocation"]["date"] == HEATWAVE
    assert plan().date == "2026-11-21"


# ---------------------------------------------------------------- unknown farm, wording
def test_an_unknown_farm_in_farm_ids_is_a_404(client):
    r = client.post("/api/allocate", json={"farm_ids": ["A", "Z"]})
    assert r.status_code == 404 and "Z" in r.json()["detail"]
    assert client.post("/api/allocate", json={"farm_ids": ["A"]}).status_code == 200
    assert client.post("/api/allocate", json={"farm_ids": []}).status_code == 200  # an empty list is still a (empty) plan


def test_leftover_wording_says_the_water_stays_at_the_plant():
    p = allocate(get_batch("SSUD-20260829"))
    assert any(w == f"{p.batch_volume_m3 - p.total_allocated_m3:.1f} m3 not sent today: stays at the plant." for w in p.warnings)
    assert not any("basin" in w for w in p.warnings)


@pytest.mark.parametrize("batch_id,why", [("SSUD-20260818", "analysis expired"), ("SSUD-20260821", "not compliant")])
def test_a_batch_that_cannot_be_reused_has_its_own_sentence(batch_id, why):
    p = allocate(get_batch(batch_id))
    assert f"This batch cannot be reused ({why}): nothing is sent." in p.warnings
    assert not any("not sent today" in w or "basin" in w for w in p.warnings)  # no "stays at the plant" for an unusable batch
    assert p.total_allocated_m3 == 0
