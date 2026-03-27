import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { DemoPhase, NPKResult, ProcessingResult } from './types';
import { getNextPhase, getPhaseDelay } from './animations/demoSequence';
import GradientBackground from './components/ui/GradientBackground';
import Badge from './components/ui/Badge';
import Logo from './components/ui/Logo';
import FieldMapView from './components/fieldmap/FieldMapView';
import CameraView from './components/capture/CameraView';
import AnalysisOverlay from './components/analysis/AnalysisOverlay';
import SpectralHeatmap from './components/analysis/SpectralHeatmap';
import ResultsView from './components/results/ResultsView';

function App() {
  const [phase, setPhase] = useState<DemoPhase>('splash');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [npkResult, setNpkResult] = useState<NPKResult | null>(null);

  // Check for demo mode via query param
  const isDemo = new URLSearchParams(window.location.search).has('demo');

  // Auto-advance in demo mode
  useEffect(() => {
    if (!isDemo) return;

    const delay = getPhaseDelay(phase);
    if (delay <= 0) return;

    const timer = setTimeout(() => {
      const next = getNextPhase(phase);
      if (next) setPhase(next);
    }, delay);

    return () => clearTimeout(timer);
  }, [phase, isDemo]);

  // Manual phase advancement
  const advanceTo = useCallback((next: DemoPhase) => {
    setPhase(next);
  }, []);

  const handleCapture = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    advanceTo('captured');

    // Simulate processing delay, then advance to analyzing
    setTimeout(() => advanceTo('analyzing'), 500);
  }, [advanceTo]);

  const handleProcessingComplete = useCallback((result: ProcessingResult) => {
    setProcessingResult(result);
  }, []);

  const handleInferenceComplete = useCallback((result: NPKResult) => {
    setNpkResult(result);
  }, []);

  // Hidden escape hatch: triple-tap top-right to skip to results
  const [tapCount, setTapCount] = useState(0);
  useEffect(() => {
    if (tapCount >= 3) {
      setTapCount(0);
      setNpkResult({
        nitrogen: { confidence: 0.82, level: 'deficient' },
        phosphorus: { confidence: 0.34, level: 'adequate' },
        potassium: { confidence: 0.71, level: 'deficient' },
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
        className="fixed top-0 right-0 w-16 h-16 z-50"
        onClick={() => setTapCount(c => c + 1)}
      />

      <AnimatePresence mode="wait">
        {phase === 'splash' && (
          <Logo key="splash" onComplete={() => !isDemo && advanceTo('fieldmap')} />
        )}

        {phase === 'fieldmap' && (
          <FieldMapView
            key="fieldmap"
            onZoneSelect={() => advanceTo('zone')}
          />
        )}

        {phase === 'zone' && (
          <FieldMapView
            key="zone"
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
          />
        )}
      </AnimatePresence>

      <Badge phase={phase} />
    </GradientBackground>
  );
}

export default App;
