import type { DemoPhase } from '../types';

// Demo phase timing (in milliseconds from start)
// Total: 90 seconds
export const demoTimeline: { phase: DemoPhase; delay: number }[] = [
  { phase: 'splash', delay: 0 },
  { phase: 'fieldmap', delay: 3000 },
  { phase: 'zone', delay: 15000 },
  { phase: 'capture', delay: 18000 },
  { phase: 'lock', delay: 30000 },
  { phase: 'captured', delay: 32000 },
  { phase: 'analyzing', delay: 34000 },
  { phase: 'heatmap', delay: 40000 },
  { phase: 'results', delay: 47000 },
];

// Get the next phase in the sequence
export function getNextPhase(current: DemoPhase): DemoPhase | null {
  const phases: DemoPhase[] = [
    'splash', 'fieldmap', 'zone', 'capture', 'lock',
    'captured', 'analyzing', 'heatmap', 'results',
  ];
  const idx = phases.indexOf(current);
  if (idx === -1 || idx === phases.length - 1) return null;
  return phases[idx + 1];
}

// Get delay between current phase and next phase
export function getPhaseDelay(current: DemoPhase): number {
  const currentEntry = demoTimeline.find(e => e.phase === current);
  const nextPhase = getNextPhase(current);
  if (!nextPhase || !currentEntry) return 0;
  const nextEntry = demoTimeline.find(e => e.phase === nextPhase);
  if (!nextEntry) return 0;
  return nextEntry.delay - currentEntry.delay;
}
