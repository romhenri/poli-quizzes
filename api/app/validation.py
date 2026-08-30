"""Full validation of a polimind-format quiz.

Deliberately hand-written and duplicated in web/src/lib/validateQuiz.ts.
fixtures/ is what keeps the two honest. Change one, run both suites.
"""

from __future__ import annotations

import re
from typing import Any

# Day one ships `options` only. `bool` and `classify` are real polimind types,
# so they are recognised and rejected explicitly rather than silently accepted.
SUPPORTED_TYPES = {"options"}
KNOWN_TYPES = {"options", "bool", "classify"}
HARDNESS = {"easy", "medium", "hard"}

# `/quizzes/<code>/edit` is a real page, and Next resolves a static segment
# before a dynamic one, so a quiz with this slug would be unreachable.
RESERVED_SLUGS = {"edit"}


class ValidationError(ValueError):
    """Raised with a message meant to be shown to the uploader."""


def _fail(message: str) -> None:
    raise ValidationError(message)


def _require_str(data: dict, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        _fail(f"`{key}` is required and must be a non-empty string")
    return value


def _as_index(value: Any) -> int | None:
    """An integer, or a float that is one.

    JSON has a single number type, so `1.0` and `1` are indistinguishable once
    JavaScript has parsed them. Accepting integral floats is the only behaviour
    the TypeScript validator can actually match.
    """
    if isinstance(value, bool):  # bool is an int subclass in Python
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _check_seq(value: Any) -> None:
    """polimind accepts a number or a numeric string; anything else is a typo."""
    if value is None:
        return
    if _as_index(value) is not None:
        return
    # re.ASCII, because str.isdigit() also accepts Arabic-Indic and superscript
    # digits that int() and the sort comparator would then disagree about.
    if isinstance(value, str) and re.fullmatch(r"-?\d+", value.strip(), re.ASCII):
        return
    _fail("`seq` must be an integer or a numeric string")


def _check_question(question: Any, index: int) -> None:
    where = f"questions[{index}]"
    if not isinstance(question, dict):
        _fail(f"{where} must be an object")

    text = question.get("question")
    if not isinstance(text, str) or not text.strip():
        _fail(f"{where}.question is required and must be a non-empty string")

    options = question.get("options")
    if not isinstance(options, list):
        _fail(f"{where}.options must be an array")
    if len(options) < 2:
        _fail(f"{where}.options needs at least 2 choices")
    if not all(isinstance(o, str) and o.strip() for o in options):
        _fail(f"{where}.options must all be non-empty strings")

    correct = _as_index(question.get("correctAnswer"))
    if correct is None:
        _fail(f"{where}.correctAnswer must be an integer index into options")
    if correct < 0 or correct >= len(options):
        _fail(
            f"{where}.correctAnswer is {correct}, "
            f"outside the range 0..{len(options) - 1}"
        )

    explain = question.get("explain")
    if explain is not None and not isinstance(explain, str):
        _fail(f"{where}.explain must be a string when present")


def validate_quiz(payload: Any, slug: str) -> dict:
    """Return the payload if it is a valid `options` quiz for `slug`, else raise."""
    if isinstance(payload, list):
        # 9 of polimind's own files are undocumented [pt, en] bilingual pairs.
        # Rejected by name rather than by "not an object", so the uploader knows
        # what is actually wrong with the file.
        _fail(
            "this looks like a bilingual [pt, en] quiz pair, which is not "
            "supported yet; upload one language as a single JSON object"
        )
    if not isinstance(payload, dict):
        _fail("the root of a quiz file must be a JSON object")

    # An explicit null means the same as omitting the field, matching the
    # TypeScript side and every other optional field here.
    quiz_type = payload.get("type") if payload.get("type") is not None else "options"
    if not isinstance(quiz_type, str) or quiz_type not in KNOWN_TYPES:
        _fail(
            f"unknown quiz type {quiz_type!r}; "
            f"expected one of {', '.join(sorted(KNOWN_TYPES))}"
        )
    if quiz_type not in SUPPORTED_TYPES:
        _fail(
            f"quiz type {quiz_type!r} is not supported yet; "
            "only `options` quizzes can be uploaded"
        )

    if slug in RESERVED_SLUGS:
        _fail(f"{slug!r} is a reserved name; rename the file")

    quiz_id = _require_str(payload, "id")
    if quiz_id != slug:
        _fail(f"`id` is {quiz_id!r} but the filename is {slug!r}; they must match")

    _require_str(payload, "name")
    _require_str(payload, "description")
    _require_str(payload, "color")
    _require_str(payload, "category")

    tags = payload.get("tags")
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        _fail("`tags` is required and must be an array of strings")

    hardness = payload.get("hardness")
    if hardness is not None and hardness not in HARDNESS:
        _fail(f"`hardness` must be one of {', '.join(sorted(HARDNESS))}")

    for key in ("icon", "lang", "subcategory"):
        value = payload.get(key)
        if value is not None and not isinstance(value, str):
            _fail(f"`{key}` must be a string when present")

    _check_seq(payload.get("seq"))

    questions = payload.get("questions")
    if not isinstance(questions, list):
        _fail("`questions` is required and must be an array")
    if not questions:
        _fail("a quiz needs at least one question")

    for index, question in enumerate(questions):
        _check_question(question, index)

    return payload
