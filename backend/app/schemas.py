from pydantic import BaseModel, Field


class ConflictOut(BaseModel):
    id: str
    label: str
    severity: str
    layerId: str
    detail: str


class AnalysisResultOut(BaseModel):
    score: int
    conflicts: list[ConflictOut]


class AnalyzeIn(BaseModel):
    placeQuery: str = Field(default="Pomona, CA", max_length=200)
    acres: float = Field(default=10, ge=1, le=10000)
    projectId: str | None = None


class AnalyzeOut(BaseModel):
    center: tuple[float, float]
    radiusMeters: float
    result: AnalysisResultOut
    source: str


class HealthOut(BaseModel):
    ok: bool
    db: str
    version: str

