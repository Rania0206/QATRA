"""A-03b: rules engine on the demo data (farm x batch, batch alone) + farms loader."""
from collections import Counter

from app.engine.batches import get_batch, list_batches
from app.engine.farms import get_farm, list_farms
from app.engine.rules import batch_compliance, evaluate, evaluate_batch
from app.schemas import Farm
from app.store import init_store

init_store()

GOOD = "SSUD-20260708"  # valid analyses, every measured value within NT 106.03
EXPIRED = "SSUD-20260712"  # planned stale analysis


def failed(ev):
    return {r.rule_id for r in ev["results"] if not r.passed}


def rule_ids(ev):
    return {r.rule_id for r in ev["results"]}


# ---------- farms loader ----------

def test_farms_loader():
    farms = list_farms()
    assert [f.id for f in farms] == list("ABCDEFGHIJ")
    a = get_farm("A")
    assert isinstance(a, Farm) and a.crop == "alfalfa" and a.soil_ece == 1.9
    assert a.tag.status == "SIMULATED" and a.tag.source == "data/simulated/sim_farms"
    assert a.head_m == 103 and a.pump_efficiency == 0.52  # sim_pumps_basin farm_well_pumps
    assert all(f.well_depth_m is None for f in farms)  # no well-depth column in the data
    assert get_farm("B").soil_texture == "sandy loam"  # demo override, note stripped
    assert get_farm("Z") is None


# ---------- demo farms A / B / C ----------

def test_farm_c_lettuce_blocked_raw_eaten():
    ev = evaluate(get_farm("C"), get_batch(GOOD))
    assert ev["status"] == "blocked"
    raw = next(r for r in ev["results"] if r.rule_id == "R-RAW-EATEN")
    assert not raw.passed and raw.reason_en == "Lettuce is eaten raw: forbidden (Decree 89-1047 Art. 5)"


def test_farm_a_alfalfa_conditional_salinity_plus_grazing_info():
    ev = evaluate(get_farm("A"), get_batch(GOOD))
    assert ev["status"] == "conditional"
    assert failed(ev) == {"R-SALINITY-ALFALFA"}
    sal = next(r for r in ev["results"] if r.rule_id == "R-SALINITY-ALFALFA")
    assert sal.severity == "condition" and "1.9 dS/m" in sal.reason_en and "2 dS/m" in sal.reason_en
    info = next(r for r in ev["results"] if r.rule_id == "R-GRAZING-FODDER")
    assert info.passed and info.severity == "info" and "cut-and-carry" in info.reason_en


def test_farm_b_olive_compatible_with_compliant_batch():
    batch = get_batch(GOOD)
    assert batch_compliance(batch) == "compliant"
    ev = evaluate(get_farm("B"), batch)
    assert ev["status"] == "compatible" and failed(ev) == set()


def test_expired_analysis_blocks_every_farm():
    batch = get_batch(EXPIRED)
    assert batch.analysis_status == "expired" and batch_compliance(batch) == "analysis_invalid"
    for farm in list_farms():
        ev = evaluate(farm, batch)
        assert ev["status"] == "blocked" and "R-ANALYSIS" in failed(ev), farm.id


def test_parameter_above_nt_limit_is_non_compliant_and_blocked():
    good = get_batch(GOOD)
    analyses = [a.model_copy(update={"values": {**a.values, "BOD5_mg_L": 45.0}}) if a.type == "physico_chemical" else a
                for a in good.analyses]
    bad = good.model_copy(update={"id": "TEST-BOD5", "analyses": analyses})
    assert batch_compliance(bad) == "non_compliant"
    r = next(r for r in evaluate_batch(bad) if r.rule_id == "R-LIMIT-BOD5")
    assert not r.passed and r.reason_en.startswith("BOD5 45 mg O2/L (24h mean) above limit 30")
    ev = evaluate(get_farm("B"), bad)
    assert ev["status"] == "blocked" and failed(ev) == {"R-LIMIT-BOD5"}


def test_ph_range_both_sides():
    good = get_batch(GOOD)
    for ph, ok in [(6.4, False), (6.5, True), (8.5, True), (8.6, False)]:
        analyses = [a.model_copy(update={"values": {**a.values, "pH": ph}}) if a.type == "physico_chemical" else a
                    for a in good.analyses]
        r = next(r for r in evaluate_batch(good.model_copy(update={"analyses": analyses})) if r.rule_id == "R-LIMIT-PH")
        assert r.passed is ok, ph


# ---------- batch-level only ----------

def test_evaluate_batch_has_only_batch_rules():
    ids = {r.rule_id for r in evaluate_batch(get_batch(GOOD))}
    assert "R-ANALYSIS" in ids and "R-NEMATODE" in ids and "R-LIMIT-EC" in ids
    assert not ids & {"R-CROP-ALLOWED", "R-RAW-EATEN", "R-GRAZING", "R-COLIFORM"}
    assert not any(i.startswith("R-SALINITY") for i in ids)


def test_batch_status_is_compliance():
    counts = Counter(b.status for b in list_batches())
    assert counts == {"compliant": 51, "analysis_invalid": 6, "non_compliant": 3}
    assert get_batch("SSUD-20260718").status == "non_compliant"  # BOD5/COD/TSS above NT 106.03
    assert get_batch("SSUD-20260808").status == "non_compliant"  # helminth eggs > 1/L


def test_evaluate_is_pure():
    farm, batch = get_farm("A"), get_batch(GOOD)
    before = (farm.model_dump(), batch.model_dump())
    assert evaluate(farm, batch) == evaluate(farm, batch)
    assert (farm.model_dump(), batch.model_dump()) == before
