"""Module 7 - Open-Meteo forecast, summer-2026 archive, 30-year climate baseline, PV estimate.

Status: forecast = PROJECTION (model forecast); archive = REPORTED (ERA5-based reanalysis via Open-Meteo);
PV = ESTIMATE.  Re-run: py -3.13 scripts/02_fetch_weather.py
"""
import json, sys
import pandas as pd
from common import *

LOC = dict(latitude=DEMO_LAT, longitude=DEMO_LON, timezone="Africa/Tunis")
HOURLY = "temperature_2m,relative_humidity_2m,shortwave_radiation,precipitation,wind_speed_10m,et0_fao_evapotranspiration"
DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,shortwave_radiation_sum"


def fetch(name, url, params):
    cache = RAW / "weather" / f"{name}.json"
    if cache.exists() and "--refresh" not in sys.argv:
        return json.loads(cache.read_text())
    r = get(url, params=params, delay=8, timeout=300, tries=5)
    cache.write_text(r.text)
    return r.json()


POWER = "https://power.larc.nasa.gov/api/temporal/{res}/point"
ELEV_M = 20.0  # approx. site elevation for psychrometric constant


def et0_pm_daily(tmax, tmin, rh, u2, rs_mj, doy, lat=DEMO_LAT, z=ELEV_M):
    """FAO-56 Penman-Monteith daily reference ET (mm/d), eqs. 6-40 (RH mean variant)."""
    import numpy as np
    tmean = (tmax + tmin) / 2
    P = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26
    gamma = 0.000665 * P
    es = lambda T: 0.6108 * np.exp(17.27 * T / (T + 237.3))
    es_ = (es(tmax) + es(tmin)) / 2
    ea = rh / 100 * es_
    delta = 4098 * es(tmean) / (tmean + 237.3) ** 2
    phi = np.radians(lat); dr = 1 + 0.033 * np.cos(2 * np.pi / 365 * doy)
    dec = 0.409 * np.sin(2 * np.pi / 365 * doy - 1.39)
    ws = np.arccos(-np.tan(phi) * np.tan(dec))
    ra = 24 * 60 / np.pi * 0.0820 * dr * (ws * np.sin(phi) * np.sin(dec) + np.cos(phi) * np.cos(dec) * np.sin(ws))
    rso = (0.75 + 2e-5 * z) * ra
    rns = 0.77 * rs_mj
    rnl = 4.903e-9 * (((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2) * (0.34 - 0.14 * np.sqrt(ea)) * (1.35 * np.clip(rs_mj / rso, 0, 1) - 0.35)
    rn = rns - rnl
    return ((0.408 * delta * rn + gamma * 900 / (tmean + 273) * u2 * (es_ - ea)) / (delta + gamma * (1 + 0.34 * u2))).clip(lower=0)


def power_daily(start, end, name):
    js = fetch(name, POWER.format(res="daily"), {"parameters": "T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR",
               "community": "AG", "longitude": DEMO_LON, "latitude": DEMO_LAT, "start": start, "end": end, "format": "JSON"})
    p = js["properties"]["parameter"]
    d = pd.DataFrame(p).replace(-999.0, float("nan"))
    d.index = pd.to_datetime(d.index, format="%Y%m%d")
    out = pd.DataFrame({"date": d.index.strftime("%Y-%m-%d"), "temperature_2m_max": d["T2M_MAX"].values,
                        "temperature_2m_min": d["T2M_MIN"].values, "relative_humidity_2m_mean": d["RH2M"].values,
                        "wind_speed_2m": d["WS2M"].values, "shortwave_radiation_sum_MJ_m2": d["ALLSKY_SFC_SW_DWN"].values,
                        "precipitation_sum": d["PRECTOTCORR"].values})
    out["et0_fao_evapotranspiration"] = et0_pm_daily(out["temperature_2m_max"], out["temperature_2m_min"],
        out["relative_humidity_2m_mean"], out["wind_speed_2m"], out["shortwave_radiation_sum_MJ_m2"], d.index.dayofyear.values).round(2)
    out["status"] = "REPORTED (NASA POWER reanalysis); ET0 = ESTIMATE (FAO-56 PM computed)"
    return out


def power_summer():
    js = fetch("power_hourly_summer2026", POWER.format(res="hourly"), {"parameters": "T2M,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR",
               "community": "AG", "longitude": DEMO_LON, "latitude": DEMO_LAT, "start": "20260601", "end": "20260831",
               "time-standard": "LST", "format": "JSON"})
    p = js["properties"]["parameter"]
    h = pd.DataFrame(p).replace(-999.0, float("nan"))
    h.index = pd.to_datetime(h.index, format="%Y%m%d%H")
    h = pd.DataFrame({"datetime": h.index, "temperature_2m": h["T2M"].values, "relative_humidity_2m": h["RH2M"].values,
                      "wind_speed_2m": h["WS2M"].values, "shortwave_radiation": (h["ALLSKY_SFC_SW_DWN"] * 1e6 / 3600).round(1).values,  # MJ/m2/h -> W/m2
                      "precipitation": h["PRECTOTCORR"].values})
    h["date"] = h["datetime"].dt.strftime("%Y-%m-%d")
    d = power_daily("20260601", "20260831", "power_daily_summer2026").add_prefix("daily_").rename(columns={"daily_date": "date"})
    return h.merge(d, on="date", how="left")


def merge_hourly_daily(js):
    h = pd.DataFrame(js["hourly"]).rename(columns={"time": "datetime"})
    h["datetime"] = pd.to_datetime(h["datetime"])
    h["date"] = h["datetime"].dt.date.astype(str)
    d = pd.DataFrame(js["daily"]).rename(columns={"time": "date"})
    d = d.add_prefix("daily_").rename(columns={"daily_date": "date"})
    return h.merge(d, on="date", how="left")


def pv_estimate(df, kwp=50.0, pr=0.8):
    # E_h (kWh) = kWp * G(W/m2)/1000 * PR   (1 h step; horizontal irradiance -> conservative for tilted array)
    out = df[["datetime", "shortwave_radiation", "temperature_2m"]].copy()
    out["pv_kwp"] = kwp; out["performance_ratio"] = pr
    out["pv_kwh"] = (kwp * out["shortwave_radiation"].fillna(0) / 1000.0 * pr).round(3)
    out["status"] = "ESTIMATE"
    return out


def main():
    # 7.1 forecast
    js = fetch("forecast_7d", "https://api.open-meteo.com/v1/forecast",
               {**LOC, "hourly": HOURLY, "daily": DAILY, "forecast_days": 7})
    fc = merge_hourly_daily(js); fc["status"] = "PROJECTION (Open-Meteo forecast)"
    fc.to_csv(CLEAN / "weather_forecast_sousse.csv", index=False); print("forecast", fc.shape)

    # 7.2 / 7.3 Open-Meteo archive hit "Daily API request limit exceeded" (2026-11-21) -> NASA POWER fallback.
    s, c = None, None
    try:
        js = fetch("archive_summer2026", "https://archive-api.open-meteo.com/v1/archive",
                   {**LOC, "start_date": "2026-06-01", "end_date": "2026-08-31", "hourly": HOURLY, "daily": DAILY})
        s = merge_hourly_daily(js); s["status"] = "REPORTED (ERA5 reanalysis via Open-Meteo)"
    except Exception as e:
        print("Open-Meteo archive unavailable -> NASA POWER:", e)
        s = power_summer()
    s.to_csv(CLEAN / "weather_summer2026_sousse.csv", index=False)
    print("summer2026", s.shape, "Tmax:", s["temperature_2m"].max())
    c = power_daily("19950101", "20241231", "power_daily_1995_2024")
    c.to_csv(CLEAN / "climate_30y_sousse.csv", index=False)
    c["year"] = c["date"].str[:4]
    ann = c.groupby("year")[["precipitation_sum", "et0_fao_evapotranspiration"]].sum()
    print("climate30y", c.shape, "mean annual P=%.0f mm ET0=%.0f mm" % tuple(ann.mean()))

    # 7.4 PV estimate on summer-2026 hourly + forecast
    pv = pd.concat([pv_estimate(s).assign(period="summer2026"), pv_estimate(fc).assign(period="forecast")])
    pv.to_csv(CLEAN / "pv_estimate_sousse.csv", index=False); print("pv", pv.shape)

    meta = {"location": LOC, "historical_source": "NASA POWER (community AG, MERRA-2/CERES based, ~0.5 deg) with FAO-56 PM ET0 computed locally",
            "pv_formula": "E_kWh = kWp * GHI(W/m2)/1000 * PR * 1h ; PR=0.8, kWp=50 default (configurable)"}
    (CLEAN / "weather_meta.json").write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main()
