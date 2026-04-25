import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import type { DrawnShape, LayerDef, LayerId } from "@/lib/regrid/types";
import { INITIAL_VIEW } from "@/lib/regrid/layers";
import { buildShape } from "@/lib/regrid/geo";

interface MapCanvasProps {
  token: string;
  layers: LayerDef[];
  enabledLayers: Set<LayerId>;
  shape: DrawnShape | null;
  ghostShape?: DrawnShape | null;
  shapePulse?: boolean;
  highlightedConflict: LayerId | null;
  crosshair?: boolean;
  onMapClick: (lngLat: [number, number]) => void;
  onMapReady: (fly: (center: [number, number], zoom?: number) => void) => void;
}

export function MapCanvas({
  token,
  layers,
  enabledLayers,
  shape,
  ghostShape = null,
  shapePulse = false,
  highlightedConflict,
  crosshair = true,
  onMapClick,
  onMapReady,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapBooting, setMapBooting] = useState(true);
  const pulseRaf = useRef<number | null>(null);

  // Init — dynamic import keeps Mapbox off the SSR path and avoids broken WebGL when
  // the library touches `window` at module evaluation time.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    let cancelled = false;
    let map: MapboxMap | null = null;
    let ro: ResizeObserver | null = null;
    let loadWatchdog: ReturnType<typeof setTimeout> | undefined;
    let stylePoll: ReturnType<typeof setInterval> | undefined;
    let didCompleteBootstrap = false;

    const safeResize = () => {
      try {
        map?.resize();
      } catch {
        /* tearing down */
      }
    };

    const scheduleResizeBurst = () => {
      requestAnimationFrame(safeResize);
      window.setTimeout(safeResize, 50);
      window.setTimeout(safeResize, 250);
    };

    const onWindowResize = () => safeResize();

    const attachResizeListeners = () => {
      const container = containerRef.current;
      if (container && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => safeResize());
        ro.observe(container);
      }
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("orientationchange", onWindowResize);
    };

    const completeBootstrap = () => {
      if (cancelled || didCompleteBootstrap) return;
      didCompleteBootstrap = true;
      if (loadWatchdog) window.clearTimeout(loadWatchdog);
      if (stylePoll) window.clearInterval(stylePoll);
      setMapError(null);
      setMapBooting(false);
      setStyleLoaded(true);
      scheduleResizeBurst();
      onMapReady((center, zoom) => {
        map?.flyTo({
          center,
          zoom: zoom ?? map.getZoom(),
          speed: 1.1,
          curve: 1.6,
          essential: true,
          pitch: 40,
        });
      });
      attachResizeListeners();
    };

    void (async () => {
      try {
        setMapBooting(true);
        // Wait for layout so the Mapbox container has non-zero size (fixes blank canvas after fast refresh)
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled || !containerRef.current) return;

        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
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

        loadWatchdog = window.setTimeout(() => {
          if (cancelled) return;
          setMapBooting(false);
          setMapError(
            (prev) =>
              prev ??
              "Map did not finish loading. Check your Mapbox token (scopes + URL restrictions) and network.",
          );
        }, 12000);

        map.on("error", (e) => {
          if (loadWatchdog) window.clearTimeout(loadWatchdog);
          if (stylePoll) window.clearInterval(stylePoll);
          setMapBooting(false);
          const msg = e.error?.message ?? String(e.error ?? "Unknown map error");
          setMapError(msg);

          console.error("[ReGrid] Mapbox error:", e.error);
        });

        // `load` can fire before this listener is attached when the style is cached — also poll getStyle().
        map.once("load", () => {
          if (cancelled) return;
          completeBootstrap();
        });

        stylePoll = window.setInterval(() => {
          if (cancelled || didCompleteBootstrap || !map) return;
          try {
            const style = map.getStyle();
            if (style && Array.isArray(style.layers) && style.layers.length > 0) {
              completeBootstrap();
            }
          } catch {
            /* style not ready yet */
          }
        }, 80);

        window.setTimeout(() => {
          if (stylePoll) window.clearInterval(stylePoll);
          stylePoll = undefined;
        }, 8000);

        map.on("click", (e) => {
          onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
        });
      } catch (e) {
        if (!cancelled) {
          if (loadWatchdog) window.clearTimeout(loadWatchdog);
          if (stylePoll) window.clearInterval(stylePoll);
          setMapBooting(false);
          const msg = e instanceof Error ? e.message : "Failed to initialize map";
          setMapError(msg);

          console.error("[ReGrid] Map bootstrap failed:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadWatchdog) window.clearTimeout(loadWatchdog);
      if (stylePoll) window.clearInterval(stylePoll);
      ro?.disconnect();
      ro = null;
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onWindowResize);
      map?.remove();
      map = null;
      mapRef.current = null;
      setStyleLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;

    const stopPulse = () => {
      if (pulseRaf.current) cancelAnimationFrame(pulseRaf.current);
      pulseRaf.current = null;
    };

    const lineId = "line-shape";
    if (!map.getLayer(lineId)) return;

    if (!shapePulse) {
      stopPulse();
      map.setPaintProperty(lineId, "line-width", 2.2);
      map.setPaintProperty(lineId, "line-opacity", 0.95);
      return;
    }

    const start = performance.now();
    const tick = (t: number) => {
      const p = (t - start) / 2400;
      const wave = 0.5 + 0.5 * Math.sin(p * Math.PI * 2);
      map.setPaintProperty(lineId, "line-width", 2.0 + wave * 1.6);
      map.setPaintProperty(lineId, "line-opacity", 0.75 + wave * 0.2);
      pulseRaf.current = requestAnimationFrame(tick);
    };
    stopPulse();
    pulseRaf.current = requestAnimationFrame(tick);
    return () => stopPulse();
  }, [shapePulse, styleLoaded, shape]);

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
            "fill-opacity": 0.12,
          },
        });
        map.addLayer({
          id: lineId,
          type: "line",
          source: srcId,
          paint: {
            "line-color": l.color,
            "line-width": 1.25,
            "line-opacity": 0.75,
          },
        });
      }
      const visible = enabledLayers.has(l.id) ? "visible" : "none";
      map.setLayoutProperty(fillId, "visibility", visible);
      map.setLayoutProperty(lineId, "visibility", visible);

      const isHighlighted = highlightedConflict === l.id;
      map.setPaintProperty(fillId, "fill-opacity", isHighlighted ? 0.34 : 0.12);
      map.setPaintProperty(lineId, "line-width", isHighlighted ? 2.4 : 1.25);
    }
  }, [layers, enabledLayers, styleLoaded, highlightedConflict]);

  // Manage drawn shape (+ buffer ring)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    const srcId = "src-shape";
    const fillId = "fill-shape";
    const lineId = "line-shape";
    const bufSrc = "src-shape-buffer";
    const bufLine = "line-shape-buffer";

    if (!shape) {
      if (map.getLayer(bufLine)) map.removeLayer(bufLine);
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(bufSrc)) map.removeSource(bufSrc);
      if (map.getSource(srcId)) map.removeSource(srcId);
      return;
    }

    const buffer = buildShape(
      shape.kind,
      shape.center,
      Math.round(shape.radiusMeters * 1.22),
      `${shape.id}-buffer`,
    );
    const existing = map.getSource(srcId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData({ type: "FeatureCollection", features: [shape.geojson] });
    } else {
      map.addSource(srcId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [shape.geojson] },
      });
      map.addLayer({
        id: fillId,
        type: "fill",
        source: srcId,
        paint: {
          "fill-color": "#34d399",
          "fill-opacity": 0.16,
        },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": "#6ee7b7",
          "line-width": 2.2,
          "line-dasharray": [2, 2],
          "line-opacity": 0.95,
        },
      });
    }

    const bufFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [buffer.geojson],
    };
    const bufExisting = map.getSource(bufSrc) as GeoJSONSource | undefined;
    if (bufExisting) {
      bufExisting.setData(bufFc);
    } else {
      map.addSource(bufSrc, { type: "geojson", data: bufFc });
      map.addLayer({
        id: bufLine,
        type: "line",
        source: bufSrc,
        paint: {
          "line-color": "#38bdf8",
          "line-width": 1.1,
          "line-dasharray": [1, 2],
          "line-opacity": 0.35,
        },
      });
    }
  }, [shape, styleLoaded]);

  // Ghost "before" footprint (comparison)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    const srcId = "src-ghost";
    const fillId = "fill-ghost";
    const lineId = "line-ghost";

    if (!ghostShape) {
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(srcId)) map.removeSource(srcId);
      return;
    }

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [ghostShape.geojson],
    };
    const existing = map.getSource(srcId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data);
    } else {
      map.addSource(srcId, { type: "geojson", data });
      map.addLayer({
        id: fillId,
        type: "fill",
        source: srcId,
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": 0.08,
        },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": "#38bdf8",
          "line-width": 1.6,
          "line-dasharray": [1, 2],
          "line-opacity": 0.45,
        },
      });
    }
  }, [ghostShape, styleLoaded]);

  return (
    <div className="regrid-map-host absolute inset-0 z-0 h-full min-h-full w-full min-w-full">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        style={{ cursor: crosshair ? "crosshair" : "grab" }}
      />
      {mapBooting && !mapError ? (
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center bg-background/55">
          <p className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[11px] font-medium text-muted-foreground">
            Initializing map…
          </p>
        </div>
      ) : null}
      {mapError ? (
        <div className="pointer-events-auto absolute left-1/2 top-4 z-[5] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-amber-400/30 bg-black/70 px-4 py-3 text-center text-[12px] text-amber-100 shadow-lg backdrop-blur-md">
          <p className="font-semibold text-amber-50">Map could not load correctly</p>
          <p className="mt-1 text-[11px] leading-snug text-amber-100/90">{mapError}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Confirm your token has <span className="text-foreground/80">styles:read</span> and{" "}
            <span className="text-foreground/80">fonts:read</span>, and that localhost is allowed if
            you use URL restrictions.
          </p>
        </div>
      ) : null}
    </div>
  );
}
