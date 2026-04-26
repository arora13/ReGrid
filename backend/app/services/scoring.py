from dataclasses import dataclass


@dataclass
class FederalScreenSnapshot:
    alquist_priolo_feature_count: int
    calenviroscreen_tract_count: int
    usfws_critical_habitat_final_count: int
    partial: bool = False


def merge_federal_screen_into_analysis(snap: FederalScreenSnapshot) -> dict:
    conflicts: list[dict] = []
    score = 0

    def push(conflict: dict, bump: int) -> None:
        nonlocal score
        conflicts.append(conflict)
        score = min(100, score + bump)

    if snap.alquist_priolo_feature_count > 0:
        push(
            {
                "id": "federal-cgs-ap",
                "label": "CGS Alquist–Priolo earthquake fault zone",
                "severity": "high",
                "layerId": "ext:federal:cgs-ap",
                "detail": f"Intersects {snap.alquist_priolo_feature_count} mapped fault-zone feature(s).",
            },
            26,
        )
    if snap.usfws_critical_habitat_final_count > 0:
        push(
            {
                "id": "federal-fws-ch",
                "label": "USFWS final critical habitat",
                "severity": "high",
                "layerId": "ext:federal:fws-ch",
                "detail": f"Intersects {snap.usfws_critical_habitat_final_count} critical habitat polygon(s).",
            },
            22,
        )
    if snap.calenviroscreen_tract_count > 0:
        push(
            {
                "id": "federal-ces4",
                "label": "CalEnviroScreen 4.0 community context",
                "severity": "medium",
                "layerId": "ext:federal:ces4",
                "detail": f"Overlaps {snap.calenviroscreen_tract_count} CES4 tract(s).",
            },
            12,
        )
    if snap.partial:
        push(
            {
                "id": "federal-screen-partial",
                "label": "Federal screening incomplete",
                "severity": "low",
                "layerId": "ext:federal:screen-meta",
                "detail": "One or more ArcGIS checks failed.",
            },
            4,
        )
    return {"score": score, "conflicts": conflicts}

