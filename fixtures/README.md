# Shared validation fixtures

Both validators (Python in `api/`, TypeScript in `web/`) run against these.
They exist because the two validators are maintained by hand, so drift shows up
here as a failing test instead of as a user-facing mystery.

- `valid/<slug>.json`   must pass validation when uploaded as `<slug>.json`
- `invalid/<slug>.json` must FAIL validation when uploaded as `<slug>.json`

The filename stem is the slug. Every fixture's `id` must equal that stem,
except `invalid/id-mismatch.json`, which fails for exactly that reason.

Add a case to one directory and both suites pick it up with no code change.
