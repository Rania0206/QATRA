"""Batch passport (B-12a): one page that says what a batch of treated water is and what it may be used for.

Everything is read from existing engines and the regulation pack (no value is invented here):
- quality limits come from the A-03 rules (NT 106.03); the faecal-coliform limit is the WHO-derived fallback of the
  rules file, tagged TO_VERIFY and NOT Tunisian law;
- analysis validity comes from engine/batches (Decree 89-1047 Art.3: 30 days, 15 days, 6 months);
- crops come from the 21 June 1994 order in nt106003_rules.json.
"""
from typing import Optional

from app.engine.batches import REQUIRED_TYPES, VALIDITY_DAYS, get_batch
from app.engine.rules import batch_compliance
from app.engine.rules_config import get_rule
from app.schemas import Batch, Passport, PassportCheck, PassportEvent, PassportQuality, Tag
from app.store import get_store

NT_DATASET = "nt106003_rules"
LEGAL_NT = "NT 106.03 (1989)"
LEGAL_DECREE = {"physico_chemical": "Decree 89-1047 Art.3a", "metals": "Decree 89-1047 Art.3b",
                "parasite_eggs": "Decree 89-1047 Art.3c"}
ISSUE_TIME = "07:00:00"  # simulated issue time of the day's passport (same convention as the original mock)

# Faecal coliforms: batch value key, shown last because its limit is not law.
COLIFORM_KEY = "faecal_coliforms_cfu_100mL"
NEMATODE_KEYS = ("helminth_eggs_per_L", "nematode_eggs_per_L")

# (param id, label, batch value keys, rule id, unit shown). EC: the NT limit is in uS/cm, the batch value in dS/m.
_ROWS = [
    ("EC", "Electrical conductivity", ("EC_dS_m",), "R-LIMIT-EC", "dS/m"),
    ("BOD5", "BOD5", ("BOD5_mg_L",), "R-LIMIT-BOD5", "mg/L"),
    ("COD", "COD", ("COD_mg_L",), "R-LIMIT-COD", "mg/L"),
    ("TSS", "Suspended solids (TSS)", ("TSS_mg_L",), "R-LIMIT-TSS", "mg/L"),
    ("pH", "pH", ("pH",), "R-LIMIT-PH", ""),
    ("helminth_eggs", "Helminth (nematode) eggs", NEMATODE_KEYS, "R-NEMATODE", "eggs/L"),
]


def _first(values: dict[str, float], keys: tuple[str, ...]) -> Optional[float]:
    return next((values[k] for k in keys if k in values), None)


def _ok(value: Optional[float], lo: Optional[float], hi: Optional[float]) -> Optional[bool]:
    if value is None:
        return None  # not measured: neither ok nor not ok
    return (lo is None or value >= lo) and (hi is None or value <= hi)


def quality_summary(batch: Batch) -> list[PassportQuality]:
    values = {k: v for a in batch.analyses for k, v in a.values.items()}
    out = []
    for pid, label, keys, rule_id, unit in _ROWS:
        rule = get_rule(rule_id)
        if rule is None:
            continue
        hi = rule.limit / 1000.0 if pid == "EC" and rule.limit is not None else rule.limit  # uS/cm -> dS/m
        value = _first(values, keys)
        out.append(PassportQuality(param=pid, label=label, value=value, unit=unit, limit_min=rule.limit_min,
                                   limit_max=hi, ok=_ok(value, rule.limit_min, hi), legal_ref=rule.legal_ref, tag=rule.tag))
    # Faecal coliforms: NT 106.03 has no limit. The WHO-derived design value is a fallback, not law.
    nt = get_store()[NT_DATASET]
    colif = next((p for p in nt["parameters"] if "coliform" in p["parameter"].lower()), {})
    limit = colif.get("fallback_used_by_engine")
    value = values.get(COLIFORM_KEY)
    out.append(PassportQuality(
        param="faecal_coliforms", label="Faecal coliforms", value=value, unit="CFU/100 mL", limit_min=None,
        limit_max=float(limit) if limit is not None else None, ok=_ok(value, None, limit),
        legal_ref="No limit in NT 106.03: WHO-derived fallback, not Tunisian law",
        tag=Tag(status="TO_VERIFY", source="WHO 2006 design value (fallback), not Tunisian law")))
    return out


def checks(batch: Batch) -> list[PassportCheck]:
    """Validity of each analysis type, in order physico-chemical, parasite eggs, metals."""
    by_type = {a.type: a for a in batch.analyses}
    out = []
    for kind in ("physico_chemical", "parasite_eggs", "metals"):
        a = by_type.get(kind)
        out.append(PassportCheck(
            type=kind, required=kind in REQUIRED_TYPES, present=a is not None,
            analysed_on=a.date if a else None, valid_until=a.valid_until if a else None,
            validity_days=VALIDITY_DAYS[kind],
            # missing required analysis = not valid; missing metals (once per semester) = not applicable
            is_valid=a.is_valid if a else (False if kind in REQUIRED_TYPES else None),
            legal_ref=LEGAL_DECREE[kind]))
    return out


def crops(usable: bool) -> tuple[list[str], list[str]]:
    """(allowed, blocked) crops. Allowed = the 1994 order, only when the batch itself is usable."""
    nt = get_store()[NT_DATASET]
    a = nt["allowed_crops_arrete_21_06_1994"]
    allowed = [*a["industrial"], *a["cereals"], *a["fodder"], *a["fodder_shrubs"]]
    fruit = a["fruit_trees"].split(" - ")[0]
    allowed += [f"{c.strip()} (no sprinkler)" for c in fruit.split(",")]
    if a.get("forest_trees"):
        allowed.append("forest trees")
    allowed += [f"{c} (to verify)" for c in (get_rule("R-CROP-ALLOWED").crops_to_verify if get_rule("R-CROP-ALLOWED") else [])]
    raw = get_rule("R-RAW-EATEN")
    blocked = [*(raw.crops if raw else []), "vegetables and crops eaten raw (Decree 89-1047 Art.5)",
               "direct grazing (Decree 89-1047 Art.6)"]
    return (allowed if usable else []), blocked


def _plant_name(plant_id: str) -> str:
    from app.routers.plants import build_plants  # B-13: plant names and their TO_VERIFY status

    plant = next((p for p in build_plants() if p.id == plant_id), None)
    if plant is None:
        return plant_id
    return f"{plant.name} WWTP" + (" (identity TO_VERIFY)" if plant.tag.status == "TO_VERIFY" else "")


# risk_colour here follows the legal compliance (A-03) until the risk model (A-08) provides its own score.
_COLOUR = {"compliant": "green", "conditional": "amber", "non_compliant": "red", "analysis_invalid": "red"}


def timeline(batch: Batch, issued_at: str, has_destinations: bool) -> list[PassportEvent]:
    events = []
    sampled = sorted({a.date for a in batch.analyses})
    if sampled:
        events.append(PassportEvent(at=sampled[0], event="Sampled for laboratory analysis"))
    events.append(PassportEvent(at=batch.date, event="Checked against NT 106.03 limits and analysis validity"))
    events.append(PassportEvent(at=issued_at, event="Passport issued"))
    if has_destinations:  # only when an allocation exists: nothing is claimed as delivered otherwise
        events.append(PassportEvent(at=batch.date, event="Delivered to the farms listed below"))
    return events


def build_passport(batch_id: str) -> Optional[Passport]:
    batch = get_batch(batch_id)
    if batch is None:
        return None
    compliance = batch_compliance(batch)
    usable = compliance in ("compliant", "conditional")
    allowed, blocked = crops(usable)
    issued_at = f"{batch.date}T{ISSUE_TIME}"
    destinations: list = []  # filled from the allocation (A-05) once it exists; documented as [] until then
    return Passport(
        batch_id=batch.id, plant=_plant_name(batch.plant_id), date=batch.date, volume_m3=batch.volume_m3,
        analysis_status=batch.analysis_status, risk_colour=_COLOUR[compliance],
        allowed_crops=allowed, blocked_crops=blocked, destinations=destinations, issued_at=issued_at,
        qr_payload=f"qatra:passport:{batch.id}", quality_summary=quality_summary(batch), checks=checks(batch),
        timeline=timeline(batch, issued_at, bool(destinations)), tag=batch.tag)
