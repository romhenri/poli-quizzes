# Run

## Backend (FastAPI + SQLite)

```bash
python3 -m venv .venv
.venv/bin/pip install -r api/requirements-dev.txt
cd api && DB_PATH=data/dev.db ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

## Frontend (Next)

```bash
cd web
npm install
cp .env.example .env.local     # API_URL=http://localhost:8000
npm run dev                    # http://localhost:2700
```

## Tests

```bash
cd api && ../.venv/bin/python -m pytest -q      # validator + endpoints
cd web && npm test                              # validator, same fixtures/
cd web && npm run typecheck
```

Both validators run against `fixtures/`. Change one, run both.

## Deploy

- **Vercel**: root directory `web/`, env `API_URL` pointing at the API.
- **Coolify**: build context `api/`, Dockerfile included.
  Declare a **persistent volume mounted at `/data`** in the Coolify UI.
  Without it every redeploy silently wipes the database.
  There are no backups by design; soft delete is the only undo.
