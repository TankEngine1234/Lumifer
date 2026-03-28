import { useState, useEffect } from 'react';
import type { NASAClimateResult, NASAPowerDaily, StressEvent, NASAFetchStatus } from '../types';

function formatNASADate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function subDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - days);
  return result;
}

// Forward-fill -999 sentinel values (NASA missing data)
function cleanSeries(raw: Record<string, number>): Record<string, number> {
  const cleaned: Record<string, number> = {};
  let last = 20; // reasonable fallback
  for (const [date, val] of Object.entries(raw)) {
    cleaned[date] = val === -999 ? last : val;
    if (val !== -999) last = val;
  }
  return cleaned;
}

function detectStressEvents(daily: NASAPowerDaily): {
  stressEvents: StressEvent[];
  heatDays: number;
  droughtGap: number;
  lowHumidityDays: number;
} {
  const dates = Object.keys(daily.T2M_MAX).sort();
  const stressEvents: StressEvent[] = [];
  let heatDays = 0;
  let lowHumidityDays = 0;

  // Heat events: T2M_MAX > 34°C for ≥ 3 consecutive days (Zhao et al., 2017)
  let heatRun = 0;
  let heatStart = '';
  let heatPeak = 0;

  // Drought events: PRECTOTCORR < 1mm for ≥ 7 consecutive days (FAO standard)
  let droughtRun = 0;
  let maxDroughtRun = 0;
  let droughtStart = '';

  // Humidity events: RH2M < 40% for ≥ 5 consecutive days (Marschner, 1995)
  let rhRun = 0;
  let rhStart = '';
  let rhMin = 100;

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const tmax = daily.T2M_MAX[date];
    const precip = daily.PRECTOTCORR[date];
    const rh = daily.RH2M[date];

    // --- Heat ---
    if (tmax > 34) {
      heatDays++;
      if (heatRun === 0) heatStart = date;
      heatRun++;
      heatPeak = Math.max(heatPeak, tmax);
    } else {
      if (heatRun >= 3) {
        stressEvents.push({
          type: 'heat',
          startDate: heatStart,
          endDate: dates[i - 1],
          durationDays: heatRun,
          peakValue: heatPeak,
        });
      }
      heatRun = 0;
      heatPeak = 0;
    }

    // --- Drought ---
    if (precip < 1.0) {
      if (droughtRun === 0) droughtStart = date;
      droughtRun++;
      maxDroughtRun = Math.max(maxDroughtRun, droughtRun);
    } else {
      if (droughtRun >= 7) {
        stressEvents.push({
          type: 'drought',
          startDate: droughtStart,
          endDate: dates[i - 1],
          durationDays: droughtRun,
          peakValue: droughtRun,
        });
      }
      droughtRun = 0;
    }

    // --- Humidity ---
    if (rh < 40) {
      lowHumidityDays++;
      if (rhRun === 0) rhStart = date;
      rhRun++;
      rhMin = Math.min(rhMin, rh);
    } else {
      if (rhRun >= 5) {
        stressEvents.push({
          type: 'humidity',
          startDate: rhStart,
          endDate: dates[i - 1],
          durationDays: rhRun,
          peakValue: rhMin,
        });
      }
      rhRun = 0;
      rhMin = 100;
    }
  }

  // Flush any open runs at end of series
  if (heatRun >= 3) {
    stressEvents.push({ type: 'heat', startDate: heatStart, endDate: dates[dates.length - 1], durationDays: heatRun, peakValue: heatPeak });
  }
  if (droughtRun >= 7) {
    stressEvents.push({ type: 'drought', startDate: droughtStart, endDate: dates[dates.length - 1], durationDays: droughtRun, peakValue: droughtRun });
  }
  if (rhRun >= 5) {
    stressEvents.push({ type: 'humidity', startDate: rhStart, endDate: dates[dates.length - 1], durationDays: rhRun, peakValue: rhMin });
  }

  return { stressEvents, heatDays, droughtGap: maxDroughtRun, lowHumidityDays };
}

const INITIAL: NASAClimateResult = {
  status: 'idle',
  daily: null,
  stressEvents: [],
  heatDays: 0,
  droughtGap: 0,
  lowHumidityDays: 0,
};

export function useNASAPower(lat: number, lng: number): NASAClimateResult {
  const [result, setResult] = useState<NASAClimateResult>(INITIAL);

  useEffect(() => {
    const cacheKey = `lumifer_nasa_${lat.toFixed(3)}_${lng.toFixed(3)}`;

    // Try localStorage cache first (valid for 24h)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: { timestamp: number; data: NASAClimateResult } = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 86_400_000) {
          setResult({ ...parsed.data, status: 'success' });
          return;
        }
      }
    } catch {
      // ignore malformed cache
    }

    setResult(r => ({ ...r, status: 'loading' }));

    const end = new Date();
    const start = subDays(end, 90);
    const params = new URLSearchParams({
      parameters: 'T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_PAR_TOT',
      community: 'AG',
      longitude: lng.toFixed(4),
      latitude: lat.toFixed(4),
      start: formatNASADate(start),
      end: formatNASADate(end),
      format: 'JSON',
    });

    const controller = new AbortController();

    fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`, {
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        const raw = json.properties.parameter as NASAPowerDaily;

        // Clean sentinel values
        const daily: NASAPowerDaily = {
          T2M_MAX: cleanSeries(raw.T2M_MAX),
          T2M_MIN: cleanSeries(raw.T2M_MIN),
          PRECTOTCORR: cleanSeries(raw.PRECTOTCORR),
          RH2M: cleanSeries(raw.RH2M),
          ALLSKY_SFC_PAR_TOT: cleanSeries(raw.ALLSKY_SFC_PAR_TOT ?? {}),
        };

        const detected = detectStressEvents(daily);
        const newResult: NASAClimateResult = {
          status: 'success',
          daily,
          ...detected,
        };

        setResult(newResult);

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: newResult }));
        } catch {
          // ignore storage quota errors
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        const status: NASAFetchStatus = navigator.onLine ? 'error' : 'offline';
        setResult(r => ({ ...r, status }));
      });

    return () => controller.abort();
  }, [lat, lng]);

  return result;
}
