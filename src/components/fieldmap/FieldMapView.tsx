import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';
import ZoneCard from './ZoneCard';
import type { FieldZone, FieldPolygon } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface Props {
  zones: FieldZone[];
  polygons: FieldPolygon[];
  center: [number, number];
  zoom: number;
  zonesLoading?: boolean;
  selectedZone?: boolean;
  onZoneSelect?: () => void;
  onScanLeaf?: () => void;
  region?: string;
}

// GEE screenshot colors — exact match
const GEE_FILL: Record<string, string> = {
  severe:   '#FF0000',
  moderate: '#FFFF00',
  low:      '#00CC00',
};

// Priority outlines: black for RED priority, orange for YELLOW priority, dark green for healthy
const GEE_OUTLINE: Record<string, string> = {
  severe:   '#000000',
  moderate: '#FF8C00',
  low:      '#005500',
};

export default function FieldMapView({
  zones,
  polygons,
  center,
  zoom,
  zonesLoading = false,
  selectedZone,
  onZoneSelect,
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

  // ── Field polygon layers — colored rectangles matching GEE screenshot ─────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const polyIds = polygons.map(p => p.id).join(',');
    if (polyIds === lastPolygonIdsRef.current) return;
    lastPolygonIdsRef.current = polyIds;

    // Clear previous layers/sources
    const style = map.getStyle();
    if (style?.sources) {
      Object.keys(style.sources)
        .filter(k => k.startsWith('field-') || k.startsWith('zone-'))
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
      const outlineColor = GEE_OUTLINE[field.severity];

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

      // Fill layer
      map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': 0.55,
        },
      });

      // Outline — 2px stroke, priority-colored
      map.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': outlineColor,
          'line-width': field.severity === 'severe' ? 2.5 : 2,
          'line-opacity': 0.9,
        },
      });
    });

    // Click handler on polygons — find closest zone for ZoneCard
    const clickHandler = (e: mapboxgl.MapMouseEvent) => {
      if (!e.lngLat) return;
      const point = e.lngLat;

      // Find which polygon was clicked
      const features = map.queryRenderedFeatures(e.point, {
        layers: sorted.map(f => `field-${f.id}-fill`),
      });

      if (features.length > 0) {
        const clickedId = features[0].properties?.id;
        const clickedPoly = polygons.find(p => p.id === clickedId);

        if (clickedPoly) {
          // Find matching zone or create a temporary one from polygon data
          const matchedZone = zones.find(z =>
            Math.abs(z.ndviValue - clickedPoly.meanNdvi) < 0.01
          );

          if (matchedZone) {
            setActive(matchedZone);
            onZoneSelect?.();
          } else {
            // Build a zone from the polygon for display
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
            onZoneSelect?.();
          }

          map.flyTo({
            center: [point.lng, point.lat],
            zoom: Math.max(map.getZoom(), 15.5),
            duration: 600,
            essential: true,
          });
        }
      }
    };

    map.on('click', clickHandler);

    // Cursor change on hover
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
  }, [polygons, zones, mapLoaded, onZoneSelect]);

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
            {/* Color classes */}
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

            {/* Outline classes */}
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#FF8C00' }} />
              <span className="text-[11px] text-gray-700">ORANGE outline = Yellow priority fields</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: '#000000' }} />
              <span className="text-[11px] text-gray-700">BLACK outline = Red priority fields</span>
            </div>

            {/* Masked areas */}
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
