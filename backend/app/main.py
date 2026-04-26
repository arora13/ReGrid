import asyncio
import math
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import engine, get_db
from .models import Base, SiteRun
from .schemas import AnalyzeIn, AnalyzeOut, AnalysisResultOut, HealthOut
from .services.arcgis import (
    CALENVIROSCREEN_40_QUERY,
    CGS_ALQUIST_PRIOLO_QUERY,
    USFWS_CRITICAL_HABITAT_FINAL_QUERY,
    arcgis_intersect_count,
)
from .services.geocode import POMONA_CENTER, clamp_to_ca, place_hint_center
from .services.scoring import FederalScreenSnapshot, merge_federal_screen_into_analysis


def acres_to_radius_meters(acres: float) -> float:
    return math.sqrt((max(1.0, acres) * 4046.8564224) / math.pi)


def circle_ring(center: tuple[float, float], radius_m: float, steps: int = 64) -> list[list[float]]:
    lng0, lat0 = center
    ring: list[list[float]] = []
    for i in range(steps):
        ang = (i / steps) * math.pi * 2
        dx = (radius_m * math.cos(ang)) / (6378137 * math.cos(math.radians(lat0)))
        dy = (radius_m * math.sin(ang)) / 6378137
        ring.append([lng0 + math.degrees(dx), lat0 + math.degrees(dy)])
    ring.append(ring[0])
    return ring


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="ReGrid Spatial API", version="0.1.0", lifespan=lifespan)


@app.get("/health", response_model=HealthOut)
async def health(db: AsyncSession = Depends(get_db)) -> HealthOut:
    try:
        await db.execute(text("SELECT 1"))
        db_state = "ok"
    except Exception:
        db_state = "error"
    return HealthOut(ok=db_state == "ok", db=db_state, version=app.version)


@app.post("/api/conflict-check", response_model=AnalyzeOut)
async def conflict_check(payload: AnalyzeIn, db: AsyncSession = Depends(get_db)) -> AnalyzeOut:
    center = place_hint_center(payload.placeQuery) or POMONA_CENTER
    center = clamp_to_ca(*center)
    radius_m = acres_to_radius_meters(payload.acres)
    ring = circle_ring(center, radius_m)

    partial = False
    async def safe_count(url: str) -> int:
        nonlocal partial
        try:
            return await arcgis_intersect_count(url, ring)
        except Exception:
            partial = True
            return 0

    ap, ces4, fws = await asyncio.gather(
        safe_count(CGS_ALQUIST_PRIOLO_QUERY),
        safe_count(CALENVIROSCREEN_40_QUERY),
        safe_count(USFWS_CRITICAL_HABITAT_FINAL_QUERY),
    )
    snap = FederalScreenSnapshot(
        alquist_priolo_feature_count=ap,
        calenviroscreen_tract_count=ces4,
        usfws_critical_habitat_final_count=fws,
        partial=partial,
    )
    result = merge_federal_screen_into_analysis(snap)

    wkt_ring = ", ".join(f"{p[0]} {p[1]}" for p in ring)
    footprint_wkt = f"SRID=4326;POLYGON(({wkt_ring}))"
    run = SiteRun(
        place_label=payload.placeQuery[:120],
        center_lng=center[0],
        center_lat=center[1],
        acres=payload.acres,
        radius_meters=radius_m,
        score=float(result["score"]),
        conflicts=result["conflicts"],
        footprint=footprint_wkt,
    )
    db.add(run)
    await db.commit()

    return AnalyzeOut(
        center=center,
        radiusMeters=radius_m,
        result=AnalysisResultOut(score=int(result["score"]), conflicts=result["conflicts"]),
        source="postgres+postgis+arcgis",
    )

