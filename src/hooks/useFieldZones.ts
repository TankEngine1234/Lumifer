import { useState, useEffect } from 'react';
import { fieldZones as fallbackZones, FIELD_CENTER as FALLBACK_CENTER, FIELD_ZOOM as FALLBACK_ZOOM } from '../data/fieldZones';
import type { FieldZone, FieldPolygon, SeverityLevel } from '../types';

export type FieldZonesStatus = 'loading' | 'success' | 'error';

export interface FieldZonesResult {
  zones: FieldZone[];
  polygons: FieldPolygon[];
  center: [number, number];
  zoom: number;
  status: FieldZonesStatus;
  region: string;
}

function mapGeeLabel(geeLabel: string): SeverityLevel {
  if (geeLabel === 'LOW') return 'severe';
  if (geeLabel === 'MEDIUM') return 'moderate';
  return 'low';
}

function buildDescription(geeLabel: string, meanNdvi: number, areaHa: number): string {
  const area = areaHa.toFixed(1);
  const ndvi = meanNdvi.toFixed(2);
  if (geeLabel === 'LOW') {
    return `Critical chlorophyll deficit across ${area} ha — NDVI ${ndvi} indicates severe stress`;
  }
  if (geeLabel === 'MEDIUM') {
    return `Moderate vegetation stress across ${area} ha — nutrient imbalance likely`;
  }
  return `Active crop field, ${area} ha — healthy canopy detected`;
}

interface RawField {
  id: string;
  mean_ndvi: number;
  gee_label: string;
  area_ha: number;
  priority: number;
  bounds: [number, number, number, number];
}

interface FieldZonesFile {
  meta?: { region?: string };
  center: [number, number];
  zoom: number;
  fields: RawField[];
}

function parsePolygons(fields: RawField[]): FieldPolygon[] {
  return fields.map(raw => ({
    id: raw.id,
    meanNdvi: raw.mean_ndvi,
    geeLabel: raw.gee_label as 'LOW' | 'MEDIUM' | 'HIGH',
    severity: mapGeeLabel(raw.gee_label),
    areaHa: raw.area_ha,
    priority: raw.priority,
    bounds: raw.bounds,
  }));
}

function derivePriorityZones(fields: RawField[]): FieldZone[] {
  const stressed = fields
    .filter(f => f.gee_label === 'LOW' || f.gee_label === 'MEDIUM')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);

  return stressed.map((raw, i) => {
    const [west, south, east, north] = raw.bounds;
    return {
      id: `pin-${raw.id}`,
      label: `Field HV-${String(i + 1).padStart(2, '0')}`,
      description: buildDescription(raw.gee_label, raw.mean_ndvi, raw.area_ha),
      ndviValue: raw.mean_ndvi,
      severity: mapGeeLabel(raw.gee_label),
      position: { x: 50, y: 50 },
      size: { width: 20, height: 15 },
      lng: (west + east) / 2,
      lat: (south + north) / 2,
    };
  });
}

// Default farm bounds (Imperial Valley, Holtville)
const DEFAULT_BBOX = { west: -115.39, south: 32.84, east: -115.33, north: 32.89 };

const useGeeApi = import.meta.env.VITE_USE_GEE_API === 'true';

function buildResult(file: FieldZonesFile): FieldZonesResult {
  return {
    zones: derivePriorityZones(file.fields),
    polygons: parsePolygons(file.fields),
    center: file.center,
    zoom: file.zoom,
    status: 'success',
    region: file.meta?.region ?? 'Imperial Valley, CA',
  };
}

export function useFieldZones(): FieldZonesResult {
  const [result, setResult] = useState<FieldZonesResult>({
    zones: fallbackZones,
    polygons: [],
    center: FALLBACK_CENTER,
    zoom: FALLBACK_ZOOM,
    status: 'loading',
    region: 'Brazos County, TX',
  });

  useEffect(() => {
    let cancelled = false;

    const fallbackResult: FieldZonesResult = {
      zones: fallbackZones,
      polygons: [],
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      status: 'error',
      region: 'Brazos County, TX',
    };

    async function load() {
      // Try 1: Live GEE API (when enabled)
      if (useGeeApi) {
        try {
          const { west, south, east, north } = DEFAULT_BBOX;
          const url = `/api/fields?west=${west}&south=${south}&east=${east}&north=${north}`;
          const r = await fetch(url);
          if (r.ok) {
            const file = await r.json() as FieldZonesFile;
            if (!cancelled) setResult(buildResult(file));
            return;
          }
        } catch {
          // API unavailable — fall through to static JSON
        }
      }

      // Try 2: Static JSON from public/
      try {
        const r = await fetch('/field-zones.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const file = await r.json() as FieldZonesFile;
        if (!cancelled) setResult(buildResult(file));
        return;
      } catch {
        // Static file also unavailable
      }

      // Try 3: Hardcoded fallback
      if (!cancelled) setResult(fallbackResult);
    }

    load();

    return () => { cancelled = true; };
  }, []);

  return result;
}
