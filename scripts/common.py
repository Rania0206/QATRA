"""Shared helpers for QATRA+ data scripts (no geopandas dependency)."""
import json, math, time, os
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
CLEAN = ROOT / "data" / "clean"
SIM = ROOT / "data" / "simulated"

DEMO_LAT, DEMO_LON = 35.79, 10.62   # Zaouiet-Sousse (approx.)
RADIUS_KM = 20

UA = {"User-Agent": "QATRA-plus-hackathon-data-collector/0.1 (research, non-commercial)"}


def get(url, params=None, tries=3, delay=2.0, timeout=180, **kw):
    """Polite GET with retry/backoff."""
    last = None
    for i in range(tries):
        try:
            r = requests.get(url, params=params, headers=UA, timeout=timeout, **kw)
            if r.status_code == 429 or r.status_code >= 500:
                last = f"HTTP {r.status_code}"
                time.sleep(delay * (i + 2) * 2)
                continue
            r.raise_for_status()
            time.sleep(delay)
            return r
        except requests.RequestException as e:
            last = str(e)
            time.sleep(delay * (i + 1) * 2)
    raise RuntimeError(f"GET failed {url}: {last}")


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def ring_area_m2(coords):
    """Approximate geodesic area of a lon/lat ring (spherical excess formula)."""
    R = 6378137.0
    if len(coords) < 3:
        return 0.0
    s = 0.0
    n = len(coords)
    for i in range(n):
        lon1, lat1 = coords[i]
        lon2, lat2 = coords[(i + 1) % n]
        s += math.radians(lon2 - lon1) * (2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
    return abs(s * R * R / 2.0)


def ring_centroid(coords):
    xs = [c[0] for c in coords]; ys = [c[1] for c in coords]
    return sum(ys) / len(ys), sum(xs) / len(xs)


def write_geojson(path, features, meta=None):
    fc = {"type": "FeatureCollection", "features": features}
    if meta:
        fc["metadata"] = meta
    Path(path).write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
