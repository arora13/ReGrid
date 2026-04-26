# ReGrid Backend

FastAPI + PostgreSQL/PostGIS backend for production-style siting checks.

## What this provides

- `GET /health` -> API and DB readiness
- `POST /api/conflict-check` -> analyzes one footprint (10-acre default circle near Pomona) against:
  - CGS Alquist-Priolo fault zones
  - USFWS critical habitat (final)
  - CalEnviroScreen 4.0 tracts
- Persists each run in PostGIS (`site_runs` with polygon geometry + JSON conflicts).

## Run with Docker

```bash
docker compose -f ../docker-compose.backend.yml up --build
```

Then open:
- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Run locally without Docker

```bash
cd backend
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You still need a local Postgres with PostGIS extension enabled.
