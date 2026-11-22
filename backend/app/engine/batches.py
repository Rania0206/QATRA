"""Batches of treated wastewater (A-02).

Reads sim_batches and the regulation pack from the in-memory store only. This module checks
analysis *dates* (is the lab result recent enough?), not legal *limits* (that is A-03).
"""
import itertools
import math
import re
from datetime import date, timedelta

import pandas as pd

from app.schemas import Analysis, Batch, Tag
from app.engine.rules import batch_compliance
from app.store import get_store

DATASET = "sim_batches"
RULES_DATASET = "nt106003_rules"
SOURCE = "data/simulated/sim_batches"
DEFAULT_PLANT_ID = "sousse_sud"

# Analysis type -> candidate columns. Only columns present in the data are used; a type with
# no present column is left out and then reported as missing. No values are invented.
ANALYSIS_COLUMNS: dict[str, list[str]] = {
    # contract convention: faecal coliforms are kept with the physico-chemical analysis
    "physico_chemical": ["EC_dS_m", "SAR", "BOD5_mg_L", "COD_mg_L", "TSS_mg_L", "total_N_mg_L",
                         "Cl_mg_L", "pH", "faecal_coliforms_cfu_100mL"],
    "parasite_eggs": ["helminth_eggs_per_L", "nematode_eggs_per_L"],
    "metals": ["As_mg_L", "B_mg_L", "Cd_mg_L", "Cr_mg_L", "Cu_mg_L", "Hg_mg_L", "Ni_mg_L", "Pb_mg_L", "Zn_mg_L"],
}

# A batch without these is "missing". Metals are NOT required per batch: Decree 89-1047 only asks
# for them once per semester, so most batches legitimately have none -> warning, not "missing".
REQUIRED_TYPES = ("physico_chemical", "parasite_eggs")


# ---------------------------------------------------------------- validity periods
# Decree 89-1047 (28 July 1989, mod. 93-2447) Art.3 monitoring frequencies:
#   Art.3a physico-chemical: at least once per month   -> 30 days
#   Art.3b metals:           at least once per semester -> 182 days
#   Art.3c parasite eggs:    once every 15 days         -> 15 days
# Read from data/clean/nt106003_rules.json (via the store); these are the fallbacks.
VALIDITY_DAYS_FALLBACK = {"physico_chemical": 30, "parasite_eggs": 15, "metals": 182}


def _frequency_to_days(text: str) -> int | None:
    t = text.lower()
    if m := re.search(r"every\s+(\d+)\s+days?", t):
        return int(m.group(1))
    if "semester" in t:
        return 182
    if "month" in t:
        return 30
    if "week" in t:
        return 7
    return None


def _type_of(what: str) -> str:
    w = what.lower()
    if "parasite" in w or "egg" in w:
        return "parasite_eggs"
    if re.search(r"\b(cd|hg|pb|zn|ni)\b", w):
        return "metals"
    return "physico_chemical"


def _load_validity_days() -> dict[str, int]:
    days = dict(VALIDITY_DAYS_FALLBACK)
    try:
        rules = get_store()[RULES_DATASET]
        for entry in rules["decree_89_1047"]["monitoring_frequency"]:
            n = _frequency_to_days(entry["frequency"])
            if n:
                days[_type_of(entry["what"])] = n
    except (KeyError, TypeError):
        pass  # keep fallbacks if the rules file is missing or reshaped
    return days


VALIDITY_DAYS: dict[str, int] = _load_validity_days()


# ---------------------------------------------------------------- validity logic
def _to_date(v) -> date:
    if isinstance(v, pd.Timestamp):
        return v.date()
    if isinstance(v, date):
        return v
    return date.fromisoformat(str(v)[:10])


def make_analysis(kind: str, analysis_date, batch_date, values: dict[str, float]) -> Analysis:
    """valid_until = analysis date + legal frequency; valid if the batch is on or before that day."""
    a_date, b_date = _to_date(analysis_date), _to_date(batch_date)
    valid_until = a_date + timedelta(days=VALIDITY_DAYS[kind])
    return Analysis(type=kind, date=a_date.isoformat(), valid_until=valid_until.isoformat(),
                    is_valid=b_date <= valid_until, values=values)


def analysis_status(analyses: list[Analysis]) -> str:
    present = {a.type for a in analyses}
    if any(t not in present for t in REQUIRED_TYPES):
        return "missing"
    if any(not a.is_valid for a in analyses):
        return "expired"
    return "valid"


def analysis_warnings(analyses: list[Analysis]) -> list[str]:
    """Non-blocking notes; fills Batch.warnings."""
    if not any(a.type == "metals" for a in analyses):
        return ["No metals analysis on record (required once per semester, Decree 89-1047 Art.3b)."]
    return []


def build_batch(*, id: str, plant_id: str, batch_date, volume_m3: float, treatment_level: str,
                analyses: list[Analysis], tag: Tag) -> Batch:
    batch = Batch(id=id, plant_id=plant_id, date=_to_date(batch_date).isoformat(), volume_m3=float(volume_m3),
                  treatment_level=treatment_level, analyses=analyses,
                  analysis_status=analysis_status(analyses), status="analysis_invalid",
                  warnings=analysis_warnings(analyses), tag=tag)
    # A-03b: status = compliance with NT 106.03 / Decree 89-1047
    batch.status = batch_compliance(batch)
    return batch


# ---------------------------------------------------------------- dataset rows -> Batch
def _present(v) -> bool:
    return v is not None and not (isinstance(v, float) and math.isnan(v))


def _row_analyses(row: pd.Series) -> list[Analysis]:
    # Each batch is dated by its own analysis_date (one date for all types in sim_batches).
    # sim_lab_history_weekly ends 2026-06-29, before every batch, so it is unused here; the risk model (A-08) uses it.
    out = []
    for kind, cols in ANALYSIS_COLUMNS.items():
        values = {c: float(row[c]) for c in cols if c in row.index and _present(row[c])}
        if values:
            out.append(make_analysis(kind, row["analysis_date"], row["date"], values))
    return out


def _row_to_batch(row: pd.Series) -> Batch:
    plant = row.get("plant_osm_id")
    return build_batch(
        id=row["batch_id"],
        plant_id=plant if isinstance(plant, str) and plant else DEFAULT_PLANT_ID,
        batch_date=row["date"], volume_m3=row["volume_m3"], treatment_level=row["treatment_level"],
        analyses=_row_analyses(row), tag=Tag(status="SIMULATED", source=SOURCE),
    )


# ---------------------------------------------------------------- operator batches (memory only)
_operator_batches: dict[str, Batch] = {}
_counter = itertools.count(1)


def create_batch(*, plant_id: str, batch_date, volume_m3: float, treatment_level: str,
                 analyses: list[dict]) -> Batch:
    """analyses: [{type, date, values}]. Kept in memory only (demo); never written to data/."""
    b_date = _to_date(batch_date)
    batch_id = f"OP-{b_date:%Y%m%d}-{next(_counter):03d}"
    built = [make_analysis(a["type"], a["date"], b_date, a["values"]) for a in analyses]
    batch = build_batch(id=batch_id, plant_id=plant_id, batch_date=b_date, volume_m3=volume_m3,
                        treatment_level=treatment_level, analyses=built,
                        tag=Tag(status="REPORTED", source="operator input"))
    _operator_batches[batch_id] = batch
    return batch


# ---------------------------------------------------------------- public API
def _all_batches() -> list[Batch]:
    df = get_store()[DATASET]
    return [_row_to_batch(row) for _, row in df.iterrows()] + list(_operator_batches.values())


def list_batches(plant_id: str | None = None) -> list[Batch]:
    batches = [b for b in _all_batches() if not plant_id or b.plant_id == plant_id]
    return sorted(batches, key=lambda b: (b.date, b.id), reverse=True)


def get_batch(batch_id: str) -> Batch | None:
    if batch_id in _operator_batches:
        return _operator_batches[batch_id]
    df = get_store()[DATASET]
    match = df[df["batch_id"] == batch_id]
    return None if match.empty else _row_to_batch(match.iloc[0])
