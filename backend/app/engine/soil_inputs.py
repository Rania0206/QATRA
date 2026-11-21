"""Soil salinity inputs and per-farm TWW volume cap (B-03b).

Builds on engine/soil.py (pure formulas) and adds the data-backed parts: effective rain, growing-season
crop evapotranspiration, the naive leaching fraction, and cap_volume(). Reads only through the store.

Everything here is an ESTIMATE (QATRA assumptions on top of FAO-29 / FAO-56); thresholds that FAO-29 does
not publish (olive, pomegranate, oat_fodder) are TO_VERIFY placeholders, see soil.CROP_THRESHOLD.
"""
import math
from functools import lru_cache
from typing import Any

from app.engine import soil
from app.engine.rules import crop_names
from app.engine.rules_config import get_rule
from app.store import get_store

# ---------------------------------------------------------------- documented assumptions (ESTIMATE)
EFFECTIVE_RAIN_FACTOR = 0.7   # effective rain = 0.7 x precipitation_sum (30-year mean)
FRESH_EC_DS_M = 1.0           # EC of the fresh water a farm can mix in (good-quality well / network water)
LF_NAIVE_CEILING = soil.LF_MAX
CAP_LF_MAX = 0.3              # practical ceiling of managed leaching used for the volume cap (ESTIMATE, adjustable)
DEMO_TEXTURE = "clay loam"    # SoilGrids gives clay loam at every farm; farm B "sandy loam" is a SIMULATED override

# sim_farms crop code -> crop_kc.csv row. Explicit on purpose: an unknown crop is an error, never a default.
CROP_TO_KC: dict[str, str] = {
    "olive": "olive",
    "alfalfa": "alfalfa",
    "lettuce": "lettuce",
    "tomato": "tomato",
    "pomegranate": "pomegranate",
    "citrus_orange": "citrus",
    "wheat": "wheat",
    "barley": "barley",
    "barley_fodder": "barley",
    "oat_fodder": "oat_fodder",
}

# Growing-season window (inclusive calendar months, may wrap the new year). ESTIMATE: sowing dates are not
# in the data, so perennials use the irrigation season and winter cereals / fodder the cool season.
CROP_SEASON_MONTHS: dict[str, tuple[int, int]] = {
    "olive": (4, 10), "alfalfa": (4, 10), "pomegranate": (4, 10), "citrus_orange": (4, 10), "tomato": (4, 7),
    "wheat": (11, 5), "barley": (11, 5), "barley_fodder": (11, 5), "oat_fodder": (11, 5), "lettuce": (11, 1),
}


class UnknownCropError(ValueError):
    """The crop has no explicit Kc / season / salt-threshold mapping."""


def _check_crop(crop: str) -> None:
    missing = [name for name, table in (("crop_kc mapping", CROP_TO_KC), ("season window", CROP_SEASON_MONTHS),
                                        ("salt threshold", soil.CROP_THRESHOLD)) if crop not in table]
    if missing:
        raise UnknownCropError(f"unknown crop {crop!r}: no {', '.join(missing)}. Add it explicitly; there is no silent default.")


def _months(window: tuple[int, int]) -> list[int]:
    a, b = window
    return list(range(a, b + 1)) if a <= b else list(range(a, 13)) + list(range(1, b + 1))


# ---------------------------------------------------------------- climate
@lru_cache(maxsize=1)
def _climate() -> dict[str, Any]:
    """30-year means from climate_30y_sousse: annual precipitation and mean monthly ET0 totals (mm)."""
    df = get_store()["climate_30y_sousse"]
    dates = df["date"]
    years = dates.dt.year.nunique()
    monthly_et0 = df.groupby(dates.dt.month)["et0_fao_evapotranspiration"].sum() / years
    return {"years": int(years),
            "precip_mm_yr": float(df["precipitation_sum"].sum() / years),
            "et0_month_mm": {int(m): float(v) for m, v in monthly_et0.items()}}


def effective_rain_mm_yr() -> float:
    """Mean annual effective rain = 0.7 x mean annual precipitation (ESTIMATE)."""
    return EFFECTIVE_RAIN_FACTOR * _climate()["precip_mm_yr"]


def season_etc_mm(crop: str) -> float:
    """Growing-season crop evapotranspiration ETc = Kc_mid x ET0_season (mm), 30-year mean (ESTIMATE)."""
    _check_crop(crop)
    kc = get_store()["crop_kc"].set_index("crop")["kc_mid"]
    row = CROP_TO_KC[crop]
    if row not in kc.index:
        raise UnknownCropError(f"crop {crop!r} maps to {row!r}, which is not a row of crop_kc.csv")
    et0 = sum(_climate()["et0_month_mm"][m] for m in _months(CROP_SEASON_MONTHS[crop]))
    return float(kc[row]) * et0


def naive_leaching_fraction(crop: str) -> float:
    """LF_naive = Pe / (Pe + ETc): the share of the root-zone water supply that arrives as rain.

    Pe = effective rain (mm/yr), ETc = growing-season crop evapotranspiration (mm). The farmer applies only the crop
    need (no leaching allowance), so the only water that flushes salts is rain. Heuristic, not a measured drainage
    (ESTIMATE). Bounded to (0.02, 0.5] so the equilibrium formula stays finite."""
    pe, etc = effective_rain_mm_yr(), season_etc_mm(crop)
    return min(max(pe / (pe + etc), 0.02), LF_NAIVE_CEILING)


def season_inputs(crop: str) -> dict[str, float]:
    return {"effective_rain_mm_yr": effective_rain_mm_yr(), "etc_season_mm": season_etc_mm(crop),
            "lf_naive": naive_leaching_fraction(crop)}


# ---------------------------------------------------------------- blocked crops
def _blocked_reason(crop: str) -> str | None:
    """Crop that cannot receive TWW at all: eaten raw (Art. 5) or not on the allowed list (1994 order)."""
    names = crop_names(crop)
    raw, allowed = get_rule("R-RAW-EATEN"), get_rule("R-CROP-ALLOWED")
    if raw is not None and names & set(raw.crops):
        return "crop eaten raw: irrigation with treated wastewater is forbidden (Decree 89-1047 Art. 5)"
    if allowed is not None and not names & (set(allowed.crops) | set(allowed.crops_to_verify)):
        return "crop not on the allowed list (1994 order)"
    return None


# ---------------------------------------------------------------- the cap
def cap_volume(farm: dict, ecw: float, *, ecf: float = FRESH_EC_DS_M, lf_max: float = CAP_LF_MAX,
               tau: float = soil.TAU_YEARS) -> dict:
    """Maximum TWW volume per season that keeps the 30-year soil ECe under the crop threshold.

    farm  : dict with crop, area_ha and soil_ece (sim_farms key soil_ECe_dS_m also accepted); optional id,
            soil_texture. ecw: EC of the treated water (dS/m).

    Returns {max_m3_season, lf, lr, limiting_reason, tag, ...}:
      limiting_reason  "crop_need"  the whole crop need can be served, salinity does not bind
                       "salinity"   mixing / leaching limits the TWW volume below the crop need
                       "blocked"    crop not allowed with TWW           -> max_m3_season 0
                       "infeasible" soil already over the threshold, or even the fresh water is too saline -> 0
      lf, lr           leaching fraction used and leaching requirement of the blended water; None when max is 0.
      lf, lr and ecw_mix are returned unrounded on purpose: the cap sits on the threshold, so a rounded copy could
    cross it. The result also carries reason_text, need_m3_season, tww_fraction, ecw_mix, lf_naive, flags.

    Model. need = ETc x area x 10 (m3, season). TWW is mixed with fresh water of EC `ecf` (ESTIMATE, default
    1.0 dS/m) in a TWW share f, so ECw_mix = ecf + f (ecw - ecf). With managed leaching up to lf_max (default 0.3, a practical ESTIMATE; soil.LF_MAX 0.5 is the theoretical cap of
    the policy simulation) the largest
    blend that still reaches ECe_eq <= threshold is ECw_max = thr * 5 lf_max / (1 + lf_max), which gives
    f = (ECw_max - ecf) / (ecw - ecf) clipped to [0, 1]. Leaching raises the water applied to
    W = need / (1 - LF) with LF = max(LR(ECw_mix), LF_naive) capped at lf_max. TWW volume = min(f W, need): never
    more than the crop need. The trajectory is monotone, so staying under the threshold for 30 years means
    ECe0 <= thr and ECe_eq <= thr, and it is re-checked with soil.simulate. Texture is not an input of the model:
    every farm is treated as clay loam; a different texture on the farm is only reported as a flag.
    """
    crop = str(farm["crop"])
    _check_crop(crop)
    area = float(farm["area_ha"])
    ece0 = float(farm["soil_ece"] if "soil_ece" in farm else farm["soil_ECe_dS_m"])
    thr, thr_status = soil.crop_threshold(crop)
    inp = season_inputs(crop)
    need = inp["etc_season_mm"] * area * 10.0  # 1 mm over 1 ha = 10 m3

    texture = str(farm.get("soil_texture") or DEMO_TEXTURE).split(" (")[0]
    flags = []
    if texture != DEMO_TEXTURE:
        flags.append(f"texture override ({texture}) is SIMULATED; the model uses {DEMO_TEXTURE} for every farm")
    if thr_status == "TO_VERIFY":
        flags.append(f"{crop} salt threshold {thr:g} dS/m is a TO_VERIFY placeholder")
    tag = {"status": "TO_VERIFY" if thr_status == "TO_VERIFY" else "ESTIMATE",
           "source": f"QATRA soil model on FAO-29 (ECf {ecf:g} dS/m, LF cap {lf_max:g}, tau {tau:g} y)"
                     + ("; threshold TO_VERIFY" if thr_status == "TO_VERIFY" else "")}

    def out(max_m3, code, text, *, lf=None, lr=None, f=0.0, mix=None):
        return {"max_m3_season": round(max_m3, 1), "lf": lf, "lr": lr, "limiting_reason": code, "reason_text": text,
                "tag": tag, "need_m3_season": round(need, 1), "tww_fraction": f, "ecw_mix": mix,
                "lf_naive": round(inp["lf_naive"], 4), "flags": flags}

    if (why := _blocked_reason(crop)) is not None:
        return out(0.0, "blocked", why)
    if ece0 > thr + soil.EPS:
        return out(0.0, "infeasible", f"soil ECe {ece0:g} dS/m is already above the {crop} threshold {thr:g} dS/m")

    ecw_max = thr * 5.0 * lf_max / (1.0 + lf_max)
    if ecf >= ecw_max:
        return out(0.0, "infeasible", f"{soil.SALTY_WATER_FLAG}: even fresh water ({ecf:g} dS/m) exceeds the "
                                      f"{ecw_max:.2f} dS/m this crop tolerates at maximum leaching")
    f = 1.0 if ecw <= ecf else min(1.0, math.floor((ecw_max - ecf) / (ecw - ecf) * 1e6) / 1e6)  # floor: keep a margin under the threshold
    mix = ecf + f * (ecw - ecf)
    lr = soil.leaching_requirement(mix, thr)
    lf = min(max(lr, inp["lf_naive"]), lf_max)

    # safety net: the 30-year trajectory of the chosen blend must really stay under the threshold
    assert soil.first_year_over(soil.simulate(ece0, mix, thr, lf, tau=tau), thr) is None, "cap violates its own threshold"

    volume = min(f * need / (1.0 - lf), need)
    if volume >= need - 1e-9:
        return out(need, "crop_need", "the whole crop need can be served with treated water; salinity does not bind",
                   lf=lf, lr=lr, f=f, mix=mix)
    return out(volume, "salinity",
               f"{crop} tolerates ECe {thr:g} dS/m: only {f:.0%} of the water can be TWW "
               f"(blend {mix:.2f} dS/m, leaching fraction {lf:.2f})",
               lf=lf, lr=lr, f=f, mix=mix)
