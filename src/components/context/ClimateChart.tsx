import { useState } from 'react';
import type { NASAClimateResult } from '../../types';
import LineGraphStatistics from '../ui/line-graph-statistics';
import type { LineGraphData, LineGraphPeriod } from '../ui/line-graph-statistics';

interface Props {
  climate: NASAClimateResult;
}

function dateLabel(dateStr: string): string {
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(4, 6)) - 1;
  const d = parseInt(dateStr.slice(6, 8));
  return new Date(y, m, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PERIODS: LineGraphPeriod[] = [
  { label: '90 days', color: 'bg-green-500' },
  { label: '30 days', color: 'bg-blue-400' },
  { label: '14 days', color: 'bg-orange-400' },
];

export default function ClimateChart({ climate }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState('90 days');

  if (!climate.daily) return null;

  const { T2M_MAX, T2M_MIN, PRECTOTCORR } = climate.daily;
  const allDates = Object.keys(T2M_MAX).sort();
  if (allDates.length === 0) return null;

  // Slice based on selected period
  const sliceCount = selectedPeriod === '14 days' ? 14 : selectedPeriod === '30 days' ? 30 : 90;
  const dates = allDates.slice(-sliceCount);

  const tmaxVals = dates.map(d => T2M_MAX[d]);
  const tminVals = dates.map(d => T2M_MIN[d]);
  const precipVals = dates.map(d => PRECTOTCORR[d]);
  const labels = dates.map(dateLabel);

  const tMax = Math.max(...tmaxVals);

  // Compute peak / avg for metrics
  const peakTemp = Math.max(...tmaxVals).toFixed(1);
  const avgTemp = (tmaxVals.reduce((a, b) => a + b, 0) / tmaxVals.length).toFixed(1);
  const totalRain = precipVals.reduce((a, b) => a + b, 0).toFixed(0);

  const graphData: LineGraphData = {
    dates: labels,
    series: [
      {
        label: 'Tmax',
        values: tmaxVals,
        color: '#ffffff',
        dotColor: 'rgba(255,255,255,0.8)',
      },
      {
        label: 'Tmin',
        values: tminVals,
        color: 'rgba(255,255,255,0.35)',
        dotColor: 'rgba(255,255,255,0.4)',
      },
    ],
    metrics: [
      { label: 'Peak temp', value: `${peakTemp}°C`, color: 'border-red-400/60' },
      { label: 'Avg temp', value: `${avgTemp}°C`, color: 'border-white/20' },
      { label: 'Total rain', value: `${totalRain}mm`, color: 'border-cyan-400/60' },
    ],
  };

  // Build highlight bands for heat days (T > 34°C)
  const highlightBands: { startIdx: number; endIdx: number; color: string }[] = [];
  let bandStart = -1;
  dates.forEach((date, i) => {
    if (T2M_MAX[date] > 34) {
      if (bandStart === -1) bandStart = i;
    } else {
      if (bandStart !== -1) {
        highlightBands.push({ startIdx: bandStart, endIdx: i - 1, color: 'rgba(239,68,68,0.13)' });
        bandStart = -1;
      }
    }
  });
  if (bandStart !== -1) {
    highlightBands.push({ startIdx: bandStart, endIdx: dates.length - 1, color: 'rgba(239,68,68,0.13)' });
  }

  // Threshold line only if relevant
  const showThreshold = tMax > 30;

  return (
    <LineGraphStatistics
      title="Climate Data"
      subtitle={`NASA POWER · Brazos County TX · ${sliceCount}-day window`}
      periods={PERIODS}
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
      data={graphData}
      barSeries={{
        values: precipVals,
        rainColor: 'rgba(6,182,212,0.75)',
        dryColor: 'rgba(255,255,255,0.06)',
        rainThreshold: 1.0,
        label: 'Precip (mm)',
      }}
      thresholdLine={showThreshold ? {
        value: 34,
        label: '34°C stress',
        color: '#ef4444',
      } : undefined}
      highlightBands={highlightBands}
    />
  );
}
