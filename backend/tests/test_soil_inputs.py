import pytest

from app.engine import farms as farm_engine
from app.engine import soil, soil_inputs as si
from app.engine.soil import cap_volume as cap_via_soil
from app.store import get_store

ECW = 3.5


@pytest.fixture(scope="module")
def farms():
    return {f.id: f.model_dump() for f in farm_engine.list_farms()}


# ---------------------------------------------------------------- climate inputs
def test_effective_rain_is_70_percent_of_mean_annual_precip():
    df = get_store()["climate_30y_sousse"]
    years = df["date"].dt.year.nunique()
    assert years == 30
    mean_p = df["precipitation_sum"].sum() / years
    assert si.effective_rain_mm_yr() == pytest.approx(0.7 * mean_p)
    assert 250 < si.effective_rain_mm_yr() < 300  # ~389 mm/yr * 0.7


def test_season_etc_is_kc_mid_times_season_et0():
    df = get_store()["climate_30y_sousse"]
    years = df["date"].dt.year.nunique()
    months = df["date"].dt.month
    et0 = df[months.between(4, 10)]["et0_fao_evapotranspiration"].sum() / years
    assert si.season_etc_mm("alfalfa") == pytest.approx(0.95 * et0)  # crop_kc alfalfa kc_mid 0.95


def test_winter_season_wraps_the_new_year():
    assert si._months((11, 5)) == [11, 12, 1, 2, 3, 4, 5]
    assert si.season_etc_mm("wheat") > 0


def test_crop_mapping_is_explicit():
    assert si.CROP_TO_KC["barley_fodder"] == "barley"
    assert si.CROP_TO_KC["oat_fodder"] == "oat_fodder"
    assert si.season_etc_mm("barley_fodder") == pytest.approx(si.season_etc_mm("barley"))


def test_unknown_crop_is_a_clear_error_not_a_default(farms):
    with pytest.raises(si.UnknownCropError, match="banana"):
        si.season_etc_mm("banana")
    with pytest.raises(si.UnknownCropError, match="no silent default"):
        si.cap_volume({"crop": "banana", "area_ha": 1, "soil_ece": 1.0}, ECW)


def test_naive_leaching_fraction_formula_and_bounds():
    for crop in si.CROP_TO_KC:
        lf = si.naive_leaching_fraction(crop)
        assert 0 < lf <= 0.5
    pe, etc = si.effective_rain_mm_yr(), si.season_etc_mm("alfalfa")
    assert si.naive_leaching_fraction("alfalfa") == pytest.approx(pe / (pe + etc))


# ---------------------------------------------------------------- cap_volume
def test_return_keys_and_soil_reexport(farms):
    r = si.cap_volume(farms["A"], ECW)
    assert {"max_m3_season", "lf", "lr", "limiting_reason", "tag"} <= set(r)
    assert cap_via_soil(farms["A"], ECW)["max_m3_season"] == r["max_m3_season"]
    assert r["tag"]["status"] in {"ESTIMATE", "TO_VERIFY"}


def test_farm_a_alfalfa_is_limited_by_salinity(farms):
    a, b = si.cap_volume(farms["A"], ECW), si.cap_volume(farms["B"], ECW)
    assert a["limiting_reason"] == "salinity"
    assert 0 < a["max_m3_season"] < a["need_m3_season"]
    assert a["tww_fraction"] < 1
    # alfalfa (threshold 2.0) takes a smaller share of its need than olive (4.0)
    assert a["max_m3_season"] / a["need_m3_season"] < b["max_m3_season"] / b["need_m3_season"]


def test_farm_b_olive_gets_its_whole_need(farms):
    b = si.cap_volume(farms["B"], ECW)
    assert b["limiting_reason"] == "crop_need"
    assert b["max_m3_season"] == pytest.approx(b["need_m3_season"], abs=0.1)
    assert b["max_m3_season"] > si.cap_volume(farms["A"], ECW)["max_m3_season"]
    assert b["tag"]["status"] == "TO_VERIFY"  # olive threshold is a placeholder


def test_farm_j_barley_is_capped_by_need_not_salinity(farms):
    j = si.cap_volume(farms["J"], ECW)  # barley threshold 8 dS/m: soil ECe 4.5 and ECw 3.5 do not bind
    assert j["limiting_reason"] == "crop_need"
    assert j["max_m3_season"] == pytest.approx(j["need_m3_season"], abs=0.1)
    assert j["tag"]["status"] == "ESTIMATE"


def test_blocked_crop_gets_zero(farms):
    c = si.cap_volume(farms["C"], ECW)  # lettuce, eaten raw
    assert c["max_m3_season"] == 0 and c["limiting_reason"] == "blocked"
    assert c["lf"] is None and c["lr"] is None
    assert "Art. 5" in c["reason_text"]


def test_soil_already_over_threshold_is_infeasible(farms):
    over = {**farms["A"], "soil_ece": 2.5}  # alfalfa threshold 2.0
    r = si.cap_volume(over, ECW)
    assert r["max_m3_season"] == 0 and r["limiting_reason"] == "infeasible"


def test_fresh_water_too_saline_is_infeasible(farms):
    r = si.cap_volume(farms["A"], ECW, ecf=3.0)
    assert r["max_m3_season"] == 0 and soil.SALTY_WATER_FLAG in r["reason_text"]


def test_cap_grows_when_the_water_is_less_saline(farms):
    low, high = si.cap_volume(farms["A"], 2.0), si.cap_volume(farms["A"], 3.5)
    assert low["max_m3_season"] >= high["max_m3_season"]
    assert low["limiting_reason"] == "crop_need"  # 2.0 dS/m is within what alfalfa tolerates at LF 0.3


def test_cap_scales_with_area(farms):
    big = {**farms["A"], "area_ha": farms["A"]["area_ha"] * 2}
    assert si.cap_volume(big, ECW)["max_m3_season"] == pytest.approx(2 * si.cap_volume(farms["A"], ECW)["max_m3_season"], abs=0.2)


def test_texture_override_is_flagged_but_does_not_change_the_result(farms):
    b = si.cap_volume(farms["B"], ECW)  # farm B carries the SIMULATED sandy-loam override
    assert any("texture override" in f for f in b["flags"])
    same = si.cap_volume({**farms["B"], "soil_texture": "clay loam"}, ECW)
    assert same["max_m3_season"] == b["max_m3_season"]
    assert not any("texture override" in f for f in same["flags"])


def test_accepts_sim_farms_column_name(farms):
    f = {k: v for k, v in farms["B"].items() if k != "soil_ece"} | {"soil_ECe_dS_m": 1.1}
    assert si.cap_volume(f, ECW)["max_m3_season"] == si.cap_volume(farms["B"], ECW)["max_m3_season"]


# ---------------------------------------------------------------- trajectories for the demo farms
def test_naive_crosses_for_sensitive_crops_and_the_cap_stays_under(farms):
    crossed = []
    for fid, farm in farms.items():
        r = si.cap_volume(farm, ECW)
        if r["limiting_reason"] == "blocked":
            continue
        thr, _ = soil.crop_threshold(farm["crop"])
        naive = soil.simulate(farm["soil_ece"], ECW, thr, r["lf_naive"])
        if soil.first_year_over(naive, thr) is not None:
            crossed.append(fid)
        # QATRA: the blend and managed leaching chosen by cap_volume never cross
        managed = soil.simulate(farm["soil_ece"], r["ecw_mix"], thr, r["lf"])
        assert soil.first_year_over(managed, thr) is None, fid
    assert {"A", "I"} <= set(crossed)  # alfalfa, threshold 2.0 dS/m
