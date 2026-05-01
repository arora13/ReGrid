# ReGrid

**Spatial intelligence for the clean energy transition**

ReGrid is an interactive siting intelligence platform for clean energy developers. Users can place a candidate project footprint (circle, square, hexagon), run spatial conflict analysis against federal-style layers, and get an optimization recommendation that relocates the site to a lower-risk area.

ReGrid also includes a **hackathon-grade Spatial Copilot**: a bottom command bar that accepts a natural-language mission, streams a terminal-style trace while it runs a **bounded “tool loop”** (evaluate → explain → adjust → grid search), then **flies the map** and drops the footprint automatically.

The product experience is a full-screen dark map interface with glassmorphism controls, real-time layer toggles, and animated risk analytics designed to feel enterprise-grade and demo-ready.

## Demo Flow

1. **Explore** — Navigate a full-screen dark map and toggle infrastructure and risk layers.
2. **Propose** — Use the top-left project panel to choose a footprint tool, then click the map.
3. **Analyze** — Run conflict scoring to compute a 0-100 siting risk score.
4. **Optimize** — Trigger AI Auto-Relocate to search nearby alternatives and animate to a better site.
5. **Copilot** — Type a mission in the bottom command bar, watch the streamed trace, and let the agent finish with a fly-to reveal.

## How Project Shapes Work

Each project footprint is represented as GeoJSON and rendered with a semi-transparent fill and dashed border on the map. The app supports:

- **Circle** — regular polygon approximation
- **Square** — 4-sided polygon with rotation to align edges
- **Hexagon** — 6-sided polygon

Generalized regular-polygon generation:

```text
# illustrative pseudocode (not executed)
for i in 0..sides:
    angle = (i / sides) * 2pi + rotation
    dLat  = (radiusKm / 6371) * cos(angle)
    dLng  = (radiusKm / 6371) * sin(angle) / cos(lat)
    point = [lng + dLng, lat + dLat]
```

## Conflict and Optimization Logic

Current implementation simulates conflict analysis in-app:

- Layer overlap/proximity weighting per active dataset
- Risk scoring from 0-100 with severity bands
- Deterministic baseline scoring (stable across reruns for the same site + active layers)
- Conflict list generation for the right-side Risk Panel
- AI Auto-Relocate simulation that searches nearby coordinates and returns a better score

Target production engine (FastAPI + Shapely):

- Polygon intersection checks (`intersects`)
- Buffered proximity checks (`buffer`)
- Area/distance weighted risk model
- Relocation grid search and ranked recommendations

## APIs and Integrations Needed

To graduate from demo simulation to production-grade spatial intelligence, these APIs/services are needed:

### 1) Map and Geocoding

- **Mapbox Access Token** (`VITE_MAPBOX_TOKEN`)
- Optional: Mapbox Geocoding API (search, reverse geocode, place labels)

### 2) Auth and User Data

- **Convex Deployment URL** (`VITE_CONVEX_URL`)
- Convex auth provider configuration (email/password or OAuth)
- Convex tables/functions for saved projects, analysis history, and user settings

### 3) Spatial Analysis Service

- **FastAPI service URL** (example: `VITE_SPATIAL_API_URL`)
- Endpoints:
  - `GET /health` - service and dataset readiness
  - `GET /api/layers` - GeoJSON layers for rendering
  - `POST /api/conflict-check` - risk score + conflicts + recommendation
  - `POST /api/optimize` (optional split endpoint) - best-site search

### 4) Federal/Infrastructure Data Feeds

- BOEM lease polygons
- NOAA / marine protection boundaries
- MarineCadastre shipping corridors
- HIFLD/EIA infrastructure layers
- EPA EJScreen polygons

### 5) Optional Production Enhancements

- Caching layer (Redis/Valkey) — optional for repeated spatial queries
- Queue/workers for heavy geoprocessing jobs
- Object storage for versioned GeoJSON snapshots
- Observability (Sentry + logs + traces)

## Environment Variables

_Copy `.env.example` to `.env.local` for local secrets._

```bash
# Required now
VITE_MAPBOX_TOKEN=...

# Required when Convex is connected
VITE_CONVEX_URL=...

# Recommended when external spatial API is enabled
VITE_SPATIAL_API_URL=http://localhost:8000
```

## Local Development

```bash
# from repo root
npm install
npm run dev
```

## Backend + PostGIS

The repo now includes a backend scaffold at `backend/` with FastAPI + PostGIS.

Quick start:

```bash
docker compose -f docker-compose.backend.yml up --build
```

Then try:

- `GET http://localhost:8000/health`
- `POST http://localhost:8000/api/conflict-check` (see `backend/README.md`)

Run the dev server and open the app. If `VITE_MAPBOX_TOKEN` is set in `.env.local`, the map loads immediately; otherwise paste a token in the gate, then:

- Toggle layers in the left operations rail (collapsible section)
- Place a shape on map click
- Analyze risk
- Auto-relocate for optimized siting
- Run the Spatial Copilot from the bottom command bar

## BroncoHacks 2026

This project was made for **BroncoHacks 2026** — weekend sprint energy.
