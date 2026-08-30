"""End-to-end over the real endpoints, against a throwaway SQLite file."""

import json

import pytest
from fastapi.testclient import TestClient

MINIMAL = {
    "id": "algebra",
    "name": "Algebra",
    "description": "Basics.",
    "color": "blue",
    "category": "math",
    "tags": ["math"],
    "questions": [{"question": "2+2?", "options": ["3", "4"], "correctAnswer": 1}],
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    from app import config, db, main

    config.DB_PATH = tmp_path / "test.db"
    db.init()
    with TestClient(main.app) as c:
        yield c


def upload(client, code, key, slug, payload, **kw):
    return client.post(
        f"/lists/{code}/quizzes",
        files=[(("files"), (f"{slug}.json", json.dumps(payload), "application/json"))],
        headers={"X-Edit-Key": key},
        **kw,
    )


@pytest.fixture()
def a_list(client):
    r = client.post("/lists", json={"name": "Prova de Cálculo", "description": "Turma B"})
    assert r.status_code == 201
    body = r.json()
    return body["code"], body["edit_key"]


def test_code_is_seven_chars_of_the_safe_alphabet(a_list):
    from app.codes import ALPHABET

    code, _ = a_list
    assert len(code) == 7
    assert set(code) <= set(ALPHABET)
    # Crockford drops the confusable LETTERS, keeping the digits 0 and 1.
    assert not (set(code) & set("ilo"))


def test_publish_then_read_back(client, a_list):
    code, key = a_list
    assert upload(client, code, key, "algebra", MINIMAL).status_code == 201

    listing = client.get(f"/lists/{code}").json()
    assert listing["name"] == "Prova de Cálculo"
    assert [q["slug"] for q in listing["quizzes"]] == ["algebra"]
    assert listing["quizzes"][0]["questions"] == 1

    assert client.get(f"/lists/{code}/quizzes/algebra").json() == MINIMAL


def test_reupload_replaces_in_place(client, a_list):
    code, key = a_list
    upload(client, code, key, "algebra", MINIMAL)

    fixed = {**MINIMAL, "name": "Álgebra (corrigido)"}
    assert upload(client, code, key, "algebra", fixed).status_code == 201

    listing = client.get(f"/lists/{code}").json()
    assert len(listing["quizzes"]) == 1
    assert listing["quizzes"][0]["name"] == "Álgebra (corrigido)"


def test_reupload_after_delete_does_not_hit_the_unique_index(client, a_list):
    """The partial index is the whole reason soft delete is survivable."""
    code, key = a_list
    upload(client, code, key, "algebra", MINIMAL)
    assert client.request(
        "DELETE", f"/lists/{code}/quizzes/algebra", headers={"X-Edit-Key": key}
    ).status_code == 204
    assert client.get(f"/lists/{code}/quizzes/algebra").status_code == 404

    assert upload(client, code, key, "algebra", MINIMAL).status_code == 201
    assert len(client.get(f"/lists/{code}").json()["quizzes"]) == 1


def test_id_must_match_filename(client, a_list):
    code, key = a_list
    r = upload(client, code, key, "geometry", MINIMAL)  # id is still "algebra"
    assert r.status_code == 422
    assert "must match" in r.json()["detail"]


def test_unsupported_type_is_rejected_with_a_clear_message(client, a_list):
    code, key = a_list
    r = upload(client, code, key, "tf", {**MINIMAL, "id": "tf", "type": "bool"})
    assert r.status_code == 422
    assert "not supported yet" in r.json()["detail"]


def test_wrong_and_missing_edit_keys(client, a_list):
    code, _ = a_list
    assert upload(client, code, "wrong-key", "algebra", MINIMAL).status_code == 403
    r = client.post(
        f"/lists/{code}/quizzes",
        files=[("files", ("algebra.json", json.dumps(MINIMAL), "application/json"))],
    )
    assert r.status_code == 401


def test_deleted_list_is_404_not_410(client, a_list):
    code, key = a_list
    upload(client, code, key, "algebra", MINIMAL)
    assert client.request(
        "DELETE", f"/lists/{code}", headers={"X-Edit-Key": key}
    ).status_code == 204

    assert client.get(f"/lists/{code}").status_code == 404
    assert client.get(f"/lists/{code}/quizzes/algebra").status_code == 404
    # Indistinguishable from a code that never existed.
    assert client.get("/lists/zzzzzzz").status_code == 404


def test_oversized_file_is_rejected(client, a_list, monkeypatch):
    from app import config

    monkeypatch.setattr(config, "MAX_FILE_BYTES", 50)
    code, key = a_list
    assert upload(client, code, key, "algebra", MINIMAL).status_code == 413


def test_quizzes_per_list_cap(client, a_list, monkeypatch):
    from app import config

    monkeypatch.setattr(config, "MAX_QUIZZES_PER_LIST", 1)
    code, key = a_list
    assert upload(client, code, key, "algebra", MINIMAL).status_code == 201
    r = upload(client, code, key, "geometry", {**MINIMAL, "id": "geometry"})
    assert r.status_code == 400
    assert "at most 1" in r.json()["detail"]


def test_a_bad_file_rejects_the_whole_upload(client, a_list):
    """All-or-nothing: no half-updated list."""
    code, key = a_list
    r = client.post(
        f"/lists/{code}/quizzes",
        files=[
            ("files", ("algebra.json", json.dumps(MINIMAL), "application/json")),
            ("files", ("broken.json", "{not json", "application/json")),
        ],
        headers={"X-Edit-Key": key},
    )
    assert r.status_code == 400
    assert client.get(f"/lists/{code}").json()["quizzes"] == []
