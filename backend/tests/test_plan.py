"""A-05a: rule-based allocation (blocked = 0, soil cap, anti-rebound, proportional sharing)."""
import pytest

from app.engine import plan as plan_mod
from app.engine import soil
from app.engine.batches import get_batch
from app.engine.farms import get_farm, list_farms
from app.engine.needs import forecast_dates
from app.engine.plan import SEASON_DAYS, AllocateOptions, allocate
from app.store import init_store

init_store()

GOOD = "SSUD-20260708"  # valid analyses, EC 3.66 dS/m, 1,200 m3


def by_farm(p):
    return {i.farm_id: i for i in p.items}


def test_ten_farms_and_default_date_is_first_forecast_day():
    p = allocate(get_batch(GOOD))
    assert [i.farm_id for i in p.items] == list("ABCDEFGHIJ")
    assert p.date == forecast_dates()[0]  # the batch is dated July: the date does not have to match
    assert allocate(get_batch(GOOD), "2026-11-23").date == "2026-11-23"


def test_blocked_farm_gets_zero_and_keeps_its_status():
    c = by_farm(allocate(get_batch(GOOD)))["C"]  # lettuce, eaten raw
    assert c.m3 == 0 and c.status == "blocked" and c.compat_status == "blocked"
    assert "raw" in c.cap_reason.lower()
    assert c.need_m3 > 0  # the need is still computed: the plan decides who receives water


def test_conditional_farm_is_capped_with_a_reason():
    a = by_farm(allocate(get_batch(GOOD)))["A"]  # alfalfa on salty soil
    assert a.compat_status == "conditional" and a.status == "conditional"
    assert 0 < a.m3 < a.need_m3
    assert a.cap_reason.startswith("soil salinity: limited volume")


def test_unconstrained_farms_get_their_full_need():
    items = by_farm(allocate(get_batch(GOOD)))
    for fid in "BDEFGHJ":
        assert items[fid].status == "allocated" and items[fid].m3 == pytest.approx(items[fid].need_m3, abs=0.11)


def test_soil_cap_applies_to_every_farm_not_only_the_conditional_ones():
    """Farm I (alfalfa, ECe 1.2) is "compatible" by the rules, but the soil model still limits alfalfa on this batch."""
    items = by_farm(allocate(get_batch(GOOD)))
    i = items["I"]
    assert i.compat_status == "compatible" and i.status == "capped"
    assert 0 < i.m3 < i.need_m3 and i.cap_reason.startswith("soil salinity: limited volume")
    ecw = [a.values["EC_dS_m"] for a in get_batch(GOOD).analyses if "EC_dS_m" in a.values][0]
    farm = get_farm("I")
    cap = soil.cap_volume({"id": "I", "crop": farm.crop, "area_ha": farm.area_ha, "soil_ece": farm.soil_ece,
                           "soil_texture": farm.soil_texture}, ecw)
    assert i.m3 <= i.need_m3 * cap["max_m3_season"] / cap["need_m3_season"] + 0.05  # never above the soil model's cap
    a = items["A"]  # farm A is unchanged: same crop, same water, same ratio of its need
    assert a.status == "conditional" and a.m3 / a.need_m3 == pytest.approx(i.m3 / i.need_m3, abs=0.01)


def test_total_allocated_never_exceeds_the_batch_and_leftover_is_reported():
    p = allocate(get_batch(GOOD))
    assert p.total_allocated_m3 == pytest.approx(sum(i.m3 for i in p.items))
    assert p.total_allocated_m3 <= p.batch_volume_m3
    assert p.fresh_replaced_m3 == p.total_allocated_m3
    assert any("not sent today: stays at the plant" in w for w in p.warnings)
    assert not any("kept in the basin" in w for w in p.warnings)


def test_anti_rebound_never_exceeds_current_well_use(monkeypatch):
    # demo weather needs less than the well use, so make farm B's well use small: 20 m3/day
    farms = [f.model_copy(update={"fresh_m3_season": 20.0 * SEASON_DAYS}) if f.id == "B" else f for f in list_farms()]
    monkeypatch.setattr(plan_mod, "list_farms", lambda: farms)
    p = allocate(get_batch(GOOD))
    b = by_farm(p)["B"]
    assert b.m3 <= 20.0 and b.need_m3 > 20.0 and "anti-rebound" in b.cap_reason
    for f in farms:  # and for every farm
        assert by_farm(p)[f.id].m3 <= f.fresh_m3_season / SEASON_DAYS + 1e-9


def test_proportional_sharing_when_the_batch_is_short():
    full = allocate(get_batch(GOOD))
    short = allocate(get_batch(GOOD).model_copy(update={"volume_m3": 200.0}))  # the total need of 21 Nov is ~390 m3
    assert 199.0 <= short.total_allocated_m3 <= 200.0
    ratios = [i.m3 / i.capped_m3 for i in short.items if i.capped_m3 > 0]
    assert max(ratios) - min(ratios) < 0.01  # everybody gets the same share of their capped need
    assert ratios[0] == pytest.approx(200.0 / sum(i.capped_m3 for i in full.items), abs=0.01)
    assert all(i.status in ("capped", "conditional") for i in short.items if i.compat_status != "blocked")
    assert not any("not sent today" in w for w in short.warnings)  # nothing left over


def test_expired_analysis_gives_a_warning_not_a_crash():
    p = allocate(get_batch("SSUD-20260712"))  # stale analysis
    assert p.total_allocated_m3 == 0 and all(i.m3 == 0 and i.status == "blocked" for i in p.items)
    assert any("analysis expired" in w for w in p.warnings)


def test_batch_over_a_legal_limit_gives_a_warning():
    p = allocate(get_batch("SSUD-20260718"))  # BOD5 / COD / TSS above NT 106.03
    assert p.total_allocated_m3 == 0 and any("NT 106.03" in w for w in p.warnings)


def test_farm_filter_option():
    p = allocate(get_batch(GOOD), options=AllocateOptions(farm_ids=["A", "B"]))
    assert [i.farm_id for i in p.items] == ["A", "B"]


def test_unknown_crop_does_not_crash(monkeypatch):
    farms = [f.model_copy(update={"crop": "dragonfruit"}) if f.id == "H" else f for f in list_farms()]
    monkeypatch.setattr(plan_mod, "list_farms", lambda: farms)
    p = allocate(get_batch(GOOD))  # the rules and the needs both meet an unknown crop
    assert len(p.items) == 10
    assert by_farm(p)["H"].m3 == 0
