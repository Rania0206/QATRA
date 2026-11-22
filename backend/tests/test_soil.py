import math

import pytest

from app.engine.soil import (CAP_FLAG, SALTY_WATER_FLAG, compare_policies, crop_threshold, ece_equilibrium,
                             first_year_over, leaching_requirement, qatra_leaching_fraction,
                             relative_yield_pct, simulate, water_used_m3)


# ---------------------------------------------------------------- formulas
@pytest.mark.parametrize("ecw,thr", [(1.0, 2.0), (3.0, 2.0), (3.5, 4.0), (2.0, 6.0), (2.0, 1.3)])
def test_lf_equal_lr_gives_equilibrium_at_threshold(ecw, thr):
    lr = leaching_requirement(ecw, thr)
    assert ece_equilibrium(ecw, lr) == pytest.approx(thr)


def test_leaching_requirement_value():
    assert leaching_requirement(3.0, 2.0) == pytest.approx(3.0 / 7.0)


def test_infeasible_lr_is_inf_and_flagged():
    assert leaching_requirement(10.0, 2.0) == float("inf")  # 5*2 <= 10
    lf, flags = qatra_leaching_fraction(10.0, 2.0, lf_naive=0.1)
    assert SALTY_WATER_FLAG in flags
    assert lf == 0.5  # capped, never inf


def test_cap_flag_when_lr_above_max_but_feasible():
    lf, flags = qatra_leaching_fraction(3.5, 2.0, lf_naive=0.1)  # LR = 0.538 > 0.5
    assert lf == 0.5 and flags == [CAP_FLAG]


def test_equilibrium_rejects_bad_lf():
    for bad in (0, -0.1, 1.5):
        with pytest.raises(ValueError):
            ece_equilibrium(3.0, bad)


# ---------------------------------------------------------------- dynamics
def test_series_length_and_start():
    s = simulate(1.9, 3.0, 2.0, 0.1)
    assert len(s) == 31 and s[0] == 1.9


@pytest.mark.parametrize("ece0,lf", [(1.0, 0.1), (9.0, 0.1), (1.9, 0.4), (6.0, 0.4)])
def test_monotonic_toward_equilibrium_without_overshoot(ece0, lf):
    ecw = 3.0
    eq = ece_equilibrium(ecw, lf)
    s = simulate(ece0, ecw, 2.0, lf)
    diffs = [b - a for a, b in zip(s, s[1:])]
    assert all(d >= 0 for d in diffs) if eq >= ece0 else all(d <= 0 for d in diffs)
    lo, hi = sorted((ece0, eq))
    assert all(lo - 1e-9 <= v <= hi + 1e-9 for v in s)
    assert abs(s[-1] - eq) < abs(s[0] - eq)


def test_series_converges_to_equilibrium():
    s = simulate(1.0, 3.0, 2.0, 0.2, years=60)
    assert s[-1] == pytest.approx(ece_equilibrium(3.0, 0.2), rel=1e-6)


def test_alfalfa_crosses_with_low_lf():
    thr, _ = crop_threshold("alfalfa")
    assert thr == 2.0
    s = simulate(1.9, 3.5, thr, 0.1)
    year = first_year_over(s, thr)
    assert year is not None and year >= 1


def test_olive_with_managed_lf_stays_under():
    thr, status = crop_threshold("olive")
    assert thr == 4.0 and status == "TO_VERIFY"
    lf, flags = qatra_leaching_fraction(3.0, thr, lf_naive=0.1)
    assert flags == [] and lf == pytest.approx(3.0 / 17.0)
    assert first_year_over(simulate(1.1, 3.0, thr, lf), thr) is None


def test_first_year_over_none_when_never_crossed():
    assert first_year_over([1.0, 1.2, 1.4], 2.0) is None
    assert first_year_over([1.0, 2.0], 2.0) is None  # equal is not over
    assert first_year_over([1.0, 2.5, 3.0], 2.0) == 1


# ---------------------------------------------------------------- policies and water
def test_water_used_and_extra_cost_of_leaching():
    assert water_used_m3(900.0, 0.1) == pytest.approx(1000.0)
    r = compare_policies(1.9, 3.0, 2.0, lf_naive=0.1, net_need_m3=1000.0)
    assert r["qatra"]["water_used_m3"] > r["naive"]["water_used_m3"]
    with pytest.raises(ValueError):
        water_used_m3(100.0, 1.0)


def test_compare_policies_farm_a_qatra_beats_naive():
    r = compare_policies(1.9, 3.0, 2.0, lf_naive=0.1)
    assert r["naive"]["first_year_over"] is not None
    assert r["qatra"]["first_year_over"] is None
    assert r["qatra"]["lf"] == pytest.approx(3.0 / 7.0)
    assert r["qatra"]["water_used_m3"] is None  # no need given
    assert r["tag"]["status"] == "ESTIMATE"
    assert math.isfinite(r["leaching_requirement"])


def test_unknown_crop_and_defaults_flagged():
    with pytest.raises(KeyError):
        crop_threshold("banana")
    for crop in ("olive", "pomegranate", "oat_fodder"):
        assert crop_threshold(crop)[1] == "TO_VERIFY"


def test_relative_yield():
    assert relative_yield_pct(1.5, 2.0) == 100.0
    assert relative_yield_pct(3.0, 2.0, slope=7.3) == pytest.approx(92.7)
    assert relative_yield_pct(100.0, 2.0) == 0.0
