# ReGrid

**Spatial Intelligence for the Clean Energy Transition**

ReGrid is an interactive siting intelligence platform for clean energy developers. Users can place a candidate project footprint (circle, square, hexagon), run spatial conflict analysis against federal-style layers, and get an optimization recommendation that relocates the site to a lower-risk area.

ReGrid also includes a **hackathon-grade Spatial Copilot**: a bottom command bar that accepts a natural-language mission, streams a terminal-style trace while it runs a **bounded “tool loop”** (evaluate → explain → adjust → grid search), then **flies the map** and drops the footprint automatically.

The product experience is a full-screen dark map interface with glassmorphism controls, real-time layer toggles, and animated risk analytics designed to feel enterprise-grade and demo-ready.

## Demo Flow

1. **Explore** - Navigate a full-screen dark map and toggle infrastructure and risk layers.
2. **Propose** - Use the top-left project panel to choose a footprint tool, then click the map.
3. **Analyze** - Run conflict scoring to compute a 0-100 siting risk score.
4. **Optimize** - Trigger AI Auto-Relocate to search nearby alternatives and animate to a better site.
5. **Copilot** - Type a mission in the bottom command bar, watch the streamed trace, and let the agent finish with a fly-to reveal.

## Product Architecture

```mermaid
flowchart LR
    U[User] --> FE[Frontend App\nTanStack Start + React + Tailwind + Mapbox GL]
    U --> CP[Spatial Copilot\nbounded demo loop + trace]
    FE --> CE[Conflict Engine\nClient-side simulation]
    FE --> MAP[Mapbox APIs]
    CP --> CE
    CE --> LAYERS[Mock Federal GeoJSON Layers]
    CE --> SCORE[Risk Score + Conflict List]
    SCORE --> UI[Risk Panel + Recommendations]
```

## System Design (Target Production Stack)

```mermaid
flowchart TB
    FE[Frontend\nNext.js or TanStack Start + React + Mapbox]
    CVX[Convex\nAuth + User Projects + Sessions]
    API[Spatial API\nFastAPI + Shapely]
    DATA[Datasets\nBOEM / NOAA / MarineCadastre / HIFLD / EPA]

    FE --> CVX
    FE --> API
    API --> DATA
    API --> FE
```

## How Project Shapes Work

Each project footprint is represented as GeoJSON and rendered with a semi-transparent fill and dashed border on the map. The app supports:

- **Circle** - regular polygon approximation
- **Square** - 4-sided polygon with rotation to align edges
- **Hexagon** - 6-sided polygon

Generalized regular-polygon generation:

```text
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

To move from demo simulation to production-grade spatial intelligence, these APIs/services are needed:

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
- Caching layer (Redis/Valkey) for repeated spatial queries
- Queue/workers for heavy geoprocessing jobs
- Object storage for versioned GeoJSON snapshots
- Observability (Sentry + logs + traces)

## Environment Variables

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
npm install
npm run dev
```

Open the app. If `VITE_MAPBOX_TOKEN` is set in `.env.local`, the map loads immediately; otherwise paste a token in the gate, then:
- Toggle layers in the bottom-left dock
- Place a shape on map click
- Analyze risk
- Auto-relocate for optimized siting
- Run the Spatial Copilot from the bottom command bar

## Current Status

- UI and interaction model are implemented and polished.
- Spatial Copilot (demo) is implemented client-side with streamed logs + fly-to choreography.
- Conflict analysis is currently simulated client-side for demo speed.
- Convex/FastAPI/data pipeline integration is the next milestone.

