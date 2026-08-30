# poli-quizzes
> Github desc: Lightweight quiz-sharing tool for poli-format JSON, built for quick unlisted distribution over accounts.

Upload quiz JSON in [poli-format](../polimind), get an unlisted link, share it. There's
no login: the link's random code plus a separate edit key are the only credentials, and
a soft-delete-only database means there's no undo and no accounts to manage.

```
web/       Next 15 frontend, deploys to Vercel (root dir: web/)
api/       FastAPI + SQLite backend, deploys to Coolify (build context: api/)
fixtures/  Shared valid/invalid quiz JSON, exercised by BOTH test suites
```

## Installation

See [RUN.md](RUN.md) for setup and run commands.

## Usage example

Create a list, then upload quizzes to it:

```sh
curl -X POST http://localhost:8000/lists \
  -H "Content-Type: application/json" \
  -d '{"name": "Calc 1", "description": "Derivatives and limits"}'
# {"code": "a1b2c3", "edit_key": "k9x2..."}

curl -X POST http://localhost:8000/lists/a1b2c3/quizzes \
  -H "X-Edit-Key: k9x2..." \
  -F "files=@derivatives.json"
```

The list is now live at `/lists/a1b2c3` in the frontend. Anyone with the code can view
it; only the edit key can add or delete quizzes.

## Development setup

```sh
cd api && ../.venv/bin/python -m pytest -q   # validator + endpoints
cd web && npm test                           # validator, same fixtures/
```

Both validators run against `fixtures/`. Change one, run both — see
[fixtures/README.md](fixtures/README.md).
