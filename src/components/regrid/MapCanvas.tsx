import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { DrawnShape, LayerDef, LayerId } from "@/lib/regrid/types";
import { INITIAL_VIEW } from "@/lib/regrid/layers";

interface MapCanvasProps {
  token: string;
  layers: LayerDef[];
  enabledLayers: Set<LayerId>;
  shape: DrawnShape | null;
  highlightedConflict: LayerId | null;
  onMapClick: (lngLat: [number, number]) => void;
  onMapReady: (fly: (center: [number, number], zoom?: number) => void) => void;
}

export function MapCanvas({
  token,
  layers,
  enabledLayers,
  shape,
  highlightedConflict,
  onMapClick,
  onMapReady,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Init
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      pitch: 35,
      bearing: -8,
      attributionControl: false,
      antialias: true,
    });
    mapRef.current = map;

    map.on("load", () => {
      setStyleLoaded(true);
      onMapReady((center, zoom) => {
        map.flyTo({
          center,
          zoom: zoom ?? map.getZoom(),
          speed: 1.1,
          curve: 1.6,
          essential: true,
          pitch: 40,
        });
      });
    });

    map.on("click", (e) => {
      onMapClick([e.lngLat.lng, e.lngLat.lat]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setStyleLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Manage layer sources/layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;

    for (const l of layers) {
      const srcId = `src-${l.id}`;
      const fillId = `fill-${l.id}`;
      const lineId = `line-${l.id}`;
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data: l.geojson });
        map.addLayer({
          id: fillId,
          type: "fill",
          source: srcId,
          paint: {
            "fill-color": l.color,
            "fill-opacity": 0.18,
          },
        });
        map.addLayer({
          id: lineId,
          type: "line",
          source: srcId,
          paint: {
            "line-color": l.color,
            "line-width": 1.5,
            "line-opacity": 0.85,
          },
        });
      }
      const visible = enabledLayers.has(l.id) ? "visible" : "none";
      map.setLayoutProperty(fillId, "visibility", visible);
      map.setLayoutProperty(lineId, "visibility", visible);

      const isHighlighted = highlightedConflict === l.id;
      map.setPaintProperty(fillId, "fill-opacity", isHighlighted ? 0.45 : 0.18);
      map.setPaintProperty(lineId, "line-width", isHighlighted ? 3 : 1.5);
    }
  }, [layers, enabledLayers, styleLoaded, highlightedConflict]);

  // Manage drawn shape
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    const srcId = "src-shape";
    const fillId = "fill-shape";
    const lineId = "line-shape";

    if (!shape) {
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(srcId)) map.removeSource(srcId);
      return;
    }

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [shape.geojson],
    };
    const existing = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data);
    } else {
      map.addSource(srcId, { type: "geojson", data });
      map.addLayer({
        id: fillId,
        type: "fill",
        source: srcId,
        paint: {
          "fill-color": "#34d399",
          "fill-opacity": 0.22,
        },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": "#34d399",
          "line-width": 2.2,
          "line-dasharray": [2, 2],
          "line-opacity": 0.95,
        },
      });
    }
  }, [shape, styleLoaded]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      style={{ cursor: "crosshair" }}
    />
  );
}
