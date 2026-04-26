import json
from urllib.parse import urlencode


CGS_ALQUIST_PRIOLO_QUERY = (
    "https://services2.arcgis.com/zr3KAIbsRSUyARHG/arcgis/rest/services/"
    "CGS_Alquist_Priolo_Fault_Zones/FeatureServer/0/query"
)
CALENVIROSCREEN_40_QUERY = (
    "https://services1.arcgis.com/PCHfdHz4GlDNAhBb/arcgis/rest/services/"
    "CalEnviroScreen_4_0_Results_/FeatureServer/0/query"
)
USFWS_CRITICAL_HABITAT_FINAL_QUERY = (
    "https://services.arcgis.com/QVENGdaPbd4LUkLV/ArcGIS/rest/services/"
    "USFWS_Critical_Habitat/FeatureServer/0/query"
)


async def arcgis_intersect_count(query_url: str, ring: list[list[float]]) -> int:
    import httpx

    geometry = json.dumps({"rings": [ring], "spatialReference": {"wkid": 4326}})
    payload = {
        "f": "json",
        "where": "1=1",
        "geometry": geometry,
        "geometryType": "esriGeometryPolygon",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "returnCountOnly": "true",
    }
    body = urlencode(payload)
    async with httpx.AsyncClient(timeout=14.0) as client:
        res = await client.post(
            query_url,
            content=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if not res.is_success:
        raise RuntimeError(f"ArcGIS HTTP {res.status_code}")
    data = res.json()
    if isinstance(data.get("count"), int):
        return int(data["count"])
    raise RuntimeError("Invalid ArcGIS count response")

