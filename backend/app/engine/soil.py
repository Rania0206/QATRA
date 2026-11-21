"""Soil salinity time machine (B-03a). Pure functions, numpy only, no FastAPI.

Yearly model of root-zone salinity under treated-wastewater irrigation. Every assumption below is an
ESTIMATE (QATRA model on top of FAO-29), not a measurement.

    ECw      irrigation-water EC (dS/m)
    ECe_thr  crop salinity threshold (dS/m), FAO-29
    LF       leaching fraction = drainage / applied water, in (0, 1]
    LR       leaching requirement (FAO-29): the LF that keeps equilibrium ECe at the crop threshold

    LR      = ECw / (5*ECe_thr - ECw)            infeasible (inf) when 5*ECe_thr <= ECw
    ECe_eq  = ECw * (1 + LF) / (5 * LF)          (LF = LR  =>  ECe_eq = ECe_thr)
    ECe[t+1] = ECe[t] + (ECe_eq - ECe[t]) * (1 - exp(-1/tau))      tau = 3 years
"""
import math

import numpy as np

# ---------------------------------------------------------------- documented assumptions (ESTIMATE)
TAU_YEARS = 3.0   # relaxation time of root-zone salinity towards equilibrium
LF_MAX = 0.5      # managed leaching is capped: beyond this the extra water is not realistic
SALTY_WATER_FLAG = "water too saline for this crop"
CAP_FLAG = "leaching requirement exceeds the maximum leaching fraction"

# Thresholds from data/clean/crop_salt_tolerance.csv (FAO-29 Table 4, after Maas 1984).
# (threshold dS/m, status). Missing values in the CSV get a documented default flagged TO_VERIFY:
#   olive, pomegranate: FAO-29 gives a rating (MT) but no number -> 4.0 dS/m
#   oat_fodder:         rating "T (TO_VERIFY)", no number        -> 6.0 dS/m (same as wheat/barley fodder)
CROP_THRESHOLD: dict[str, tuple[float, str]] = {
    "barley": (8.0, "REPORTED"),
    "wheat": (6.0, "REPORTED"),
    "alfalfa": (2.0, "REPORTED"),
    "lettuce": (1.3, "REPORTED"),
    "tomato": (2.5, "REPORTED"),
    "citrus_orange": (1.7, "REPORTED"),
    "barley_fodder": (6.0, "REPORTED"),
    "olive": (4.0, "TO_VERIFY"),
    "pomegranate": (4.0, "TO_VERIFY"),
    "oat_fodder": (6.0, "TO_VERIFY"),
}
# Yield slope (% loss per dS/m above the threshold). Olive/pomegranate have none in FAO-29:
# default = the value of the other moderately tolerant crops (wheat, barley fodder), TO_VERIFY.
DEFAULT_SLOPE_PCT_PER_DS_M = 7.1
EPS = 1e-9  # float tolerance when comparing with a threshold


def crop_threshold(crop: str) -> tuple[float, str]:
    """(ECe threshold in dS/m, status). Raises KeyError for an unknown crop."""
    return CROP_THRESHOLD[crop]


# ---------------------------------------------------------------- core formulas
def leaching_requirement(ecw: float, ece_thr: float) -> float:
    """LR = ECw / (5*ECe_thr - ECw). float('inf') when 5*ECe_thr <= ECw (water too saline for this crop)."""
    denom = 5.0 * ece_thr - ecw
    return float("inf") if denom <= 0 else ecw / denom


def ece_equilibrium(ecw: float, lf: float) -> float:
    """Equilibrium root-zone salinity ECe_eq = ECw*(1+LF)/(5*LF), for LF in (0, 1]."""
    if not 0 < lf <= 1:
        raise ValueError(f"leaching fraction must be in (0, 1], got {lf}")
    return ecw * (1.0 + lf) / (5.0 * lf)


def simulate(ece0: float, ecw: float, ece_thr: float, lf: float, years: int = 30, tau: float = TAU_YEARS) -> list[float]:
    """Yearly ECe series. Index t is the salinity at the start of year t: series[0] = ece0 and the
    list has years + 1 values. ece_thr is not used by the dynamics (kept so callers pass one signature
    for every function); the series moves monotonically from ece0 towards ece_equilibrium(ecw, lf)."""
    if tau <= 0:
        raise ValueError("tau must be > 0")
    eq = ece_equilibrium(ecw, lf)
    k = 1.0 - float(np.exp(-1.0 / tau))
    series = [float(ece0)]
    for _ in range(years):
        series.append(series[-1] + (eq - series[-1]) * k)
    return series


def first_year_over(series: list[float], thr: float) -> int | None:
    """First year index t with series[t] > thr, or None if the threshold is never crossed."""
    for t, v in enumerate(series):
        if v > thr + EPS:
            return t
    return None


def relative_yield_pct(ece: float, ece_thr: float, slope: float = DEFAULT_SLOPE_PCT_PER_DS_M) -> float:
    """Y% = 100 - b*(ECe - a) for ECe > a, else 100 (FAO-29 / Maas-Hoffman). Floored at 0."""
    return max(0.0, 100.0 - slope * max(0.0, ece - ece_thr))


# ---------------------------------------------------------------- policies
def water_used_m3(net_need_m3: float, lf: float) -> float:
    """Applied water needed to deliver net_need_m3 to the crop while draining a fraction LF: need / (1 - LF)."""
    if not 0 <= lf < 1:
        raise ValueError(f"leaching fraction must be in [0, 1), got {lf}")
    return net_need_m3 / (1.0 - lf)


def qatra_leaching_fraction(ecw: float, ece_thr: float, lf_naive: float, lf_max: float = LF_MAX) -> tuple[float, list[str]]:
    """Managed LF = max(LR, LF_naive), capped at lf_max. Returns (LF, flags).

    Flags: "water too saline for this crop" when LR is infeasible; the cap flag when LR > lf_max
    (the threshold will still be exceeded at equilibrium)."""
    lr = leaching_requirement(ecw, ece_thr)
    flags: list[str] = []
    if math.isinf(lr):
        flags.append(SALTY_WATER_FLAG)
    elif lr > lf_max:
        flags.append(CAP_FLAG)
    return min(max(lr, lf_naive), lf_max), flags


def compare_policies(ece0: float, ecw: float, ece_thr: float, lf_naive: float, years: int = 30,
                     tau: float = TAU_YEARS, net_need_m3: float | None = None, lf_max: float = LF_MAX) -> dict:
    """Run `naive` (rain-only leaching, LF = lf_naive) and `qatra` (managed leaching) side by side.

    Each policy returns {lf, series, first_year_over}; qatra adds flags, and both add water_used_m3
    when net_need_m3 is given (qatra - naive = the extra water that leaching costs)."""
    naive = {"lf": lf_naive, "series": simulate(ece0, ecw, ece_thr, lf_naive, years, tau)}
    lf_q, flags = qatra_leaching_fraction(ecw, ece_thr, lf_naive, lf_max)
    qatra = {"lf": lf_q, "series": simulate(ece0, ecw, ece_thr, lf_q, years, tau), "flags": flags}
    for p in (naive, qatra):
        p["first_year_over"] = first_year_over(p["series"], ece_thr)
        p["water_used_m3"] = None if net_need_m3 is None else water_used_m3(net_need_m3, p["lf"])
    return {"leaching_requirement": leaching_requirement(ecw, ece_thr), "naive": naive, "qatra": qatra,
            "tag": {"status": "ESTIMATE", "source": "QATRA yearly model on FAO-29 (tau 3 y, LF cap 0.5)"}}


# ---------------------------------------------------------------- data-backed cap (B-03b)
def cap_volume(farm: dict, ecw: float, **kwargs) -> dict:
    """Max TWW volume per season for a farm. Implemented in engine/soil_inputs.py (it needs the store);
    imported lazily so this module stays numpy-only. Same signature: cap_volume(farm, ecw)."""
    from app.engine.soil_inputs import cap_volume as _cap_volume
    return _cap_volume(farm, ecw, **kwargs)
