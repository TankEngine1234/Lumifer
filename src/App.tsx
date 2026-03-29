import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { DemoPhase, NPKResult, ProcessingResult, HistoryScan } from './types';
import { getNextPhase, getPhaseDelay } from './animations/demoSequence';
import { useNASAPower } from './hooks/useNASAPower';
import { useFieldZones } from './hooks/useFieldZones';
import { scanHistory } from './data/scanHistory';
import GradientBackground from './components/ui/GradientBackground';
import Logo from './components/ui/Logo';
import FieldMapView from './components/fieldmap/FieldMapView';
import CameraView from './components/capture/CameraView';
import AnalysisOverlay from './components/analysis/AnalysisOverlay';
import SpectralHeatmap from './components/analysis/SpectralHeatmap';
import ResultsView from './components/results/ResultsView';
import NASAContextView from './components/context/NASAContextView';
import HistorySidebar from './components/history/HistorySidebar';

function App() {
  const [phase, setPhase] = useState<DemoPhase>('splash');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [npkResult, setNpkResult] = useState<NPKResult | null>(null);
  const [selectedHistoryScanId, setSelectedHistoryScanId] = useState<string | null>(null);

  // 🛡️ FIX: Reference to clear rogue timeouts during manual overrides
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for demo mode via query param
  const isDemo = new URLSearchParams(window.location.search).has('demo');

  // Load GEE-derived field zones from public/field-zones.json (falls back to hardcoded on error)
  const { zones, polygons, center, zoom, status: zonesStatus, region } = useFieldZones();

  // Pre-fetch NASA POWER data — center updates once field-zones.json resolves (Imperial Valley)
  const nasaClimate = useNASAPower(center[1], center[0]);

  // Auto-advance in demo mode
  useEffect(() => {
    if (!isDemo) return;

    const delay = getPhaseDelay(phase);
    if (delay <= 0) return;

    transitionTimerRef.current = setTimeout(() => {
      const next = getNextPhase(phase);
      if (next) setPhase(next);
    }, delay);

    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [phase, isDemo]);

  // Manual phase advancement
  const advanceTo = useCallback((next: DemoPhase) => {
    // Clear any pending auto-transitions if the user takes manual control
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setPhase(next);
  }, []);

  const handleCapture = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    advanceTo('captured');

    // Simulate processing delay safely
    transitionTimerRef.current = setTimeout(() => advanceTo('analyzing'), 500);
  }, [advanceTo]);

  const handleProcessingComplete = useCallback((result: ProcessingResult) => {
    setProcessingResult(result);
  }, []);

  const handleInferenceComplete = useCallback((result: NPKResult) => {
    setNpkResult(result);
  }, []);

  // Convert a historical scan (0–100 grades) to NPKResult (0–1 confidence)
  const handleSelectHistoryScan = useCallback((scan: HistoryScan) => {
    setSelectedHistoryScanId(scan.scan_id);
    const toConf = (grade: number) => (100 - grade) / 100; // high grade = low deficiency confidence
    const getLevel = (conf: number) =>
      conf > 0.5 ? 'deficient' as const : conf > 0.2 ? 'adequate' as const : 'optimal' as const;
    const nConf = toConf(scan.nitrogen_grade);
    const pConf = toConf(scan.phosphorus_grade);
    const kConf = toConf(scan.potassium_grade);
    const maxConf = Math.max(nConf, pConf, kConf);
    const severity = maxConf > 0.7 ? 'severe' as const : maxConf > 0.4 ? 'moderate' as const : 'low' as const;
    setNpkResult({
      nitrogen: { confidence: nConf, level: getLevel(nConf) },
      phosphorus: { confidence: pConf, level: getLevel(pConf) },
      potassium: { confidence: kConf, level: getLevel(kConf) },
      severity,
      yieldImpact: Math.round(maxConf * 40),
    });
    advanceTo('results');
  }, [advanceTo]);

  // Hidden escape hatch: triple-tap top-right to skip to results
  const [tapCount, setTapCount] = useState(0);
  useEffect(() => {
    if (tapCount >= 3) {
      setTapCount(0);
      // 🛡️ FIX: Clear any pending transitions so it doesn't yank us back
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      
      // 🛡️ FIX: Math-aligned mock data (0.65 maps perfectly to 'moderate')
      setNpkResult({
        nitrogen: { confidence: 0.65, level: 'deficient' },
        phosphorus: { confidence: 0.34, level: 'adequate' },
        potassium: { confidence: 0.45, level: 'adequate' },
        severity: 'moderate',
        yieldImpact: 23,
      });
      setPhase('results');
    }
    const timer = setTimeout(() => setTapCount(0), 1000);
    return () => clearTimeout(timer);
  }, [tapCount]);

  return (
    <GradientBackground phase={phase}>
      {/* Escape hatch tap zone */}
      <div
        className="fixed top-0 right-0 w-16 h-16 z-50 cursor-default"
        onClick={() => setTapCount(c => c + 1)}
      />

      <AnimatePresence mode="wait">
        {phase === 'splash' && (
          <Logo key="splash" onComplete={() => !isDemo && advanceTo('fieldmap')} />
        )}

        {phase === 'fieldmap' && (
          <FieldMapView
            key="fieldmap"
            zones={zones}
            polygons={polygons}
            center={center}
            zoom={zoom}
            zonesLoading={zonesStatus === 'loading'}
            region={region}
            onZoneSelect={() => advanceTo('zone')}
          />
        )}

        {phase === 'zone' && (
          <FieldMapView
            key="zone"
            zones={zones}
            polygons={polygons}
            center={center}
            zoom={zoom}
            zonesLoading={zonesStatus === 'loading'}
            region={region}
            selectedZone
            onScanLeaf={() => advanceTo('capture')}
          />
        )}

        {(phase === 'capture' || phase === 'lock') && (
          <CameraView
            key="capture"
            isLocked={phase === 'lock'}
            onCapture={handleCapture}
            onLock={() => advanceTo('lock')}
          />
        )}

        {(phase === 'captured' || phase === 'analyzing') && (
          <AnalysisOverlay
            key="analyzing"
            capturedImage={capturedImage}
            phase={phase}
            onProcessingComplete={handleProcessingComplete}
            onInferenceComplete={handleInferenceComplete}
            onHeatmapReady={() => advanceTo('heatmap')}
          />
        )}

        {phase === 'heatmap' && (
          <SpectralHeatmap
            key="heatmap"
            capturedImage={capturedImage}
            processingResult={processingResult}
            onComplete={() => advanceTo('results')}
          />
        )}

        {phase === 'results' && npkResult && (
          <ResultsView
            key="results"
            result={npkResult}
            onNASAContext={() => advanceTo('context')}
          />
        )}

        {phase === 'context' && npkResult && (
          <NASAContextView
            key="context"
            npkResult={npkResult}
            climate={nasaClimate}
            onComplete={() => advanceTo('splash')}
          />
        )}
      </AnimatePresence>

    </GradientBackground>
  );
}

export default App;
