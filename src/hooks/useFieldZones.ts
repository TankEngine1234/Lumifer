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

interface GeoProperties {
  label?: string;
  mean_ndvi?: number | string;
  ndvi?: number | string;
  area_ha?: number | string;
  priority?: number | string;
  featureId?: string | number;
  'system:index'?: string;
}

function mapLabel(label: string): SeverityLevel {
  if (label === 'LOW') return 'severe';
  if (label === 'MEDIUM') return 'moderate';
  return 'low';
}

function buildDescription(label: string, meanNdvi: number, areaHa: number): string {
  const area = areaHa.toFixed(1);
  const ndvi = meanNdvi.toFixed(2);
  if (label === 'LOW') {
    return `Critical chlorophyll deficit across ${area} ha — NDVI ${ndvi} indicates severe stress`;
  }
  if (label === 'MEDIUM') {
    return `Moderate vegetation stress across ${area} ha — nutrient imbalance likely`;
  }
  return `Active crop field, ${area} ha — healthy canopy detected`;
}

// Imperial Valley farm center/zoom
const FIELD_CENTER: [number, number] = [-115.36, 32.865];
const FIELD_ZOOM = 13;
const REGION = 'Imperial Valley, CA';

export function useFieldZones(): FieldZonesResult {
  const [result, setResult] = useState<FieldZonesResult>({
    zones: fallbackZones,
    polygons: [],
    center: FALLBACK_CENTER,
    zoom: FALLBACK_ZOOM,
    status: 'loading',
    region: REGION,
  });

  useEffect(() => {
    let cancelled = false;

    fetch('/field-zones.geojson')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<GeoJSON.FeatureCollection<GeoJSON.Geometry | null, GeoProperties>>;
      })
      .then(geojson => {
        if (cancelled) return;

        const features = geojson.features ?? [];

        const polygons: FieldPolygon[] = features.map((f, i) => {
          const props = f.properties ?? {};
          const label = String(props.label ?? 'HIGH');
          const meanNdvi = parseFloat(String(props.mean_ndvi ?? props.ndvi ?? '0'));
          const areaHa = parseFloat(String(props.area_ha ?? '0'));
          const priority = parseFloat(String(props.priority ?? '0'));
          const id = String(props.featureId ?? props['system:index'] ?? i);

          let bounds: [number, number, number, number] = [-115.39, 32.84, -115.33, 32.89];
          if (f.geometry?.type === 'Polygon') {
            const coords = (f.geometry as GeoJSON.Polygon).coordinates[0];
            const lngs = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);
            bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
          } else if (f.geometry?.type === 'MultiPolygon') {
            const all = (f.geometry as GeoJSON.MultiPolygon).coordinates.flat(2);
            const lngs = all.map(c => c[0]);
            const lats = all.map(c => c[1]);
            bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
          }

          return {
            id,
            meanNdvi: isFinite(meanNdvi) ? meanNdvi : 0,
            geeLabel: label as 'LOW' | 'MEDIUM' | 'HIGH',
            severity: mapLabel(label),
            areaHa: isFinite(areaHa) ? areaHa : 0,
            priority: isFinite(priority) ? priority : 0,
            geometry: f.geometry,
            bounds,
          };
        });

        const zones: FieldZone[] = features
          .filter(f => {
            const l = String(f.properties?.label ?? '');
            return l === 'LOW' || l === 'MEDIUM';
          })
          .sort((a, b) => {
            const pa = parseFloat(String(a.properties?.priority ?? '0'));
            const pb = parseFloat(String(b.properties?.priority ?? '0'));
            return pb - pa;
          })
          .slice(0, 8)
          .map((f, i) => {
            const props = f.properties ?? {};
            const label = String(props.label ?? 'HIGH');
            const meanNdvi = parseFloat(String(props.mean_ndvi ?? props.ndvi ?? '0'));
            const areaHa = parseFloat(String(props.area_ha ?? '0'));
            let lng = FIELD_CENTER[0];
            let lat = FIELD_CENTER[1];
            if (f.geometry?.type === 'Polygon') {
              const coords = (f.geometry as GeoJSON.Polygon).coordinates[0];
              const lngs = coords.map(c => c[0]);
              const lats = coords.map(c => c[1]);
              lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
              lat = (Math.min(...lats) + Math.max(...lats)) / 2;
            }
            return {
              id: `pin-${String(props.featureId ?? props['system:index'] ?? i)}`,
              label: `Field HV-${String(i + 1).padStart(2, '0')}`,
              description: buildDescription(label, isFinite(meanNdvi) ? meanNdvi : 0, isFinite(areaHa) ? areaHa : 0),
              ndviValue: isFinite(meanNdvi) ? meanNdvi : 0,
              severity: mapLabel(label),
              position: { x: 50, y: 50 },
              size: { width: 20, height: 15 },
              lng,
              lat,
            };
          });

        setResult({
          zones,
          polygons,
          center: FIELD_CENTER,
          zoom: FIELD_ZOOM,
          status: 'success',
          region: REGION,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            zones: fallbackZones,
            polygons: [],
            center: FALLBACK_CENTER,
            zoom: FALLBACK_ZOOM,
            status: 'error',
            region: REGION,
          });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return result;
}
