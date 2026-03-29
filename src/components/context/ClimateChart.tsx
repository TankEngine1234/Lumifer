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
  { label: '90 days', color: 'bg-[#2D5A27]' },
  { label: '30 days', color: 'bg-[#4A7A44]' },
  { label: '14 days', color: 'bg-[#6B9165]' },
];

export default function ClimateChart({ climate }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState('90 days');

  if (!climate.daily) return null;

  const { T2M_MAX, T2M_MIN, PRECTOTCORR } = climate.daily;
  const allDates = Object.keys(T2M_MAX).sort();
  if (allDates.length === 0) return null;

  const sliceCount = selectedPeriod === '14 days' ? 14 : selectedPeriod === '30 days' ? 30 : 90;
  const dates = allDates.slice(-sliceCount);

  const tmaxVals = dates.map(d => T2M_MAX[d]);
  const tminVals = dates.map(d => T2M_MIN[d]);
  const precipVals = dates.map(d => PRECTOTCORR[d]);
  const labels = dates.map(dateLabel);
  const tMax = Math.max(...tmaxVals);

  const peakTemp = Math.max(...tmaxVals).toFixed(1);
  const avgTemp = (tmaxVals.reduce((a, b) => a + b, 0) / tmaxVals.length).toFixed(1);
  const totalRain = precipVals.reduce((a, b) => a + b, 0).toFixed(0);

  const graphData: LineGraphData = {
    dates: labels,
    series: [
      {
        label: 'Tmax',
        values: tmaxVals,
        color: '#2D5A27',
        dotColor: 'rgba(45,90,39,0.9)',
      },
      {
        label: 'Tmin',
        values: tminVals,
        color: 'rgba(45,90,39,0.42)',
        dotColor: 'rgba(45,90,39,0.55)',
      },
    ],
    metrics: [
      { label: 'Peak temp', value: `${peakTemp}°C`, color: 'border-[#111111]', accent: '#111111' },
      { label: 'Avg temp', value: `${avgTemp}°C`, color: 'border-[#2D5A27]', accent: '#2D5A27' },
      { label: 'Total rain', value: `${totalRain}mm`, color: 'border-[#4A7A44]', accent: '#4A7A44' },
    ],
  };

  const highlightBands: { startIdx: number; endIdx: number; color: string }[] = [];
  let bandStart = -1;
  dates.forEach((date, i) => {
    if (T2M_MAX[date] > 34) {
      if (bandStart === -1) bandStart = i;
    } else if (bandStart !== -1) {
      highlightBands.push({ startIdx: bandStart, endIdx: i - 1, color: 'rgba(17,17,17,0.06)' });
      bandStart = -1;
    }
  });
  if (bandStart !== -1) {
    highlightBands.push({ startIdx: bandStart, endIdx: dates.length - 1, color: 'rgba(17,17,17,0.06)' });
  }

  const showThreshold = tMax > 30;

  return (
    <LineGraphStatistics
      title="Climate Data"
      subtitle={`NASA POWER • Brazos County TX • ${sliceCount}-day window`}
      periods={PERIODS}
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
      data={graphData}
      barSeries={{
        values: precipVals,
        rainColor: 'rgba(74,122,68,0.76)',
        dryColor: 'rgba(17,17,17,0.08)',
        rainThreshold: 1.0,
        label: 'Precip (mm)',
      }}
      thresholdLine={showThreshold ? {
        value: 34,
        label: '34°C stress',
        color: '#111111',
      } : undefined}
      highlightBands={highlightBands}
    />
  );
}
