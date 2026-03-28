import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';
import ZoneCard from './ZoneCard';
import { fieldZones, FIELD_CENTER, FIELD_ZOOM } from '../../data/fieldZones';
import type { FieldZone } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface Props {
  selectedZone?: boolean;
  onZoneSelect?: () => void;
  onScanLeaf?: () => void;
}

const severityColor: Record<string, string> = {
  severe:   '#ef4444',
  moderate: '#f59e0b',
  low:      '#22c55e',
};

export default function FieldMapView({ selectedZone, onZoneSelect, onScanLeaf }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [active, setActive] = useState<FieldZone | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: FIELD_CENTER,
      zoom: FIELD_ZOOM,
      pitch: 0,
      bearing: 0,
      interactive: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true);

      // Add NDVI stress zone circles as GeoJSON fills
      fieldZones.forEach((zone) => {
        const sourceId = `zone-${zone.id}`;
        const color = severityColor[zone.severity];

        // Circle source (approximated as a polygon in degrees)
        const radiusDeg = 0.0007; // ~70m radius
        const steps = 64;
        const coords: [number, number][] = [];
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * 2 * Math.PI;
          coords.push([
            zone.lng + radiusDeg * Math.cos(angle) * 1.3,
            zone.lat + radiusDeg * Math.sin(angle),
          ]);
        }
        coords.push(coords[0]);

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { id: zone.id },
            geometry: { type: 'Polygon', coordinates: [coords] },
          },
        });

        // Outer glow fill
        map.addLayer({
          id: `${sourceId}-glow`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.18,
          },
        });

        // Inner fill
        map.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.35,
          },
        });

        // Stroke outline
        map.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 1.5,
            'line-opacity': 0.8,
          },
        });
      });

      // Add custom HTML markers (NDVI pill pins)
      fieldZones.forEach((zone) => {
        const color = severityColor[zone.severity];

        const el = document.createElement('div');
        el.className = 'ndvi-pin';
        el.innerHTML = `
          <div style="
            display:flex; flex-direction:column; align-items:center;
            cursor:pointer; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
          ">
            <div style="
              display:flex; align-items:center; gap:5px;
              padding:4px 10px; border-radius:999px;
              background:rgba(0,0,0,0.72);
              border:1px solid ${color};
              backdrop-filter:blur(8px);
            ">
              <span style="
                width:7px; height:7px; border-radius:50%;
                background:${color};
                box-shadow:0 0 6px ${color};
                flex-shrink:0;
              "></span>
              <span style="
                font-size:12px; font-weight:700;
                color:${color}; font-family:system-ui,sans-serif;
                letter-spacing:-0.01em;
              ">${zone.ndviValue.toFixed(2)}</span>
            </div>
            <div style="width:1px; height:10px; background:${color}; opacity:0.6;"></div>
            <div style="
              width:8px; height:8px; border-radius:50%;
              background:${color};
              box-shadow:0 0 10px ${color};
            "></div>
          </div>
        `;

        // Pulse ring for severe zones
        if (zone.severity === 'severe') {
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position:absolute; top:-2px; left:50%;
            transform:translateX(-50%);
            width:36px; height:36px; border-radius:50%;
            border:1.5px solid ${color};
            animation:ndvi-pulse 1.6s ease-out infinite;
            pointer-events:none;
          `;
          el.style.position = 'relative';
          el.appendChild(pulse);
        }

        el.addEventListener('click', () => {
          setActive(zone);
          onZoneSelect?.();
          map.flyTo({
            center: [zone.lng, zone.lat],
            zoom: 16.5,
            duration: 800,
            essential: true,
          });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([zone.lng, zone.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Auto-select first zone if selectedZone prop is true
  useEffect(() => {
    if (selectedZone && !active) {
      setActive(fieldZones[0]);
    }
  }, [selectedZone]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-[#0a1a0d]"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ scale: 1.5, filter: 'blur(16px)', opacity: 0 }}
      transition={springDefault}
    >
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes ndvi-pulse {
          0%   { transform: translateX(-50%) scale(1);   opacity: 0.5; }
          100% { transform: translateX(-50%) scale(2.2); opacity: 0; }
        }
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>

      {/* Mapbox container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/75 to-transparent pointer-events-none z-10" />

      {/* Header */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-5 pt-11"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: mapLoaded ? 1 : 0, y: mapLoaded ? 0 : -8 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] text-white/40 uppercase mb-0.5">
            Sentinel-2 · NDVI · Brazos County TX
          </p>
          <h2 className="text-[17px] font-semibold text-white leading-tight">Field Overview</h2>
        </div>
        <motion.div
          className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(185,28,28,0.25)', border: '1px solid rgba(239,68,68,0.35)' }}
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-[10px] font-semibold text-red-300 whitespace-nowrap">1 Alert</span>
        </motion.div>
      </motion.div>

      {/* NDVI scale bar */}
      <motion.div
        className="absolute bottom-28 right-4 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: mapLoaded ? 1 : 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="glass px-3 py-2">
          <p className="text-[8px] font-bold tracking-widest text-white/35 uppercase mb-1.5">NDVI Index</p>
          <div className="h-1.5 w-28 rounded-full mb-1" style={{ background: 'linear-gradient(to right,#b91c1c,#ca8a04,#65a30d,#166534)' }} />
          <div className="flex justify-between w-28">
            <span className="text-[8px] text-white/35">0.0 · Stressed</span>
            <span className="text-[8px] text-white/35">1.0</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-10" />

      {/* Zone card */}
      <AnimatePresence>
        {(active || selectedZone) && (
          <ZoneCard
            zone={active ?? fieldZones[0]}
            onScanLeaf={() => onScanLeaf?.()}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
