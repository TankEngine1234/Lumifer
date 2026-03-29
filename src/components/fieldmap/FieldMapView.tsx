import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';
import ZoneCard from './ZoneCard';
import LeafAnalysisPanel from '../analysis/LeafAnalysisPanel';
import type { FieldZone, FieldPolygon } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

// Farm AOI - Imperial Valley, Holtville
const FARM_BOUNDS = { west: -115.39, south: 32.84, east: -115.33, north: 32.89 };

interface Props {
  zones: FieldZone[];
  polygons: FieldPolygon[];
  center: [number, number];
  zoom: number;
  zonesLoading?: boolean;
  selectedZone?: boolean;
  initialZone?: FieldZone | null;
  onZoneSelect?: (zone?: FieldZone) => void;
  onScanLeaf?: () => void;
  region?: string;
}

type GeoFieldLabel = 'LOW' | 'MEDIUM' | 'HIGH';

interface GeoFieldProperties {
  label?: GeoFieldLabel;
  mean_ndvi?: number | string;
  ndvi?: number | string;
  area_ha?: number | string;
  priority?: number | string;
  featureId?: string | number;
  'system:index'?: string;
  fillColor?: string;
  outlineColor?: string;
}

type GeoFieldCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry | null, GeoFieldProperties>;


export default function FieldMapView({
  zones,
  polygons,
  center,
  zoom,
  zonesLoading = false,
  selectedZone,
  initialZone = null,
  onZoneSelect,
  onScanLeaf,
  region,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const targetMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const onZoneSelectRef = useRef(onZoneSelect);
  const onScanLeafRef = useRef(onScanLeaf);
  const initCenter = useRef(center);
  const initZoom = useRef(zoom);
  const [active, setActive] = useState<FieldZone | null>(null);
  const [leafPanelOpen, setLeafPanelOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [polygonsVisible, setPolygonsVisible] = useState(true);
  const [geoStats, setGeoStats] = useState({ total: 0, low: 0, med: 0, high: 0 });

  const clearTargetMarkers = useCallback(() => {
    targetMarkersRef.current.forEach(marker => marker.remove());
    targetMarkersRef.current = [];
  }, []);

  const hasLayer = useCallback((layerId: string) => {
    const map = mapRef.current;
    if (!map) return false;

    try {
      return Boolean(map.getStyle()?.layers?.some(layer => layer.id === layerId));
    } catch {
      return false;
    }
  }, []);

  const getFeatureCenter = useCallback((feature: GeoJSON.Feature<GeoJSON.Geometry | null, GeoFieldProperties>) => {
    const geometry = feature.geometry;
    const coordinates =
      geometry?.type === 'Polygon'
        ? geometry.coordinates?.[0]
        : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates?.[0]?.[0]
        : null;

    if (!coordinates?.length) return null;

    const lngs = coordinates.map((coord: number[]) => coord[0]);
    const lats = coordinates.map((coord: number[]) => coord[1]);

    return {
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    };
  }, []);

  const buildZoneFromFeature = useCallback((
    feature: GeoJSON.Feature<GeoJSON.Geometry | null, GeoFieldProperties>,
    fallbackLng: number,
    fallbackLat: number
  ): FieldZone => {
    const props = (feature.properties ?? {}) as GeoFieldProperties;
    const label = String(props.label ?? 'HIGH');
    const ndviValue = Number.parseFloat(String(props.mean_ndvi ?? props.ndvi ?? '0'));
    const areaValue = Number.parseFloat(String(props.area_ha ?? '0'));
    const centerPoint = getFeatureCenter(feature);

    return {
      id: `field-${props.featureId ?? feature.id ?? 'unknown'}`,
      label: `Field - NDVI ${Number.isFinite(ndviValue) ? ndviValue.toFixed(2) : 'N/A'}`,
      description:
        label === 'LOW'
          ? `Critical stress - ${areaValue.toFixed(1)} ha, NDVI ${ndviValue.toFixed(2)}`
          : label === 'MEDIUM'
          ? `Moderate stress - ${areaValue.toFixed(1)} ha, NDVI ${ndviValue.toFixed(2)}`
          : `Healthy canopy - ${areaValue.toFixed(1)} ha, NDVI ${ndviValue.toFixed(2)}`,
      ndviValue: Number.isFinite(ndviValue) ? ndviValue : 0,
      severity: label === 'LOW' ? 'severe' : label === 'MEDIUM' ? 'moderate' : 'low',
      position: { x: 50, y: 50 },
      size: { width: 20, height: 15 },
      lng: centerPoint?.lng ?? fallbackLng,
      lat: centerPoint?.lat ?? fallbackLat,
    };
  }, [getFeatureCenter]);

  // Load stats from local GeoJSON file
  useEffect(() => {
    fetch('/field-zones.geojson')
      .then(r => r.json())
      .then((geojson: GeoFieldCollection) => {
        const features = geojson.features ?? [];
        const low = features.filter(f => f.properties?.label === 'LOW').length;
        const med = features.filter(f => f.properties?.label === 'MEDIUM').length;
        const high = features.filter(f => f.properties?.label === 'HIGH').length;
        setGeoStats({ total: features.length, low, med, high });
      })
      .catch(() => {});
  }, []);

  // Keep stats alias for template compatibility
  const stats = geoStats;

  // Unused polygons prop acknowledged (kept for interface compatibility)
  void polygons;
  void region;

  useEffect(() => {
    onZoneSelectRef.current = onZoneSelect;
  }, [onZoneSelect]);

  useEffect(() => {
    onScanLeafRef.current = onScanLeaf;
  }, [onScanLeaf]);

  // Map initialisation
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
  }, []);

  // Static layers: farm boundary box only (no GEE API calls)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // RGB base image pinned to farm bounds (underneath all polygon layers)
    if (!map.getSource('rgb-base')) {
      map.addSource('rgb-base', {
        type: 'image',
        url: '/layers/rgb-base.png',
        coordinates: [
          [-115.39, 32.89], // top-left
          [-115.33, 32.89], // top-right
          [-115.33, 32.84], // bottom-right
          [-115.39, 32.84], // bottom-left
        ],
      });
      map.addLayer({
        id: 'rgb-base-layer',
        type: 'raster',
        source: 'rgb-base',
        paint: { 'raster-opacity': 1, 'raster-resampling': 'linear' },
      });
    }

    // Farm boundary box - white rectangle around the entire AOI
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
  }, [mapLoaded]);

  // Field polygon layers - loaded from local GeoJSON file, no GEE API calls
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    let cancelled = false;

    const selectFeature = (
      feature: GeoJSON.Feature<GeoJSON.Geometry | null, GeoFieldProperties>,
      lng: number,
      lat: number
    ) => {
      const tempZone = buildZoneFromFeature(feature, lng, lat);
      setActive(tempZone);
      onZoneSelectRef.current?.(tempZone);
      setLeafPanelOpen(true);
      map.flyTo({
        center: [tempZone.lng, tempZone.lat],
        zoom: Math.min(Math.max(map.getZoom(), 12.8), 13.6),
        duration: 600,
      });
    };

    const clickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;

      const feature = e.features[0] as GeoJSON.Feature<GeoJSON.Geometry | null, GeoFieldProperties>;
      selectFeature(feature, e.lngLat.lng, e.lngLat.lat);
    };

    const enterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
    const leaveHandler = () => { map.getCanvas().style.cursor = ''; };

    const bindHandlers = () => {
      if (!hasLayer('gee-fields-hit')) return;
      map.off('click', 'gee-fields-hit', clickHandler);
      map.off('mouseenter', 'gee-fields-hit', enterHandler);
      map.off('mouseleave', 'gee-fields-hit', leaveHandler);
      map.on('click', 'gee-fields-hit', clickHandler);
      map.on('mouseenter', 'gee-fields-hit', enterHandler);
      map.on('mouseleave', 'gee-fields-hit', leaveHandler);
    };

    fetch('/field-zones.geojson')
      .then(r => r.json())
      .then((geojson: GeoFieldCollection) => {
        if (cancelled || !mapRef.current) return;
        clearTargetMarkers();

        const existingSource = map.getSource('gee-fields') as mapboxgl.GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(geojson);
        } else {
          map.addSource('gee-fields', { type: 'geojson', data: geojson });

          // Filled polygons: RED=LOW, YELLOW=MEDIUM, GREEN=HIGH
          map.addLayer({
            id: 'gee-fields-fill',
            type: 'fill',
            source: 'gee-fields',
            paint: {
              'fill-antialias': true,
              'fill-color': [
                'match',
                ['get', 'label'],
                'LOW', '#FF0000',
                'MEDIUM', '#FFFF00',
                'HIGH', '#00CC00',
                '#00CC00',
              ],
              'fill-opacity': 0.45,
            },
          });

          // Click target layer (invisible, on top of fill)
          map.addLayer({
            id: 'gee-fields-hit',
            type: 'fill',
            source: 'gee-fields',
            paint: { 'fill-color': '#000000', 'fill-opacity': 0.001 },
          });

          // LOW fields: black outline
          map.addLayer({
            id: 'priority-red-line',
            type: 'line',
            source: 'gee-fields',
            filter: ['==', ['get', 'label'], 'LOW'],
            paint: { 'line-color': '#000000', 'line-width': 2, 'line-blur': 0.3 },
          });

          // MEDIUM fields: orange outline
          map.addLayer({
            id: 'priority-orange-line',
            type: 'line',
            source: 'gee-fields',
            filter: ['==', ['get', 'label'], 'MEDIUM'],
            paint: { 'line-color': '#FF6600', 'line-width': 2, 'line-blur': 0.3 },
          });

          // HIGH fields: subtle dark outline
          map.addLayer({
            id: 'gee-fields-line',
            type: 'line',
            source: 'gee-fields',
            filter: ['==', ['get', 'label'], 'HIGH'],
            paint: { 'line-color': '#111111', 'line-width': 1, 'line-blur': 0.5, 'line-opacity': 0.85 },
          });
        }

        geojson.features.forEach((feature, index) => {
          const label = String(feature.properties?.label ?? 'HIGH');
          if (label === 'HIGH') return;

          const centerPoint = getFeatureCenter(feature);
          if (!centerPoint) return;

          const markerElement = document.createElement('button');
          markerElement.type = 'button';
          markerElement.setAttribute('aria-label', `Inspect field ${index + 1}`);
          markerElement.style.width = '28px';
          markerElement.style.height = '28px';
          markerElement.style.borderRadius = '999px';
          markerElement.style.border = '3px solid #FFFFFF';
          markerElement.style.background = '#2D5A27';
          markerElement.style.boxShadow = '0 4px 14px rgba(0,0,0,0.35)';
          markerElement.style.display = polygonsVisible ? 'flex' : 'none';
          markerElement.style.alignItems = 'center';
          markerElement.style.justifyContent = 'center';
          markerElement.style.cursor = 'pointer';

          const innerDot = document.createElement('span');
          innerDot.style.width = '9px';
          innerDot.style.height = '9px';
          innerDot.style.borderRadius = '999px';
          innerDot.style.background = '#FFFFFF';
          markerElement.appendChild(innerDot);

          markerElement.addEventListener('click', (event) => {
            event.stopPropagation();
            selectFeature(feature, centerPoint.lng, centerPoint.lat);
          });

          const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'center' })
            .setLngLat([centerPoint.lng, centerPoint.lat])
            .addTo(map);

          targetMarkersRef.current.push(marker);
        });

        bindHandlers();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (hasLayer('gee-fields-hit')) {
        map.off('click', 'gee-fields-hit', clickHandler);
        map.off('mouseenter', 'gee-fields-hit', enterHandler);
        map.off('mouseleave', 'gee-fields-hit', leaveHandler);
      }
      clearTargetMarkers();
      try {
        map.getCanvas().style.cursor = '';
      } catch {
        // Map canvas may already be detached during teardown.
      }
    };
  }, [buildZoneFromFeature, clearTargetMarkers, getFeatureCenter, hasLayer, mapLoaded, polygonsVisible]);

  const POLYGON_LAYER_IDS = [
    'gee-fields-fill',
    'gee-fields-hit',
    'gee-fields-line',
    'priority-red-line',
    'priority-orange-line',
  ];

  const togglePolygons = () => {
    const next = !polygonsVisible;
    setPolygonsVisible(next);
    const map = mapRef.current;
    if (!map) return;
    const vis = next ? 'visible' : 'none';
    POLYGON_LAYER_IDS.forEach(id => {
      if (hasLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    });
    targetMarkersRef.current.forEach(marker => {
      const element = marker.getElement() as HTMLElement;
      element.style.display = next ? 'flex' : 'none';
    });
  };

  const alertCount = stats.low;
  const displayedZone = active ?? initialZone ?? (selectedZone && zones.length > 0 ? zones[0] : null);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-[#050805]"
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

      {/* Mapbox container - full screen */}
      <div ref={mapContainer} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-0 z-10" style={{ background: 'linear-gradient(to bottom, rgba(5,8,5,0.58), transparent 24%, rgba(5,8,5,0.24))' }} />

      {/* Header */}
      <motion.div
        className="absolute left-4 right-4 top-4 z-20"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: mapLoaded ? 1 : 0, y: mapLoaded ? 0 : -8 }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="mx-auto w-full max-w-[480px] px-5 py-3"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            background: 'rgba(5,8,5,0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div style={{ flex: 1 }}>
            <p
              className="section-label mb-0.5"
              style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.10em' }}
            >
              IMPERIAL COUNTY, CALIFORNIA
            </p>
            <h2 className="text-[18px] font-extrabold leading-tight" style={{ color: '#FFFFFF' }}>Field Overview</h2>
          </div>

          {alertCount > 0 && (
            <motion.div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: 'rgba(45,90,39,0.35)', border: '1px solid rgba(45,90,39,0.5)' }}
              animate={{ opacity: [1, 0.72, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: '#6FCF6F' }} />
              <span className="whitespace-nowrap text-xs font-bold" style={{ color: '#FFFFFF' }}>
                {alertCount} Alert{alertCount !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Polygon toggle button - top right, below header */}
      <motion.button
        className="absolute right-4 top-[132px] z-20 app-button-primary"
        style={{
          background: polygonsVisible ? '#2D5A27' : '#FFFFFF',
          color: polygonsVisible ? '#FFFFFF' : '#2D5A27',
          border: polygonsVisible ? 'none' : '2px solid #2D5A27',
          padding: '18px 24px',
          fontSize: '18px',
          fontWeight: 800,
          minWidth: 220,
        }}
        onClick={togglePolygons}
        initial={{ opacity: 0 }}
        animate={{ opacity: mapLoaded ? 1 : 0 }}
        transition={{ delay: 0.7 }}
      >
        {polygonsVisible ? 'Hide Polygons' : 'Show Polygons'}
      </motion.button>

      {/* Stats panel - top right */}
      <motion.div
        className="absolute right-4 top-[220px] z-20 w-[280px] max-w-[calc(100vw-32px)]"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: mapLoaded && geoStats.total > 0 ? 1 : 0, x: mapLoaded ? 0 : 8 }}
        transition={{ delay: 0.6 }}
      >
        <div
          className="app-card px-5 py-5"
          style={{ maxHeight: '42vh', overflowY: 'auto' }}
        >
          <p className="app-label mb-3" style={{ textAlign: 'center' }}>Field Counts</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ background: '#FF0000' }} />
              <span className="text-base font-bold" style={{ color: '#111111' }}>Critical: {stats.low}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ background: '#FFFF00' }} />
              <span className="text-base font-bold" style={{ color: '#111111' }}>Moderate: {stats.med}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ background: '#00CC00' }} />
              <span className="text-base font-bold" style={{ color: '#111111' }}>Healthy: {stats.high}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Legend - bottom left, matching GEE screenshot */}
      <motion.div
        className="absolute bottom-4 left-4 z-20 w-[300px] max-w-[calc(100vw-32px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: mapLoaded ? 1 : 0 }}
        transition={{ delay: 0.8 }}
      >
        <div
          className="px-4 py-3"
          style={{
            background: 'rgba(5,8,5,0.76)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <p className="text-sm font-extrabold mb-0.5" style={{ color: '#FFFFFF' }}>Field Health (NDVI)</p>
          <p className="text-[11px] font-medium mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>Imperial Valley CA · USDA CDL + spectral mask</p>

          <div className="flex flex-col gap-1.5">
            {[
              { color: '#00CC00', label: 'Healthy (NDVI > 0.55)' },
              { color: '#FFFF00', label: 'Moderate (NDVI 0.35–0.55)' },
              { color: '#FF0000', label: 'Critical (NDVI < 0.35)' },
              { color: '#FF8C00', label: 'Orange outline = Yellow priority' },
              { color: '#000000', label: 'Black outline = Red priority', border: 'rgba(255,255,255,0.3)' },
              { color: '#808080', label: 'Gray = CDL masked (roads/plowed)' },
            ].map(({ color, label, border }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: color, border: border ? `1px solid ${border}` : undefined }}
                />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Loading state */}
      {zonesLoading && (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 z-30 flex justify-center">
          <div className="glass flex items-center gap-2 px-4 py-3">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#2D5A27' }} />
            <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Loading satellite field data...</span>
          </div>
        </div>
      )}

      {/* Zone detail card - shown when a polygon is clicked */}
      <AnimatePresence>
        {displayedZone && !leafPanelOpen && (
          <ZoneCard
            zone={displayedZone}
            onScanLeaf={() => setLeafPanelOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leafPanelOpen && displayedZone && (
          <LeafAnalysisPanel
            fieldId={displayedZone.id}
            fieldLabel={displayedZone.label}
            onClose={() => setLeafPanelOpen(false)}
            onScanLeaf={onScanLeaf}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
