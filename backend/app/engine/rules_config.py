"""A-03a: one normalised list of the rules the compatibility engine evaluates.

Every value comes from the data pack (read through the store). Nothing here is decided by AI.
If a value is missing or unclear, the rule is kept with limit=None and tag TO_VERIFY.

Sources (all via get_store()):
- nt106003_rules: NT 106.03 limits, Decree 89-1047 articles, 1994 allowed-crop order
- crop_salt_tolerance: FAO-29 Table 4 (soil ECe thresholds per crop)
"""
import math
import re
from functools import lru_cache
from typing import Literal, Optional

import pandas as pd
from pydantic import BaseModel, Field

from app.schemas import RuleResult, Tag
from app.store import get_store

Family = Literal["analysis", "water_limit", "crop", "use", "salinity"]
Severity = Literal["block", "condition", "info"]
SourceType = Literal["tunisian_law", "agronomic_advice"]

NT_DATASET = "nt106003_rules"
SALT_DATASET = "crop_salt_tolerance"

NT_REF = "NT 106.03 (1989)"
FAO_REF = "FAO-29 (agronomic guidance)"
SALINITY_SOIL_FACTOR = 0.8  # condition when soil ECe >= 80% of the crop threshold (QATRA choice)


class Rule(BaseModel):
    rule_id: str
    family: Family
    source_type: SourceType  # tunisian_law: NT 106.03, Decree 89-1047, 1994 order; agronomic_advice: FAO-29
    parameter: Optional[str] = None
    limit: Optional[float] = None  # upper limit (pass if value <= limit)
    limit_min: Optional[float] = None  # lower limit, only for ranges (pH)
    unit: Optional[str] = None
    batch_fields: list[str] = Field(default_factory=list)  # Batch analysis value keys to compare
    crops: list[str] = Field(default_factory=list)  # crop list for crop/use/salinity rules
    crops_to_verify: list[str] = Field(default_factory=list)  # crops allowed only by interpretation
    severity_if_failed: Severity
    legal_ref: str
    tag: Tag
    text_en: str
    text_fr: str


# NT 106.03 parameter name -> Batch analysis value keys (see engine/batches.ANALYSIS_COLUMNS).
# Metals and other parameters have no column in the batch data: the rule exists, but cannot be
# evaluated until a metals analysis is recorded.
BATCH_FIELDS = {
    "pH": ["pH"],
    "EC": ["EC_dS_m"],  # NT limit is in uS/cm, batch value in dS/m: 1 dS/m = 1000 uS/cm
    "COD": ["COD_mg_L"],
    "BOD5": ["BOD5_mg_L"],
    "TSS": ["TSS_mg_L"],
    "Chloride": ["Cl_mg_L"],
}
NEMATODE_FIELDS = ["helminth_eggs_per_L", "nematode_eggs_per_L"]  # 1 egg / 1000 mL = 1 egg / L


def _status(raw: str | None) -> str:
    """Map a data-pack status string ('REPORTED (press)', 'ESTIMATE / TO_VERIFY ...') to a Tag status."""
    s = (raw or "").upper()
    if "TO_VERIFY" in s:
        return "TO_VERIFY"
    for st in ("REPORTED", "ESTIMATE", "PROJECTION", "SIMULATED"):
        if s.startswith(st):
            return st
    return "TO_VERIFY"


def _short_source(src: str) -> str:
    return src.split(" - http")[0].strip()


def _slug(name: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", name.upper()).strip("-")


def _num(v) -> Optional[float]:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _range(text: str) -> tuple[Optional[float], Optional[float]]:
    m = re.fullmatch(r"\s*([\d.]+)\s*-\s*([\d.]+)\s*", str(text))
    return (float(m.group(1)), float(m.group(2))) if m else (None, None)


# ---------- builders ----------

def _analysis_rule(nt: dict) -> Rule:
    dec = nt["decree_89_1047"]
    freq = "; ".join(f"{f['article']}: {f['what']} {f['frequency']}" for f in dec["monitoring_frequency"])
    return Rule(
        rule_id="R-ANALYSIS",
        family="analysis",
        severity_if_failed="block",
        source_type="tunisian_law",
        legal_ref="Decree 89-1047 Art.3 (monitoring frequencies)",
        tag=Tag(status=_status(dec.get("status")), source=dec.get("source")),
        text_en=f"Required analyses (physico-chemical, parasite eggs) must be present and still valid "
                f"(Batch.analysis_status = valid). {freq}.",
        text_fr="Les analyses obligatoires (physico-chimiques, oeufs de parasites) doivent etre presentes "
                "et encore valides (frequences du decret 89-1047, art. 3).",
    )


def _limit_rules(nt: dict) -> list[Rule]:
    rules = []
    for p in nt["parameters"]:
        name = p["parameter"]
        if "nematode" in name.lower() or "coliform" in name.lower():
            continue  # dedicated rules below
        tag = Tag(status=_status(p.get("status")), source=_short_source(p.get("source", "")))
        lo, hi = (None, _num(p["limit"]))
        if hi is None and isinstance(p["limit"], str):
            lo, hi = _range(p["limit"])
        if hi is None:
            tag = Tag(status="TO_VERIFY", source=tag.source)
        bound = f"{lo:g} - {hi:g}" if lo is not None else (f"<= {hi:g}" if hi is not None else "within the NT limit")
        unit = "" if p.get("unit") in (None, "-") else f" {p['unit']}"
        rules.append(Rule(
            rule_id=f"R-LIMIT-{_slug(name)}",
            family="water_limit",
            parameter=name,
            limit=hi,
            limit_min=lo,
            unit=p.get("unit"),
            batch_fields=BATCH_FIELDS.get(name, []),
            severity_if_failed="block",
            source_type="tunisian_law",
            legal_ref=NT_REF,
            tag=tag,
            text_en=f"{name} must be {bound}{unit} (NT 106.03).",
            text_fr=f"{name} doit etre {bound}{unit} (NT 106.03).",
        ))
    return rules


def _nematode_rule(nt: dict) -> Rule:
    p = next(x for x in nt["parameters"] if "nematode" in x["parameter"].lower())
    limit = _num(p["limit"])
    return Rule(
        rule_id="R-NEMATODE",
        family="water_limit",
        parameter=p["parameter"],
        limit=limit,
        unit=p.get("unit"),
        batch_fields=NEMATODE_FIELDS,
        severity_if_failed="block",
        source_type="tunisian_law",
        legal_ref=NT_REF,
        tag=Tag(status=_status(p.get("status")) if limit is not None else "TO_VERIFY",
                source=_short_source(p.get("source", ""))),
        text_en=f"Intestinal nematode (helminth) eggs must be <= {limit:g} egg per litre (NT 106.03).",
        text_fr=f"Les oeufs de nematodes intestinaux doivent etre <= {limit:g} oeuf par litre (NT 106.03).",
    )


def _crop_allowed_rule(nt: dict) -> Rule:
    a = nt["allowed_crops_arrete_21_06_1994"]
    crops = [*a["industrial"], *a["cereals"], *a["fodder"], *a["fodder_shrubs"]]
    # fruit_trees is a sentence in the data: "date palm, citrus, vines - on condition they are NOT ..."
    fruit = a["fruit_trees"].split(" - ")[0]
    crops += [c.strip() for c in fruit.split(",")]
    if a.get("forest_trees"):
        crops.append("forest trees")
    return Rule(
        rule_id="R-CROP-ALLOWED",
        family="crop",
        crops=crops,
        # olive and alfalfa are not in the extracted list; the data note says the engine treats them
        # as allowed (fruit tree / fodder) and marks this TO_VERIFY.
        crops_to_verify=["olive", "alfalfa"],
        severity_if_failed="block",
        source_type="tunisian_law",
        legal_ref="Arrete du Ministre de l'Agriculture du 21 juin 1994 (Decree 89-1047 Art.7)",
        tag=Tag(status=_status(a.get("status")), source=_short_source(a.get("source", ""))),
        text_en="The crop must be on the list fixed by the 21 June 1994 order (industrial crops, cereals, "
                "fodder, fodder shrubs, forest trees; fruit trees only if not sprinkler-irrigated). "
                "Olive and alfalfa are allowed by interpretation (TO_VERIFY against the full order).",
        text_fr="La culture doit figurer sur la liste de l'arrete du 21 juin 1994 (cultures industrielles, "
                "cereales, fourrages, arbustes fourragers, arbres forestiers ; arbres fruitiers seulement "
                "sans aspersion). Olivier et luzerne : par interpretation (A VERIFIER).",
    )


def _raw_eaten_rule(nt: dict) -> Rule:
    dec = nt["decree_89_1047"]
    raw = next(x for x in nt["engine_rule_mapping"]["blocked"] if "raw" in x)
    # "vegetables eaten raw (lettuce, tomato as fresh vegetable)" -> ["lettuce", "tomato"]
    examples = re.search(r"\(([^)]*)\)", raw).group(1)
    crops = [c.strip().split(" ")[0] for c in examples.split(",")]
    return Rule(
        rule_id="R-RAW-EATEN",
        family="crop",
        crops=crops,
        severity_if_failed="block",
        source_type="tunisian_law",
        legal_ref="Decree 89-1047 Art.5",
        tag=Tag(status=_status(dec.get("status")), source=dec.get("source")),
        text_en="Vegetable crops (cultures maraicheres) and crops eaten raw (crudites) cannot be irrigated "
                "with treated wastewater.",
        text_fr="L'irrigation des cultures maraicheres et des crudites par eaux usees traitees est interdite "
                "(decret 89-1047, art. 5).",
    )


def _grazing_rules(nt: dict) -> list[Rule]:
    dec = nt["decree_89_1047"]
    tag = Tag(status=_status(dec.get("status")), source=dec.get("source"))
    fodder = list(nt["allowed_crops_arrete_21_06_1994"]["fodder"])
    # sim_farms has no grazing / land-use field: the engine assumes direct_grazing = False for every farm.
    return [
        Rule(
            rule_id="R-GRAZING",
            family="use",
            parameter="direct_grazing",
            severity_if_failed="block",
            source_type="tunisian_law",
            legal_ref="Decree 89-1047 Art.6",
            tag=tag,
            text_en="Direct grazing on plots irrigated with treated wastewater is prohibited.",
            text_fr="Le paturage direct sur les parcelles irriguees par eaux usees traitees est interdit.",
        ),
        Rule(
            rule_id="R-GRAZING-FODDER",
            family="use",
            crops=fodder,
            crops_to_verify=["alfalfa"],
            severity_if_failed="info",
            source_type="tunisian_law",
            legal_ref="Decree 89-1047 Art.6",
            tag=tag,
            text_en="Fodder crop: cut-and-carry only, no direct grazing.",
            text_fr="Culture fourragere : fauche et affouragement uniquement, pas de paturage direct.",
        ),
    ]


def _salinity_rules(salt: pd.DataFrame) -> list[Rule]:
    """One rule per crop whose ECe threshold comes directly from FAO-29 (crop_salt_tolerance).

    Crops with a missing or estimated threshold (olive, pomegranate, oat_fodder) get no rule: the
    engine returns salinity_not_assessed() for them instead. The general water-salinity class
    (FAO-29 Table 1, ECw > 3.0 dS/m) is not used: it is not a crop threshold.
    """
    rules = []
    for _, r in salt.iterrows():
        crop = r["crop"]
        thr = _num(r["ECe_threshold_dS_m"])
        if thr is None or _status(r["status"]) != "REPORTED":
            continue
        rules.append(Rule(
            rule_id=f"R-SALINITY-{_slug(crop)}",
            family="salinity",
            source_type="agronomic_advice",
            parameter="soil_ece",
            limit=thr,
            unit="dS/m",
            crops=[crop],
            severity_if_failed="condition",
            legal_ref=FAO_REF,
            tag=Tag(status="ESTIMATE", source=_short_source(r["source"])),
            text_en=f"{crop}: soil ECe at or above 80% of the FAO-29 crop threshold ({thr:g} dS/m, "
                    f"trigger {SALINITY_SOIL_FACTOR * thr:g}) risks yield loss; irrigate with a leaching fraction.",
            text_fr=f"{crop} : ECe du sol >= 80 % du seuil FAO-29 de la culture ({thr:g} dS/m) ; "
                    "risque de perte de rendement, prevoir une fraction de lessivage.",
        ))
    return rules


def salinity_crops() -> set[str]:
    """Crops that have a salinity rule."""
    return {c for r in _build() if r.family == "salinity" for c in r.crops}


def salinity_not_assessed(crop: str) -> RuleResult:
    """Result for a crop with no FAO salinity threshold (A-03b uses it when no salinity rule applies)."""
    return RuleResult(
        rule_id="R-SALINITY-NONE",
        passed=True,
        severity="info",
        source_type="agronomic_advice",
        reason_en="No FAO salinity threshold for this crop — salinity not assessed",
        reason_fr="Pas de seuil FAO de salinité pour cette culture — salinité non évaluée",
        legal_ref=FAO_REF,
    )


@lru_cache(maxsize=1)
def _build() -> tuple[Rule, ...]:
    store = get_store()
    nt = store[NT_DATASET]
    rules = [
        _analysis_rule(nt),
        *_limit_rules(nt),
        _nematode_rule(nt),
        # Faecal coliforms: removed. NT 106.03 sets no coliform limit (only WHO guidance exists).
        _crop_allowed_rule(nt),
        _raw_eaten_rule(nt),
        *_grazing_rules(nt),
        *_salinity_rules(store[SALT_DATASET]),
    ]
    return tuple(rules)


def get_rules() -> list[Rule]:
    return list(_build())


def get_rule(rule_id: str) -> Optional[Rule]:
    return next((r for r in _build() if r.rule_id == rule_id), None)
