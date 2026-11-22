"""A-04: daily irrigation need per farm.

    ETc            = ET0 x Kc                       (FAO-56 crop evapotranspiration)
    effective rain = 0.7 x rain                     (simple FAO rule of thumb)
    need (mm)      = max(0, ETc - effective rain)
    need (m3)      = need (mm) x area (ha) x 10     (1 mm on 1 ha = 10 m3)

Weather: the data pack forecast (data/clean/weather_forecast_sousse, daily ET0 and rain), read through
the store. Kc: data/clean/crop_kc. No ML, no weather API call. Blocked crops (e.g. lettuce) still get a
need value: this module only says how much a crop would need; the plan decides who receives water.
"""
from datetime import date as Date
from datetime import timedelta
from functools import lru_cache
from typing import Literal, Optional

from pydantic import BaseModel

from app.engine.farms import get_farm, list_farms
from app.schemas import Farm, Tag
from app.store import get_store

WEATHER_DATASET = "weather_forecast_sousse"
KC_DATASET = "crop_kc"
SUMMER_DATASET = "weather_summer2026_sousse"  # hourly 1 Jun - 31 Aug 2026 (NASA POWER), daily ET0 and rain included
CLIMATE_DATASET = "climate_30y_sousse"  # daily ET0 and rain, 30 years: used as the same day of the year

RAIN_EFFICIENCY = 0.7  # effective rain = 70% of the rain that falls (FAO rule of thumb)
M3_PER_MM_HA = 10.0  # 1 mm of water on 1 ha = 10 m3

# Farm crop codes that have no row of their own in crop_kc. Fodder barley is barley (same FAO-56 row).
KC_ALIAS = {"barley_fodder": "barley", "citrus_orange": "citrus"}

TAG = Tag(status="PROJECTION", source="Open-Meteo forecast (data pack), else historical weather, x FAO-56 Kc (mid-season)")


class NeedItem(BaseModel):
    date: str
    farm_id: str
    et0_mm: float
    kc: Optional[float] = None  # None: crop not in crop_kc, so no need can be computed
    etc_mm: Optional[float] = None
    effective_rain_mm: float
    need_mm: Optional[float] = None
    need_m3: Optional[float] = None
    weather_source: Optional[Literal["forecast", "historical"]] = None  # where the day's ET0 and rain come from


class NeedsForecast(BaseModel):
    start: str
    days: int
    items: list[NeedItem]
    tag: Tag


# ---------------------------------------------------------------- inputs (read once, through the store)
@lru_cache(maxsize=1)
def _weather() -> dict[str, tuple[float, float]]:
    """date -> (daily ET0 mm, daily rain mm). The forecast file is hourly with the daily totals repeated."""
    df = get_store()[WEATHER_DATASET].drop_duplicates("date")
    out = {}
    for _, r in df.iterrows():
        et0, rain = r["daily_et0_fao_evapotranspiration"], r["daily_precipitation_sum"]
        if et0 == et0 and rain == rain:  # skip NaN days
            out[str(r["date"])[:10]] = (float(et0), float(rain))
    return out


@lru_cache(maxsize=1)
def _summer() -> dict[str, tuple[float, float]]:
    """date -> (daily ET0 mm, daily rain mm) for 1 Jun - 31 Aug 2026 (the heatwave replay days)."""
    df = get_store()[SUMMER_DATASET].drop_duplicates("date")
    return {str(r["date"])[:10]: (float(r["daily_et0_fao_evapotranspiration"]), float(r["daily_precipitation_sum"]))
            for _, r in df.iterrows()
            if r["daily_et0_fao_evapotranspiration"] == r["daily_et0_fao_evapotranspiration"]}


@lru_cache(maxsize=1)
def _climate() -> dict[str, tuple[float, float]]:
    """"MM-DD" -> mean daily (ET0 mm, rain mm) over the 30 years: the typical weather of that day of the year."""
    df = get_store()[CLIMATE_DATASET].copy()
    df["md"] = df["date"].astype(str).str[5:10]
    g = df.groupby("md")[["et0_fao_evapotranspiration", "precipitation_sum"]].mean()
    return {md: (float(r["et0_fao_evapotranspiration"]), float(r["precipitation_sum"])) for md, r in g.iterrows()}


def weather_for(day: str) -> Optional[tuple[float, float, str]]:
    """(ET0 mm, rain mm, source) for a day: the 7-day forecast, else the summer 2026 file (exact date),
    else the 30-year average of the same day of the year. None for a string that is not a date."""
    if day in _weather():
        return (*_weather()[day], "forecast")
    try:
        d = Date.fromisoformat(day)
    except (TypeError, ValueError):
        return None
    if day in _summer():
        return (*_summer()[day], "historical")
    clim = _climate().get(d.strftime("%m-%d"))
    return (*clim, "historical") if clim else None


@lru_cache(maxsize=1)
def _kc_mid() -> dict[str, float]:
    return {str(r["crop"]): float(r["kc_mid"]) for _, r in get_store()[KC_DATASET].iterrows()}


def forecast_dates() -> list[str]:
    """Days covered by the forecast, oldest first."""
    return sorted(_weather())


def kc_for(crop: str, on: Optional[str] = None) -> Optional[float]:
    """Crop coefficient for a crop on a date; None for an unknown crop.

    sim_farms has no planting date or growth stage, so every crop uses its MID-SEASON Kc (demo
    simplification). `on` is kept so growth stages can be added later without changing callers.
    """
    return _kc_mid().get(KC_ALIAS.get(crop, crop))


# ---------------------------------------------------------------- the formula (pure)
def water_need(et0_mm: float, kc: float, rain_mm: float, area_ha: float) -> dict[str, float]:
    etc_mm = et0_mm * kc
    effective_rain_mm = RAIN_EFFICIENCY * rain_mm
    need_mm = max(0.0, etc_mm - effective_rain_mm)
    return {
        "etc_mm": etc_mm,
        "effective_rain_mm": effective_rain_mm,
        "need_mm": need_mm,
        "need_m3": need_mm * area_ha * M3_PER_MM_HA,
    }


def daily_need(farm: Farm, day: str) -> Optional[NeedItem]:
    """The need of one farm on one day; None if the forecast has no data for that day."""
    w = weather_for(day)
    if w is None:
        return None
    et0, rain, source = w
    kc = kc_for(farm.crop, day)
    if kc is None:  # unknown crop: keep the row, leave the need empty
        return NeedItem(date=day, farm_id=farm.id, et0_mm=round(et0, 2), effective_rain_mm=round(RAIN_EFFICIENCY * rain, 2),
                        weather_source=source)
    n = water_need(et0, kc, rain, farm.area_ha)
    return NeedItem(
        date=day,
        farm_id=farm.id,
        et0_mm=round(et0, 2),
        kc=round(kc, 2),
        etc_mm=round(n["etc_mm"], 2),
        effective_rain_mm=round(n["effective_rain_mm"], 2),
        need_mm=round(n["need_mm"], 2),
        need_m3=round(n["need_m3"], 1),
        weather_source=source,
    )


def _days(start: Optional[str], days: int) -> list[str]:
    """`days` consecutive dates from `start` (default: the first forecast day). Past the 7 forecast days the needs
    use the historical weather, and each item says so in weather_source."""
    first = start or (forecast_dates()[0] if forecast_dates() else None)
    d0 = Date.fromisoformat(first)
    return [(d0 + timedelta(days=i)).isoformat() for i in range(days)]


def needs_forecast(days: int = 7, farm_id: Optional[str] = None, start: Optional[str] = None) -> list[NeedItem]:
    """Needs for every farm (or one) over `days` days from `start`, ordered by date then farm."""
    farms = list_farms() if farm_id is None else [f for f in [get_farm(farm_id)] if f]
    return [n for d in _days(start, days) for f in farms if (n := daily_need(f, d))]


def forecast_response(days: int = 7, farm_id: Optional[str] = None, start: Optional[str] = None) -> Optional[NeedsForecast]:
    """The GET /api/forecast/needs body; None if the farm is unknown or `start` is not a date."""
    if farm_id is not None and get_farm(farm_id) is None:
        return None
    if start is not None and weather_for(start) is None:
        return None
    items = needs_forecast(days, farm_id, start)
    first = start or (forecast_dates()[0] if forecast_dates() else "")
    return NeedsForecast(start=first, days=len({i.date for i in items}), items=items, tag=TAG)
