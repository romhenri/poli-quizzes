"""Both validators run against fixtures/. See fixtures/README.md."""

import json
from pathlib import Path

import pytest

from app.validation import ValidationError, validate_quiz

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


def _cases(kind: str):
    return sorted((FIXTURES / kind).glob("*.json"))


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8")), path.stem


@pytest.mark.parametrize("path", _cases("valid"), ids=lambda p: p.stem)
def test_valid_fixtures_pass(path: Path):
    payload, slug = _load(path)
    validate_quiz(payload, slug)


@pytest.mark.parametrize("path", _cases("invalid"), ids=lambda p: p.stem)
def test_invalid_fixtures_fail(path: Path):
    payload, slug = _load(path)
    with pytest.raises(ValidationError):
        validate_quiz(payload, slug)


def test_fixture_dirs_are_not_empty():
    # Guards against a glob typo silently turning this suite into a no-op.
    assert _cases("valid") and _cases("invalid")
