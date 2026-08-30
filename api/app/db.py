import sqlite3
from contextlib import contextmanager

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS lists (
  code        TEXT PRIMARY KEY,
  edit_key    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS quizzes (
  id         INTEGER PRIMARY KEY,
  list_code  TEXT NOT NULL REFERENCES lists(code),
  slug       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- Partial, so re-uploading a slug that was soft-deleted does not collide
-- with the tombstone row.
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_slug
  ON quizzes(list_code, slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS quizzes_by_list ON quizzes(list_code);
"""


def connect() -> sqlite3.Connection:
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute(f"PRAGMA max_page_count={config.MAX_DB_PAGES}")
    return conn


@contextmanager
def cursor():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init() -> None:
    with cursor() as conn:
        conn.executescript(SCHEMA)
