import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';
import ZoneCard from './ZoneCard';
import type { FieldZone, FieldPolygon } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

// Farm AOI — Imperial Valley, Holtville
const FARM_BOUNDS = { west: -115.39, south: 32.84, east: -115.33, north: 32.89 };

interface Props {
  zones: FieldZone[];
  polygons: FieldPolygon[];
  center: [number, number];
  zoom: number;
  zonesLoading?: boolean;
  selectedZone?: boolean;
  onScanLeaf?: () => void;
  region?: string;
}

// GEE screenshot colors — exact match
const GEE_FILL: Record<string, string> = {
  severe:   '#FF0000',
  moderate: '#FFFF00',
  low:      '#00CC00',
};

export default function FieldMapView({
  zones,
  polygons,
  center,
  zoom,
  zonesLoading = false,
  selectedZone,
  onScanLeaf,
  region,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initCenter = useRef(center);
  const initZoom = useRef(zoom);
  const lastPolygonIdsRef = useRef<string>('');
  const [active, setActive] = useState<FieldZone | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [polygonsVisible, setPolygonsVisible] = useState(true);

  // Stats computed from polygons
  const stats = useMemo(() => {
    const low = polygons.filter(p => p.severity === 'severe').length;
    const med = polygons.filter(p => p.severity === 'moderate').length;
    const high = polygons.filter(p => p.severity === 'low').length;
    return { total: polygons.length, low, med, high };
  }, [polygons]);

  // ── Map initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: initCenter.current,
      zoom: initZoom.current,
      pitch: 0,
      bearing: 0,
      interactive: true,
      attributionControl: false,
    });

    mapRef.current = map;
    map.on('load', () => setMapLoaded(true));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Static layers: farm boundary box + NDVI raster tile ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Farm boundary box — black rectangle around the entire AOI
    if (!map.getSource('farm-boundary')) {
      map.addSource('farm-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [FARM_BOUNDS.west, FARM_BOUNDS.south],
              [FARM_BOUNDS.east, FARM_BOUNDS.south],
              [FARM_BOUNDS.east, FARM_BOUNDS.north],
              [FARM_BOUNDS.west, FARM_BOUNDS.north],
              [FARM_BOUNDS.west, FARM_BOUNDS.south],
            ]],
          },
        },
      });
      map.addLayer({
        id: 'farm-boundary-line',
        type: 'line',
        source: 'farm-boundary',
        paint: { 'line-color': '#FFFFFF', 'line-width': 3, 'line-opacity': 1 },
      });
    }

    // NDVI raster tile — Vegetation Health layer from GEE
    const { west, south, east, north } = FARM_BOUNDS;
    fetch(`/api/tiles?west=${west}&south=${south}&east=${east}&north=${north}`)
      .then(r => r.json())
      .then(({ tileUrl }: { tileUrl: string }) => {
        if (!tileUrl || !mapRef.current) return;
        const m = mapRef.current;
        if (m.getSource('ndvi-raster')) return;
        m.addSource('ndvi-raster', {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
        });
        m.addLayer(
          { id: 'ndvi-raster-layer', type: 'raster', source: 'ndvi-raster',
            paint: { 'raster-opacity': 0.85, 'raster-resampling': 'nearest' } },
          'farm-boundary-line', // insert below the boundary box
        );
      })
      .catch(() => {}); // server offline — skip silently, vector polygons still show
  }, [mapLoaded]);

  // ── Field polygon layers — fills + outlines + priority overlays ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const polyIds = polygons.map(p => p.id).join(',');
    if (polyIds === lastPolygonIdsRef.current) return;
    lastPolygonIdsRef.current = polyIds;

    // Clear previous field/priority layers and sources
    const style = map.getStyle();
    if (style?.sources) {
      Object.keys(style.sources)
        .filter(k => k.startsWith('field-') || k.startsWith('zone-') || k.startsWith('priority-'))
        .forEach(sid => {
          [`${sid}-fill`, `${sid}-line`].forEach(id => {
            if (map.getLayer(id)) map.removeLayer(id);
          });
          if (map.getSource(sid)) map.removeSource(sid);
        });
    }

    // Sort: draw healthy first (bottom), then moderate, then severe (top)
    const sorted = [...polygons].sort((a, b) => {
      const order = { low: 0, moderate: 1, severe: 2 };
      return (order[a.severity] ?? 0) - (order[b.severity] ?? 0);
    });

    sorted.forEach(field => {
      const sourceId = `field-${field.id}`;
      const [west, south, east, north] = field.bounds;
      const fillColor = GEE_FILL[field.severity];

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { id: field.id, severity: field.severity, ndvi: field.meanNdvi },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ]],
          },
        },
      });

      // Fill — reduced opacity so NDVI raster shows through
      map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': 0.4,
        },
      });

      // Thin outline matching fill color (field boundary marker only)
      map.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': fillColor,
          'line-width': 1.5,
          'line-opacity': 0.8,
        },
      });
    });

    // ── Priority outline layers (top 15 by priority score) ──────────────────
    const toFeature = (field: FieldPolygon) => {
      const [w, s, e, n] = field.bounds;
      return {
        type: 'Feature' as const,
        properties: { id: field.id },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
        },
      };
    };

    // PRIORITY - RED Fields Must Visit → black 3px outline
    const topRed = [...polygons]
      .filter(p => p.severity === 'severe')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 15);

    if (topRed.length > 0) {
      map.addSource('priority-red', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: topRed.map(toFeature) },
      });
      map.addLayer({
        id: 'priority-red-line',
        type: 'line',
        source: 'priority-red',
        paint: { 'line-color': '#000000', 'line-width': 3, 'line-opacity': 1 },
      });
    }

    // PRIORITY - YELLOW Fields Monitor → orange 3px outline
    const topOrange = [...polygons]
      .filter(p => p.severity === 'moderate')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 15);

    if (topOrange.length > 0) {
      map.addSource('priority-orange', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: topOrange.map(toFeature) },
      });
      map.addLayer({
        id: 'priority-orange-line',
        type: 'line',
        source: 'priority-orange',
        paint: { 'line-color': '#FF8C00', 'line-width': 3, 'line-opacity': 1 },
      });
    }

    // Click handler on polygons — find closest zone for ZoneCard
    const clickHandler = (e: mapboxgl.MapMouseEvent) => {
      if (!e.lngLat) return;
      const point = e.lngLat;

      const features = map.queryRenderedFeatures(e.point, {
        layers: sorted.map(f => `field-${f.id}-fill`),
      });

      if (features.length > 0) {
        const clickedId = features[0].properties?.id;
        const clickedPoly = polygons.find(p => p.id === clickedId);

        if (clickedPoly) {
          const matchedZone = zones.find(z =>
            Math.abs(z.ndviValue - clickedPoly.meanNdvi) < 0.01
          );

          if (matchedZone) {
            setActive(matchedZone);
          } else {
            const [w, s, ea, n] = clickedPoly.bounds;
            const tempZone: FieldZone = {
              id: `click-${clickedPoly.id}`,
              label: `Field ${clickedPoly.id.toUpperCase()}`,
              description: clickedPoly.severity === 'severe'
                ? `Critical stress — NDVI ${clickedPoly.meanNdvi.toFixed(2)}, ${clickedPoly.areaHa.toFixed(1)} ha`
                : clickedPoly.severity === 'moderate'
                ? `Moderate stress — NDVI ${clickedPoly.meanNdvi.toFixed(2)}, ${clickedPoly.areaHa.toFixed(1)} ha`
                : `Healthy canopy — NDVI ${clickedPoly.meanNdvi.toFixed(2)}, ${clickedPoly.areaHa.toFixed(1)} ha`,
              ndviValue: clickedPoly.meanNdvi,
              severity: clickedPoly.severity,
              position: { x: 50, y: 50 },
              size: { width: 20, height: 15 },
              lng: (w + ea) / 2,
              lat: (s + n) / 2,
            };
            setActive(tempZone);
          }
        }
      }
    };

    map.on('click', clickHandler);

    const enterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
    const leaveHandler = () => { map.getCanvas().style.cursor = ''; };

    sorted.forEach(f => {
      const layerId = `field-${f.id}-fill`;
      map.on('mouseenter', layerId, enterHandler);
      map.on('mouseleave', layerId, leaveHandler);
    });

    return () => {
      map.off('click', clickHandler);
      sorted.forEach(f => {
        const layerId = `field-${f.id}-fill`;
        map.off('mouseenter', layerId, enterHandler);
        map.off('mouseleave', layerId, leaveHandler);
      });
    };
  }, [polygons, zones, mapLoaded]);

  // ── Polygon visibility toggle ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = polygonsVisible ? 'visible' : 'none';
    const style = map.getStyle();
    if (!style?.layers) return;
    style.layers.forEach(layer => {
      if (layer.id.startsWith('field-') || layer.id.startsWith('priority-')) {
        map.setLayoutProperty(layer.id, 'visibility', vis);
      }
    });
  }, [polygonsVisible, mapLoaded]);

  // ── Auto-select first stressed zone when selectedZone prop is set ─────────
  useEffect(() => {
    if (selectedZone && !active && zones.length > 0) {
      setActive(zones[0]);
    }
  }, [selectedZone, zones, active]);

  const alertCount = stats.low;

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-[#0a0a0a]"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ scale: 1.5, filter: 'blur(16px)', opacity: 0 }}
      transition={springDefault}
    >
      <style>{`
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>

      {/* Mapbox container — full screen */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

      {/* Header */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-5 pt-11"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: mapLoaded ? 1 : 0, y: mapLoaded ? 0 : -8 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] text-white/40 uppercase mb-0.5">
            {region ?? 'Sentinel-2 · NDVI · Imperial Valley CA'}
          </p>
          <h2 className="text-[17px] font-semibold text-white leading-tight">Field Overview</h2>
        </div>

        {alertCount > 0 && (
          <motion.div
            className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(185,28,28,0.25)', border: '1px solid rgba(239,68,68,0.35)' }}
            animate={{ opacity: [1, 0.55, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-[10px] font-semibold text-red-300 whitespace-nowrap">
              {alertCount} Alert{alertCount !== 1 ? 's' : ''}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Polygon toggle button — top right, below header */}
      <motion.button
        className="absolute top-12 right-4 z-20 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
        style={{
          background: polygonsVisible ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          color: '#1a1a1a',
        }}
        onClick={() => setPolygonsVisible(v => !v)}
        initial={{ opacity: 0 }}
        animate={{ opacity: mapLoaded ? 1 : 0 }}
        transition={{ delay: 0.7 }}
      >
        {polygonsVisible ? 'Hide Polygons' : 'Show Polygons'}
      </motion.button>

      {/* Stats panel — top right */}
      <motion.div
        className="absolute top-24 right-4 z-20"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: mapLoaded && polygons.length > 0 ? 1 : 0, x: mapLoaded ? 0 : 8 }}
        transition={{ delay: 0.6 }}
      >
        <div
          className="px-3.5 py-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          <p className="text-[11px] font-bold text-gray-800 mb-2">Field Counts</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#FF0000' }} />
              <span className="text-[11px] text-red-700 font-semibold">Critical: {stats.low}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#FFFF00' }} />
              <span className="text-[11px] text-yellow-700 font-semibold">Moderate: {stats.med}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#00CC00' }} />
              <span className="text-[11px] text-green-700 font-semibold">Healthy: {stats.high}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Legend — bottom left, matching GEE screenshot */}
      <motion.div
        className="absolute bottom-28 left-4 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: mapLoaded ? 1 : 0 }}
        transition={{ delay: 0.8 }}
      >
        <div
          className="px-3.5 py-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          <p className="text-[12px] font-bold text-gray-900 mb-0.5">Field Health (NDVI)</p>
          <p className="text-[10px] text-gray-500 mb-0.5">Imperial Valley CA – Holtville Cropland</p>
          <p className="text-[10px] text-gray-400 mb-2.5">USDA CDL + spectral mask applied</p>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#00CC00' }} />
              <span className="text-[11px] text-gray-700">GREEN = Healthy (NDVI &gt; 0.55)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#FFFF00' }} />
              <span className="text-[11px] text-gray-700">YELLOW = Moderate (NDVI 0.35-0.55)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#FF0000' }} />
              <span className="text-[11px] text-gray-700">RED = Critical (NDVI &lt; 0.35)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#FF8C00' }} />
              <span className="text-[11px] text-gray-700">ORANGE outline = Yellow priority fields</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#000000' }} />
              <span className="text-[11px] text-gray-700">BLACK outline = Red priority fields</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#808080' }} />
              <span className="text-[11px] text-gray-700">GRAY = Roads/buildings/plowed (CDL masked)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />

      {/* Loading state */}
      {zonesLoading && (
        <div className="absolute bottom-36 inset-x-0 flex justify-center z-30 pointer-events-none">
          <div className="glass px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-white/60">Loading satellite field data…</span>
          </div>
        </div>
      )}

      {/* Zone detail card — shown when a polygon is clicked */}
      <AnimatePresence>
        {(active || selectedZone) && zones.length > 0 && (
          <ZoneCard
            zone={active ?? zones[0]}
            onScanLeaf={() => onScanLeaf?.()}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
