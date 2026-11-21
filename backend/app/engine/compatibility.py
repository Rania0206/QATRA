"""A-03b: evaluate one farm against one batch with the fixed rules of rules_config (no AI).

decision = "blocked"     if any failed rule has severity "block"
           "conditional" if any failed rule has severity "condition"
           "compatible"  otherwise
"""
from typing import Literal, Optional

import pandas as pd
from pydantic import BaseModel

from app.engine.batches import get_batch
from app.engine.rules_config import Rule, get_rules, salinity_crops, salinity_not_assessed
from app.schemas import Batch, RuleResult, Tag
from app.store import get_store

FARMS_DATASET = "sim_farms"
SOIL_TRIGGER = 0.8  # soil ECe >= 80% of the crop threshold -> condition (rules_config.SALINITY_SOIL_FACTOR)

Decision = Literal["compatible", "conditional", "blocked"]


class Compatibility(BaseModel):
    farm_id: str
    batch_id: str
    decision: Decision
    results: list[RuleResult]
    tag: Tag


# ---------- inputs ----------

def _farm(farm_id: str) -> Optional[pd.Series]:
    df = get_store()[FARMS_DATASET]
    rows = df[df["farm_id"].astype(str) == str(farm_id)]
    return None if rows.empty else rows.iloc[0]


def _values(batch: Batch) -> dict[str, float]:
    return {k: v for a in batch.analyses for k, v in a.values.items()}


def crop_names(crop: str) -> set[str]:
    """sim_farms crop code -> names used in the 1994 order list. 'barley_fodder' -> {barley_fodder, barley fodder, barley}."""
    c = crop.strip().lower()
    return {c, c.replace("_", " "), c.replace("_fodder", "").replace("_", " ")}


def _is_fodder(crop: str, fodder_rule: Rule) -> bool:
    names = crop_names(crop)
    return "fodder" in crop.lower() or bool(names & {*fodder_rule.crops, *fodder_rule.crops_to_verify})


def _result(rule: Rule, passed: bool, en: str, fr: str) -> RuleResult:
    return RuleResult(
        rule_id=rule.rule_id,
        passed=passed,
        severity=rule.severity_if_failed,
        source_type=rule.source_type,
        reason_en=en,
        reason_fr=fr,
        legal_ref=rule.legal_ref,
    )


def _fmt(v: float) -> str:
    return f"{v:g}"


# ---------- one function per rule family ----------

def _analysis(rule: Rule, batch: Batch) -> RuleResult:
    st = batch.analysis_status
    if st == "valid":
        return _result(rule, True, "Required analyses are present and still valid.",
                       "Les analyses obligatoires sont presentes et encore valides.")
    if st == "expired":
        return _result(rule, False, "At least one required analysis is too old (expired).",
                       "Au moins une analyse obligatoire est perimee.")
    return _result(rule, False, "A required analysis (physico-chemical or parasite eggs) is missing.",
                   "Une analyse obligatoire (physico-chimique ou oeufs de parasites) manque.")


def _limit(rule: Rule, values: dict[str, float]) -> Optional[RuleResult]:
    """None when the batch has no value for this parameter (e.g. metals without a metals analysis)."""
    measured = [values[f] for f in rule.batch_fields if f in values]
    if not measured or rule.limit is None:
        return None
    v = max(measured)
    shown, unit = v, (rule.unit or "").replace("(<=)", "").strip()
    if rule.parameter == "EC":  # NT limit in uS/cm, batch EC in dS/m
        v *= 1000
        shown = v
    unit = "" if unit in ("-", "") else f" {unit}"
    if rule.limit_min is not None:
        ok = rule.limit_min <= v <= rule.limit
        bound = f"{_fmt(rule.limit_min)} - {_fmt(rule.limit)}"
    else:
        ok = v <= rule.limit
        bound = f"<= {_fmt(rule.limit)}"
    word_en, word_fr = ("within", "respecte") if ok else ("ABOVE", "DEPASSE")
    return _result(rule, ok,
                   f"{rule.parameter} = {_fmt(round(shown, 3))}{unit}: {word_en} the NT 106.03 limit ({bound}).",
                   f"{rule.parameter} = {_fmt(round(shown, 3))}{unit} : {word_fr} la limite NT 106.03 ({bound}).")


def _not_measured(rules: list[Rule], values: dict[str, float]) -> Optional[RuleResult]:
    missing = [r.parameter for r in rules
               if r.family == "water_limit" and r.limit is not None
               and not any(f in values for f in r.batch_fields)]
    if not missing:
        return None
    return RuleResult(
        rule_id="R-LIMIT-NOT-MEASURED",
        passed=True,
        severity="info",
        source_type="tunisian_law",
        reason_en=f"Not measured in this batch, not checked: {', '.join(missing)} "
                  "(metals are required once per semester).",
        reason_fr=f"Non mesures pour ce lot, non verifies : {', '.join(missing)} "
                  "(metaux exiges une fois par semestre).",
        legal_ref="NT 106.03 (1989); Decree 89-1047 Art.3b",
    )


def _crop_allowed(rule: Rule, crop: str) -> RuleResult:
    names = crop_names(crop)
    if names & set(rule.crops):
        return _result(rule, True, f"{crop}: on the list of crops allowed by the 1994 order.",
                       f"{crop} : sur la liste des cultures autorisees (arrete de 1994).")
    if names & set(rule.crops_to_verify):
        return _result(rule, True, f"{crop}: allowed by interpretation (not named in the 1994 order list; to verify).",
                       f"{crop} : autorise par interpretation (non cite dans la liste de 1994 ; a verifier).")
    return _result(rule, False, f"{crop}: not on the list of crops allowed by the 1994 order.",
                   f"{crop} : absent de la liste des cultures autorisees (arrete de 1994).")


def _raw_eaten(rule: Rule, crop: str) -> RuleResult:
    if crop_names(crop) & set(rule.crops):
        return _result(rule, False, f"{crop} is a vegetable eaten raw: treated wastewater is prohibited.",
                       f"{crop} est un legume consomme cru : les eaux usees traitees sont interdites.")
    return _result(rule, True, f"{crop} is not a vegetable eaten raw.", f"{crop} n'est pas un legume consomme cru.")


def _grazing(rule: Rule) -> RuleResult:
    # sim_farms has no land-use field: every farm is assumed to have direct_grazing = False.
    return _result(rule, True, "No direct grazing declared on this plot.",
                   "Pas de paturage direct declare sur cette parcelle.")


def _fodder_info(rule: Rule) -> RuleResult:
    return _result(rule, True, "Fodder crop: cut-and-carry only, no direct grazing.",
                   "Culture fourragere : fauche et affouragement uniquement, pas de paturage direct.")


def _salinity(rule: Rule, soil_ece: float, crop: str) -> RuleResult:
    trigger = SOIL_TRIGGER * rule.limit
    if soil_ece >= trigger:
        return _result(rule, False,
                       f"Soil ECe {_fmt(soil_ece)} dS/m is at or above 80% of the {crop} threshold "
                       f"({_fmt(rule.limit)} dS/m): irrigate with a leaching fraction and monitor soil salinity.",
                       f"ECe du sol {_fmt(soil_ece)} dS/m >= 80 % du seuil {crop} ({_fmt(rule.limit)} dS/m) : "
                       "prevoir une fraction de lessivage et suivre la salinite.")
    return _result(rule, True,
                   f"Soil ECe {_fmt(soil_ece)} dS/m is below 80% of the {crop} threshold ({_fmt(rule.limit)} dS/m).",
                   f"ECe du sol {_fmt(soil_ece)} dS/m < 80 % du seuil {crop} ({_fmt(rule.limit)} dS/m).")


# ---------- public ----------

def decide(results: list[RuleResult]) -> Decision:
    failed = {r.severity for r in results if not r.passed}
    if "block" in failed:
        return "blocked"
    if "condition" in failed:
        return "conditional"
    return "compatible"


def evaluate(farm: pd.Series, batch: Batch) -> list[RuleResult]:
    crop = str(farm["crop"])
    soil_ece = float(farm["soil_ECe_dS_m"])
    values = _values(batch)
    rules = get_rules()
    out: list[RuleResult] = []
    for r in rules:
        if r.family == "analysis":
            out.append(_analysis(r, batch))
        elif r.family == "water_limit":
            res = _limit(r, values)
            if res:
                out.append(res)
        elif r.rule_id == "R-CROP-ALLOWED":
            out.append(_crop_allowed(r, crop))
        elif r.rule_id == "R-RAW-EATEN":
            out.append(_raw_eaten(r, crop))
        elif r.rule_id == "R-GRAZING":
            out.append(_grazing(r))
        elif r.rule_id == "R-GRAZING-FODDER":
            if _is_fodder(crop, r):
                out.append(_fodder_info(r))
        elif r.family == "salinity":
            if crop in r.crops:
                out.append(_salinity(r, soil_ece, crop))
    nm = _not_measured(rules, values)
    if nm:
        out.append(nm)
    if crop not in salinity_crops():
        out.append(salinity_not_assessed(crop))
    return out


def compatibility(farm_id: str, batch_id: str) -> Optional[Compatibility]:
    """None if the farm or the batch does not exist."""
    farm = _farm(farm_id)
    batch = get_batch(batch_id)
    if farm is None or batch is None:
        return None
    results = evaluate(farm, batch)
    return Compatibility(
        farm_id=str(farm["farm_id"]),
        batch_id=batch.id,
        decision=decide(results),
        results=results,
        tag=Tag(status="ESTIMATE", source="rules_config: NT 106.03, Decree 89-1047, 1994 order, FAO-29"),
    )
