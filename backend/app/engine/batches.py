"""Batches of treated wastewater (A-02). Reads sim_batches from the in-memory store only."""
import math

import pandas as pd

from app.schemas import Analysis, Batch, Tag
from app.store import get_store

DATASET = "sim_batches"
SOURCE = "data/simulated/sim_batches"
DEFAULT_PLANT_ID = "sousse_sud"

# Analysis type -> candidate columns. Only columns present in the data are used; a type with
# no present column is left out (A-02b flags it as missing). No values are invented.
ANALYSIS_COLUMNS: dict[str, list[str]] = {
    # contract convention: faecal coliforms are kept with the physico-chemical analysis
    "physico_chemical": ["EC_dS_m", "SAR", "BOD5_mg_L", "COD_mg_L", "TSS_mg_L", "total_N_mg_L",
                         "Cl_mg_L", "pH", "faecal_coliforms_cfu_100mL"],
    "parasite_eggs": ["helminth_eggs_per_L", "nematode_eggs_per_L"],
    "metals": ["As_mg_L", "B_mg_L", "Cd_mg_L", "Cr_mg_L", "Cu_mg_L", "Hg_mg_L", "Ni_mg_L", "Pb_mg_L", "Zn_mg_L"],
}

# Placeholders until A-02b computes validity per analysis type (the contract requires these fields).
PENDING_VALID_UNTIL = ""
PENDING_STATUS = "pending_rules"


def _iso(v) -> str:
    return v.date().isoformat() if isinstance(v, pd.Timestamp) else str(v)


def _present(v) -> bool:
    return v is not None and not (isinstance(v, float) and math.isnan(v))


def _analyses(row: pd.Series) -> list[Analysis]:
    out = []
    for kind, cols in ANALYSIS_COLUMNS.items():
        values = {c: float(row[c]) for c in cols if c in row.index and _present(row[c])}
        if values:
            out.append(Analysis(type=kind, date=_iso(row["analysis_date"]), valid_until=PENDING_VALID_UNTIL,
                                is_valid=bool(row.get("analysis_valid", False)), values=values))
    return out


def _to_batch(row: pd.Series) -> Batch:
    plant = row.get("plant_osm_id")
    valid = bool(row.get("analysis_valid", False))
    return Batch(
        id=row["batch_id"],
        plant_id=plant if isinstance(plant, str) and plant else DEFAULT_PLANT_ID,
        date=_iso(row["date"]),
        volume_m3=float(row["volume_m3"]),
        treatment_level=row["treatment_level"],
        analyses=_analyses(row),
        analysis_status="valid" if valid else "expired",
        status=PENDING_STATUS,
        tag=Tag(status="SIMULATED", source=SOURCE),
    )


def _frame() -> pd.DataFrame:
    return get_store()[DATASET]


def list_batches(plant_id: str | None = None) -> list[Batch]:
    df = _frame()
    if plant_id:
        df = df[df["plant_osm_id"].fillna(DEFAULT_PLANT_ID) == plant_id]
    df = df.sort_values("date", ascending=False)
    return [_to_batch(row) for _, row in df.iterrows()]


def get_batch(batch_id: str) -> Batch | None:
    df = _frame()
    match = df[df["batch_id"] == batch_id]
    return None if match.empty else _to_batch(match.iloc[0])
