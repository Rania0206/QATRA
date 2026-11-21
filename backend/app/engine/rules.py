"""A-03b: evaluate the fixed rules of rules_config (no AI).

Pure functions: inputs are Batch / Farm objects and the rule list (defaults to get_rules(), which is
built once from the in-memory store). Nothing is read from disk here.

- evaluate_batch(batch)   -> batch-level results (R-ANALYSIS, R-LIMIT-*, R-NEMATODE)
- batch_compliance(batch) -> "compliant" | "conditional" | "non_compliant" | "analysis_invalid"
- evaluate(farm, batch)   -> {"status": "compatible" | "conditional" | "blocked", "results": [...]}

R-COLIFORM is not evaluated: it was removed from the rules in A-03a (NT 106.03 sets no coliform limit).
"""
from typing import Literal, Optional, TypedDict

from app.engine.rules_config import SALINITY_SOIL_FACTOR, Rule, get_rules, salinity_not_assessed
from app.schemas import Batch, Farm, RuleResult

Status = Literal["compatible", "conditional", "blocked"]
Compliance = Literal["compliant", "conditional", "non_compliant", "analysis_invalid"]

BATCH_FAMILIES = ("analysis", "water_limit")


class Evaluation(TypedDict):
    status: Status
    results: list[RuleResult]


# ---------- helpers ----------

def _g(v: float) -> str:
    return f"{round(v, 3):g}"


def crop_label(crop: str) -> str:
    """'barley_fodder' -> 'Barley fodder'."""
    return crop.replace("_", " ").strip().capitalize()


def crop_names(crop: str) -> set[str]:
    """sim_farms crop code -> names used in the 1994 order. 'barley_fodder' -> {..., 'barley'}."""
    c = crop.strip().lower()
    return {c, c.replace("_", " "), c.replace("_fodder", "").replace("_", " ")}


def _res(rule: Rule, passed: bool, en: str, fr: str, severity: Optional[str] = None) -> RuleResult:
    return RuleResult(rule_id=rule.rule_id, passed=passed, severity=severity or rule.severity_if_failed,
                      source_type=rule.source_type, reason_en=en, reason_fr=fr, legal_ref=rule.legal_ref)


def _values(batch: Batch) -> dict[str, float]:
    return {k: v for a in batch.analyses for k, v in a.values.items()}


def overall(results: list[RuleResult]) -> Status:
    failed = {r.severity for r in results if not r.passed}
    if "block" in failed:
        return "blocked"
    if "condition" in failed:
        return "conditional"
    return "compatible"


# ---------- batch-level rules ----------

def _analysis(rule: Rule, batch: Batch) -> RuleResult:
    if batch.analysis_status == "valid":
        return _res(rule, True, "Required analyses present and valid",
                    "Analyses obligatoires presentes et valides")
    stale = [a.type.replace("_", "-") for a in batch.analyses if not a.is_valid]
    if batch.analysis_status == "expired":
        return _res(rule, False, f"Analysis expired ({', '.join(stale)}): batch cannot be used (Decree 89-1047 Art. 3)",
                    f"Analyse perimee ({', '.join(stale)}) : lot inutilisable (decret 89-1047 art. 3)")
    return _res(rule, False, "Required analysis missing: batch cannot be used (Decree 89-1047 Art. 3)",
                "Analyse obligatoire manquante : lot inutilisable (decret 89-1047 art. 3)")


def _limit(rule: Rule, values: dict[str, float]) -> Optional[RuleResult]:
    """None when the batch has no value for this parameter (e.g. metals without a metals analysis)."""
    measured = [values[f] for f in rule.batch_fields if f in values]
    if not measured or rule.limit is None:
        return None
    v, lim, lo = max(measured), rule.limit, rule.limit_min
    unit = (rule.unit or "").replace("(<=)", "").strip()
    if rule.parameter == "EC":  # NT limit in uS/cm, batch EC in dS/m -> show in dS/m
        lim, unit = lim / 1000, "dS/m"
    if rule.rule_id == "R-NEMATODE":
        unit = "eggs/L"  # 1 egg per 1000 mL
    unit = "" if unit in ("", "-") else f" {unit}"
    unit_lim = unit if rule.parameter != "pH" else ""
    name = name_fr = rule.parameter
    unit_fr = unit
    if rule.rule_id == "R-NEMATODE":
        name, name_fr, unit_fr = "Nematode eggs", "Oeufs de nematodes", " oeufs/L"
    if lo is not None:
        ok = lo <= v <= lim
        en = f"{name} {_g(v)}{unit} {'within' if ok else 'outside'} {_g(lo)}–{_g(lim)}{unit_lim}"
        fr = f"{name_fr} {_g(v)}{unit_fr} {'dans' if ok else 'hors de'} {_g(lo)}–{_g(lim)}{unit_lim}"
    else:
        ok = v <= lim
        en = f"{name} {_g(v)}{unit} {'within' if ok else 'above'} limit {_g(lim)}"
        fr = f"{name_fr} {_g(v)}{unit_fr} {'sous la' if ok else 'au-dessus de la'} limite {_g(lim)}"
    return _res(rule, ok, f"{en} (NT 106.03)", f"{fr} (NT 106.03)")


def _not_measured(rules: list[Rule], values: dict[str, float]) -> Optional[RuleResult]:
    missing = [r.parameter for r in rules if r.family == "water_limit" and r.limit is not None
               and not any(f in values for f in r.batch_fields)]
    if not missing:
        return None
    return RuleResult(
        rule_id="R-LIMIT-NOT-MEASURED", passed=True, severity="info", source_type="tunisian_law",
        reason_en=f"Not measured in this batch, not checked: {', '.join(missing)} (metals: once per semester)",
        reason_fr=f"Non mesures pour ce lot, non verifies : {', '.join(missing)} (metaux : une fois par semestre)",
        legal_ref="NT 106.03 (1989); Decree 89-1047 Art.3b",
    )


def evaluate_batch(batch: Batch, rules: Optional[list[Rule]] = None) -> list[RuleResult]:
    rules = get_rules() if rules is None else rules
    values = _values(batch)
    out: list[RuleResult] = []
    for r in rules:
        if r.family == "analysis":
            out.append(_analysis(r, batch))
        elif r.family == "water_limit":
            res = _limit(r, values)
            if res:
                out.append(res)
    nm = _not_measured(rules, values)
    if nm:
        out.append(nm)
    return out


def batch_compliance(batch: Batch, results: Optional[list[RuleResult]] = None) -> Compliance:
    if batch.analysis_status != "valid":
        return "analysis_invalid"
    results = evaluate_batch(batch) if results is None else results
    return {"blocked": "non_compliant", "conditional": "conditional", "compatible": "compliant"}[overall(results)]


# ---------- farm-level rules ----------

def _crop_allowed(rule: Rule, crop: str) -> RuleResult:
    names, label = crop_names(crop), crop_label(crop)
    if names & set(rule.crops):
        return _res(rule, True, f"{label} is on the allowed crop list (1994 order)",
                    f"{label} figure sur la liste des cultures autorisees (arrete de 1994)")
    if names & set(rule.crops_to_verify):
        return _res(rule, True, f"{label} allowed by interpretation, not named in the 1994 list (to verify)",
                    f"{label} autorise par interpretation, absent de la liste de 1994 (a verifier)")
    return _res(rule, False, f"{label} is not on the allowed crop list (1994 order)",
                f"{label} ne figure pas sur la liste des cultures autorisees (arrete de 1994)")


def _raw_eaten(rule: Rule, crop: str) -> RuleResult:
    label = crop_label(crop)
    if crop_names(crop) & set(rule.crops):
        return _res(rule, False, f"{label} is eaten raw: forbidden (Decree 89-1047 Art. 5)",
                    f"{label} se consomme cru : interdit (decret 89-1047 art. 5)")
    return _res(rule, True, f"{label} is not eaten raw", f"{label} ne se consomme pas cru")


def _grazing(rule: Rule, direct_grazing: bool) -> RuleResult:
    if direct_grazing:
        return _res(rule, False, "Direct grazing on this plot: forbidden (Decree 89-1047 Art. 6)",
                    "Paturage direct sur cette parcelle : interdit (decret 89-1047 art. 6)")
    return _res(rule, True, "No direct grazing on this plot", "Pas de paturage direct sur cette parcelle")


def _is_fodder(rule: Rule, crop: str) -> bool:
    return "fodder" in crop.lower() or bool(crop_names(crop) & {*rule.crops, *rule.crops_to_verify})


def _salinity(rule: Rule, farm: Farm) -> RuleResult:
    trigger = SALINITY_SOIL_FACTOR * rule.limit
    crop = crop_label(farm.crop).lower()
    if farm.soil_ece >= trigger:
        return _res(rule, False,
                    f"Soil ECe {_g(farm.soil_ece)} dS/m ≥ 80% of {crop} threshold {_g(rule.limit)} dS/m: "
                    "irrigate with leaching, watch soil salinity",
                    f"ECe du sol {_g(farm.soil_ece)} dS/m ≥ 80 % du seuil {crop} {_g(rule.limit)} dS/m : "
                    "irriguer avec lessivage, suivre la salinite")
    return _res(rule, True, f"Soil ECe {_g(farm.soil_ece)} dS/m below 80% of {crop} threshold {_g(rule.limit)} dS/m",
                f"ECe du sol {_g(farm.soil_ece)} dS/m sous 80 % du seuil {crop} {_g(rule.limit)} dS/m")


def evaluate_farm(farm: Farm, rules: Optional[list[Rule]] = None,
                  direct_grazing: bool = False) -> list[RuleResult]:
    """Crop / use / salinity rules for one farm.

    direct_grazing: sim_farms has no grazing / land-use field, so every farm is assumed False.
    """
    rules = get_rules() if rules is None else rules
    out: list[RuleResult] = []
    has_salinity_rule = False
    for r in rules:
        if r.rule_id == "R-CROP-ALLOWED":
            out.append(_crop_allowed(r, farm.crop))
        elif r.rule_id == "R-RAW-EATEN":
            out.append(_raw_eaten(r, farm.crop))
        elif r.rule_id == "R-GRAZING":
            out.append(_grazing(r, direct_grazing))
        elif r.rule_id == "R-GRAZING-FODDER" and _is_fodder(r, farm.crop):
            out.append(_res(r, True, "Fodder crop: cut-and-carry only, no direct grazing",
                            "Culture fourragere : fauche et affouragement uniquement, pas de paturage direct"))
        elif r.family == "salinity" and farm.crop in r.crops:
            has_salinity_rule = True
            out.append(_salinity(r, farm))
    if not has_salinity_rule:
        out.append(salinity_not_assessed(farm.crop))
    return out


def evaluate(farm: Farm, batch: Batch, rules: Optional[list[Rule]] = None) -> Evaluation:
    rules = get_rules() if rules is None else rules
    results = evaluate_batch(batch, rules) + evaluate_farm(farm, rules)
    return {"status": overall(results), "results": results}
