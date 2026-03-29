import type { HistoryScan } from '../types';

/**
 * Mock scan history for the last 30 days.
 *
 * Scenario: Days 1–9 show stable health. Days 10–19 have a steady
 * nitrogen decline (from ~72 → 28), triggering "Diminishing Health".
 * Days 20–30 show partial recovery after intervention.
 */

function makeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function healthScore(n: number, p: number, k: number): number {
  return Math.round((n + p + k) / 3);
}

const raw: Array<Omit<HistoryScan, 'scan_id' | 'overall_health_score'>> = [
  // Days 30–22: stable, healthy baseline
  { timestamp: makeDate(30), nitrogen_grade: 78, phosphorus_grade: 74, potassium_grade: 70, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(29), nitrogen_grade: 76, phosphorus_grade: 72, potassium_grade: 71, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(28), nitrogen_grade: 77, phosphorus_grade: 75, potassium_grade: 69, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(27), nitrogen_grade: 74, phosphorus_grade: 73, potassium_grade: 72, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(26), nitrogen_grade: 75, phosphorus_grade: 71, potassium_grade: 68, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(25), nitrogen_grade: 73, phosphorus_grade: 74, potassium_grade: 70, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(24), nitrogen_grade: 76, phosphorus_grade: 72, potassium_grade: 71, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(23), nitrogen_grade: 74, phosphorus_grade: 70, potassium_grade: 69, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(22), nitrogen_grade: 72, phosphorus_grade: 73, potassium_grade: 70, leaf_image_snippet: '🌿' },

  // Days 21–12: nitrogen decline (72 → 28) — "Diminishing Health" zone
  { timestamp: makeDate(21), nitrogen_grade: 70, phosphorus_grade: 71, potassium_grade: 68, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(20), nitrogen_grade: 65, phosphorus_grade: 70, potassium_grade: 67, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(19), nitrogen_grade: 60, phosphorus_grade: 69, potassium_grade: 66, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(18), nitrogen_grade: 55, phosphorus_grade: 68, potassium_grade: 65, leaf_image_snippet: '🍂' },
  { timestamp: makeDate(17), nitrogen_grade: 50, phosphorus_grade: 67, potassium_grade: 64, leaf_image_snippet: '🍂' },
  { timestamp: makeDate(16), nitrogen_grade: 45, phosphorus_grade: 68, potassium_grade: 63, leaf_image_snippet: '🍂' },
  { timestamp: makeDate(15), nitrogen_grade: 40, phosphorus_grade: 66, potassium_grade: 62, leaf_image_snippet: '🍂' },
  { timestamp: makeDate(14), nitrogen_grade: 35, phosphorus_grade: 65, potassium_grade: 61, leaf_image_snippet: '🍁' },
  { timestamp: makeDate(13), nitrogen_grade: 30, phosphorus_grade: 64, potassium_grade: 60, leaf_image_snippet: '🍁' },
  { timestamp: makeDate(12), nitrogen_grade: 28, phosphorus_grade: 63, potassium_grade: 59, leaf_image_snippet: '🍁' },

  // Days 11–1: partial recovery after urea application
  { timestamp: makeDate(11), nitrogen_grade: 30, phosphorus_grade: 64, potassium_grade: 60, leaf_image_snippet: '🍁' },
  { timestamp: makeDate(10), nitrogen_grade: 34, phosphorus_grade: 65, potassium_grade: 61, leaf_image_snippet: '🍁' },
  { timestamp: makeDate(9),  nitrogen_grade: 38, phosphorus_grade: 66, potassium_grade: 62, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(8),  nitrogen_grade: 42, phosphorus_grade: 67, potassium_grade: 63, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(7),  nitrogen_grade: 47, phosphorus_grade: 68, potassium_grade: 64, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(6),  nitrogen_grade: 51, phosphorus_grade: 69, potassium_grade: 65, leaf_image_snippet: '🍃' },
  { timestamp: makeDate(5),  nitrogen_grade: 55, phosphorus_grade: 70, potassium_grade: 66, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(4),  nitrogen_grade: 58, phosphorus_grade: 71, potassium_grade: 67, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(3),  nitrogen_grade: 61, phosphorus_grade: 72, potassium_grade: 68, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(2),  nitrogen_grade: 63, phosphorus_grade: 73, potassium_grade: 69, leaf_image_snippet: '🌿' },
  { timestamp: makeDate(1),  nitrogen_grade: 65, phosphorus_grade: 74, potassium_grade: 70, leaf_image_snippet: '🌿' },
];

export const scanHistory: HistoryScan[] = raw.map((entry, i) => ({
  scan_id: `scan-${String(i + 1).padStart(3, '0')}`,
  overall_health_score: healthScore(entry.nitrogen_grade, entry.phosphorus_grade, entry.potassium_grade),
  ...entry,
}));
