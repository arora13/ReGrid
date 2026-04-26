POMONA_CENTER = (-117.7503, 34.0551)
CALIFORNIA_SW = (-124.48, 32.53)
CALIFORNIA_NE = (-114.13, 42.01)


def clamp_to_ca(lng: float, lat: float) -> tuple[float, float]:
    return (
        min(max(lng, CALIFORNIA_SW[0]), CALIFORNIA_NE[0]),
        min(max(lat, CALIFORNIA_SW[1]), CALIFORNIA_NE[1]),
    )


def place_hint_center(text: str) -> tuple[float, float] | None:
    t = text.lower()
    if "pomona" in t:
        return POMONA_CENTER
    if "riverside" in t:
        return (-117.3962, 33.9533)
    if "san bernardino" in t:
        return (-117.2898, 34.1083)
    if "los angeles" in t:
        return (-118.2437, 34.0522)
    return None

