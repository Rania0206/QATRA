import json
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

MOCKS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks"
SOUSSE_SUD = "w27944541"
PLANT_KEYS = {"id", "name", "governorate", "serves_perimeter", "treatment_level", "capacity_m3_d", "lat", "lon", "tag"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def plants(client):
    return client.get("/api/plants").json()


def test_plants_ok_and_shape(client, plants):
    assert client.get("/api/plants").status_code == 200
    assert len(plants) == 5
    for p in plants:
        assert set(p) == PLANT_KEYS
        assert set(p["tag"]) == {"status", "source"}


def test_sousse_sud_id_is_the_osm_id_and_matches_batches(client, plants):
    sud = next(p for p in plants if p["name"] == "Sousse Sud")
    assert sud["id"] == SOUSSE_SUD
    assert {b["plant_id"] for b in client.get("/api/batches").json()} == {SOUSSE_SUD}


def test_sousse_sud_tagged_to_verify_with_assumed_position(plants):
    sud = next(p for p in plants if p["id"] == SOUSSE_SUD)
    assert sud["tag"]["status"] == "TO_VERIFY"
    assert "identity assumed" in sud["tag"]["source"]
    assert "capacity != volume available to farmers" in sud["tag"]["source"]
    assert sud["treatment_level"] == "TO_VERIFY"
    assert sud["capacity_m3_d"] == 10000.0
    assert (sud["lat"], sud["lon"]) == (35.794719, 10.644677)


def test_no_invented_coordinates(plants):
    # Only Sousse Sud has a (sourced, assumed) position; every other plant must stay null.
    for p in plants:
        if p["id"] != SOUSSE_SUD:
            assert p["lat"] is None and p["lon"] is None, p["id"]


def test_ids_unique_and_json_has_no_nan(client, plants):
    assert len({p["id"] for p in plants}) == len(plants)
    for p in plants:
        assert p["capacity_m3_d"] is None or not math.isnan(p["capacity_m3_d"])
    json.loads(client.get("/api/plants").text)  # strict parse


def test_plants_match_mock_ids_and_keys(plants):
    mock = json.loads((MOCKS / "plants.json").read_text(encoding="utf-8"))
    assert [p["id"] for p in plants] == [m["id"] for m in mock]
    assert set(plants[0]) == set(mock[0])
    for p, m in zip(plants, mock):
        assert (p["lat"] is None) == (m["lat"] is None)
        assert p["tag"]["status"] == m["tag"]["status"]


# ---------------------------------------------------------------- map layers
@pytest.fixture(scope="module")
def layers(client):
    r = client.get("/api/map/layers")
    assert r.status_code == 200
    return {layer["id"]: layer for layer in r.json()["layers"]}


def test_layers_shape(layers):
    for layer in layers.values():
        assert set(layer) == {"id", "label", "tag", "features"}
        assert layer["tag"]["status"] in {"REPORTED", "ESTIMATE", "PROJECTION", "SIMULATED", "TO_VERIFY"}
        for f in layer["features"]:
            assert {"id", "name", "lat", "lon"} <= set(f)


def test_layers_contain_required_content(layers):
    assert {"plants", "irrigated_areas", "osm_plants"} <= set(layers)
    plant = layers["plants"]
    assert plant["tag"]["status"] == "TO_VERIFY"
    assert [f["id"] for f in plant["features"]] == [SOUSSE_SUD]
    zs = layers["irrigated_areas"]["features"][0]
    assert zs["area_ha"] == 257.0 and "Zaouiet Sousse" in zs["name"]
    assert zs["lat"] is None and zs["lon"] is None  # the data gives an area, not a location
    osm = layers["osm_plants"]["features"]
    assert len(osm) == 8 and SOUSSE_SUD not in {f["id"] for f in osm}
    assert all(f["lat"] is not None and f["lon"] is not None for f in osm)


def test_layers_match_mock_for_shared_layers(layers):
    mock = {l["id"]: l for l in json.loads((MOCKS / "map_layers.json").read_text(encoding="utf-8"))["layers"]}
    for lid in ("plants", "farms", "basin"):
        assert [f["id"] for f in layers[lid]["features"]] == [f["id"] for f in mock[lid]["features"]]
        for f, m in zip(layers[lid]["features"], mock[lid]["features"]):
            assert set(m) <= set(f)
            assert (f["lat"], f["lon"]) == (m["lat"], m["lon"])


def test_farmland_layer_has_polygons(layers):
    fl = layers["farmland"]
    assert fl["tag"]["status"] == "REPORTED" and len(fl["features"]) == 103
    for f in fl["features"]:
        assert f["geometry"]["type"] == "Polygon" and len(f["geometry"]["coordinates"][0]) >= 4
        assert f["landuse"] in {"farmland", "orchard"} and f["area_ha"] > 0
