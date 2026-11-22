import pandas as pd
from fastapi import APIRouter

from app.schemas import MetaSources, SafeFigure, SourceRow
from app.store import get_store

router = APIRouter(prefix="/api", tags=["meta"])

# The 5 figures of data/README.md section 4: (id, main context_figures row, related rows quoted in the definition).
# Only row ids live here; every value, unit, date and URL is read from context_figures.csv.
# Deliberately NOT here: CF06 22 % (all uses), CF07 4 % (agriculture), CF08 <10 % (2025) have other definitions,
# and CF14/CF15 (Court of Auditors, audit 2008-2011, published May 2014) is too old to be a headline figure.
SAFE_FIGURES = [
    ("SF1", "CF01", ["CF02"]),
    ("SF2", "CF04", ["CF05"]),
    ("SF3", "CF10", ["CF11", "CF09"]),
    ("SF4", "CF16", ["CF17", "CF18", "CF19", "CF20"]),
    ("SF5", "CF23", ["CF26"]),
]


def _clean(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v)


def _describe(r) -> str:
    return f"{r.metric}: {_clean(r.value)} {_clean(r.unit)}".strip() + f" ({_clean(r.period)})"


def safe_figures() -> list[SafeFigure]:
    cf = get_store()["context_figures"].set_index("id")
    out = []
    for sid, main, related in SAFE_FIGURES:
        r = cf.loc[main]
        parts = [f"{_clean(r.definition)} ({_clean(r.period)})."]
        if related:
            parts.append("Also reported: " + "; ".join(_describe(cf.loc[i]) for i in related) + ".")
        out.append(SafeFigure(
            id=sid, label=r.metric, value=_clean(r.value), unit=_clean(r.unit), definition=" ".join(parts),
            status=r.status, source_name=r.source_name, source_url=r.source_url, as_of=_clean(r.publication_date),
        ))
    return out


@router.get("/meta/sources", response_model=MetaSources, summary="Data catalogue and the 5 figures safe to cite")
def meta_sources():
    """`sources`: every row of the data catalogue (id, title, file, status, source_name, source_url). `safe_figures`: the 5
    figures of the pitch with their own definition, status, source and date (values read from context_figures.csv)."""
    cat = get_store()["data_catalog"]
    sources = [SourceRow(id=r.id, title=r.title, file=r.file, status=r.status, source_name=r.source_name,
                         source_url=_clean(r.source_url) or None) for r in cat.itertuples()]
    return MetaSources(sources=sources, safe_figures=safe_figures())
