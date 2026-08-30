import json
import secrets
import sqlite3
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from . import codes, config, db
from .validation import ValidationError, validate_quiz


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init()
    yield


app = FastAPI(title="poli-quizzes", lifespan=lifespan)


class ListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class ListCreated(BaseModel):
    code: str
    edit_key: str


def _card(slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    """The subset the grid renders. Mirrors polimind's toQuizListing.

    No fallbacks for required fields: validate_quiz already guarantees id, name,
    description, color, category, tags and questions are present.
    """
    return {
        "id": payload["id"],
        "slug": slug,
        "name": payload["name"],
        "description": payload["description"],
        "icon": payload.get("icon") or "",
        "color": payload["color"],
        "category": payload["category"],
        "subcategory": payload.get("subcategory"),
        "tags": payload["tags"],
        "hardness": payload.get("hardness") or "easy",
        "type": payload.get("type") or "options",
        "seq": payload.get("seq"),
        "questions": len(payload["questions"]),
    }


def _get_live_list(conn: sqlite3.Connection, code: str) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM lists WHERE code = ? AND deleted_at IS NULL", (code,)
    ).fetchone()
    if row is None:
        # Soft-deleted and never-existed are indistinguishable on purpose:
        # a 410 would confirm to a stranger that the code was once valid.
        raise HTTPException(status_code=404, detail="List not found")
    return row


def require_edit_key(x_edit_key: str = Header(default="")) -> str:
    if not x_edit_key:
        raise HTTPException(status_code=401, detail="Missing edit key")
    return x_edit_key


def _check_edit_key(row: sqlite3.Row, provided: str) -> None:
    if not secrets.compare_digest(row["edit_key"], provided):
        raise HTTPException(status_code=403, detail="Wrong edit key")


@app.post("/lists", response_model=ListCreated, status_code=201)
def create_list(body: ListCreate) -> ListCreated:
    edit_key = codes.new_id(config.EDIT_KEY_LENGTH)
    with db.cursor() as conn:
        for _ in range(10):
            code = codes.new_id(config.CODE_LENGTH)
            try:
                conn.execute(
                    "INSERT INTO lists (code, edit_key, name, description)"
                    " VALUES (?, ?, ?, ?)",
                    (code, edit_key, body.name.strip(), (body.description or "").strip()),
                )
            except sqlite3.IntegrityError:
                continue  # code collision, try another
            return ListCreated(code=code, edit_key=edit_key)
    raise HTTPException(status_code=500, detail="Could not allocate a code")


@app.get("/lists/{code}")
def get_list(code: str) -> dict[str, Any]:
    with db.cursor() as conn:
        row = _get_live_list(conn, code)
        quizzes = conn.execute(
            "SELECT slug, payload FROM quizzes"
            " WHERE list_code = ? AND deleted_at IS NULL ORDER BY id",
            (code,),
        ).fetchall()
    return {
        "code": row["code"],
        "name": row["name"],
        "description": row["description"],
        "created_at": row["created_at"],
        "quizzes": [_card(q["slug"], json.loads(q["payload"])) for q in quizzes],
    }


@app.get("/lists/{code}/quizzes/{slug}")
def get_quiz(code: str, slug: str) -> Any:
    with db.cursor() as conn:
        _get_live_list(conn, code)
        row = conn.execute(
            "SELECT payload FROM quizzes"
            " WHERE list_code = ? AND slug = ? AND deleted_at IS NULL",
            (code, slug),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return json.loads(row["payload"])


@app.post("/lists/{code}/quizzes", status_code=201)
async def upload_quizzes(
    code: str,
    files: list[UploadFile],
    edit_key: str = Depends(require_edit_key),
) -> dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    # Read and validate everything before touching the database, so a bad file
    # in the middle cannot leave a list half-updated.
    parsed: list[tuple[str, str]] = []
    for upload in files:
        name = upload.filename or ""
        if not name.lower().endswith(".json"):
            raise HTTPException(status_code=400, detail=f"{name}: must be a .json file")
        raw = await upload.read()
        if len(raw) > config.MAX_FILE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"{name}: larger than {config.MAX_FILE_BYTES // 1024} KB",
            )
        slug = name[: -len(".json")]
        if not slug:
            raise HTTPException(status_code=400, detail="A file needs a name before .json")
        try:
            payload = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError) as err:
            raise HTTPException(status_code=400, detail=f"{name}: invalid JSON ({err})")
        try:
            validate_quiz(payload, slug)
        except ValidationError as err:
            raise HTTPException(status_code=422, detail=f"{name}: {err}")
        parsed.append((slug, json.dumps(payload, ensure_ascii=False)))

    with db.cursor() as conn:
        row = _get_live_list(conn, code)
        _check_edit_key(row, edit_key)

        existing = {
            r["slug"]
            for r in conn.execute(
                "SELECT slug FROM quizzes"
                " WHERE list_code = ? AND deleted_at IS NULL",
                (code,),
            )
        }
        after = existing | {slug for slug, _ in parsed}
        if len(after) > config.MAX_QUIZZES_PER_LIST:
            raise HTTPException(
                status_code=400,
                detail=f"A list holds at most {config.MAX_QUIZZES_PER_LIST} quizzes",
            )

        for slug, payload_json in parsed:
            # Upsert: re-uploading a corrected file replaces it in place.
            updated = conn.execute(
                "UPDATE quizzes SET payload = ?, updated_at = datetime('now')"
                " WHERE list_code = ? AND slug = ? AND deleted_at IS NULL",
                (payload_json, code, slug),
            ).rowcount
            if updated == 0:
                conn.execute(
                    "INSERT INTO quizzes (list_code, slug, payload)"
                    " VALUES (?, ?, ?)",
                    (code, slug, payload_json),
                )

    return {"code": code, "slugs": [slug for slug, _ in parsed]}


@app.delete("/lists/{code}/quizzes/{slug}", status_code=204)
def delete_quiz(code: str, slug: str, edit_key: str = Depends(require_edit_key)) -> None:
    with db.cursor() as conn:
        row = _get_live_list(conn, code)
        _check_edit_key(row, edit_key)
        deleted = conn.execute(
            "UPDATE quizzes SET deleted_at = datetime('now')"
            " WHERE list_code = ? AND slug = ? AND deleted_at IS NULL",
            (code, slug),
        ).rowcount
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")


@app.delete("/lists/{code}", status_code=204)
def delete_list(code: str, edit_key: str = Depends(require_edit_key)) -> None:
    with db.cursor() as conn:
        row = _get_live_list(conn, code)
        _check_edit_key(row, edit_key)
        conn.execute(
            "UPDATE lists SET deleted_at = datetime('now') WHERE code = ?", (code,)
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
