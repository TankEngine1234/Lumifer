import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DemoPhase, FieldZone, NPKResult, ProcessingResult } from './types';
import { getNextPhase, getPhaseDelay } from './animations/demoSequence';
import { useNASAPower } from './hooks/useNASAPower';
import { useFieldZones } from './hooks/useFieldZones';
import GradientBackground from './components/ui/GradientBackground';
import Logo from './components/ui/Logo';
import FarmSetup from './components/FarmSetup';
import FieldMapView from './components/fieldmap/FieldMapView';
import CameraView from './components/capture/CameraView';
import AnalysisOverlay from './components/analysis/AnalysisOverlay';
import SpectralHeatmap from './components/analysis/SpectralHeatmap';
import ResultsView from './components/results/ResultsView';
import NASAContextView from './components/context/NASAContextView';
import DashboardSidebar from './components/dashboard/DashboardSidebar';

function App() {
  const [phase, setPhase] = useState<DemoPhase>('splash');
  const [setupDone, setSetupDone] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [npkResult, setNpkResult] = useState<NPKResult | null>(null);
  const [selectedFieldZone, setSelectedFieldZone] = useState<FieldZone | null>(null);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDemo = new URLSearchParams(window.location.search).has('demo');

  const { zones, polygons, center, zoom, status: zonesStatus, region } = useFieldZones();
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

  const advanceTo = useCallback((next: DemoPhase) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setPhase(next);
  }, []);

  const handleCapture = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    advanceTo('captured');
    transitionTimerRef.current = setTimeout(() => advanceTo('analyzing'), 500);
  }, [advanceTo]);

  const handleProcessingComplete = useCallback((result: ProcessingResult) => {
    setProcessingResult(result);
  }, []);

  const handleInferenceComplete = useCallback((result: NPKResult) => {
    setNpkResult(result);
  }, []);

  const handleFieldZoneSelect = useCallback((zone?: FieldZone) => {
    setSelectedFieldZone(zone ?? null);
  }, []);

  const handleScanLeaf = useCallback(() => {
    advanceTo('capture');
  }, [advanceTo]);

  // Hidden escape hatch: triple-tap top-right to skip to results
  const [tapCount, setTapCount] = useState(0);
  useEffect(() => {
    if (tapCount >= 3) {
      setTapCount(0);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
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

  // Is the results phase active (show sidebar layout)?
  const showSidebarLayout = phase === 'results' && npkResult;

  return (
    <GradientBackground phase={phase}>
      {/* Escape hatch tap zone */}
      <div
        className="fixed top-0 right-0 w-16 h-16 z-50 cursor-default"
        onClick={() => setTapCount(c => c + 1)}
      />

      {/* ── Sidebar + Results layout ── */}
      {showSidebarLayout ? (
        <div className="absolute inset-0 flex">
          {/* Fixed-width sidebar */}
          <motion.div
            className="shrink-0 h-full overflow-hidden"
            style={{ width: 380 }}
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <DashboardSidebar result={npkResult} />
          </motion.div>

          {/* Main content area */}
          <div className="flex-1 relative overflow-hidden">
            <ResultsView
              key="results-with-sidebar"
              result={npkResult}
              onNASAContext={() => advanceTo('context')}
            />
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {phase === 'splash' && (
            <Logo key="splash" onComplete={() => !isDemo && advanceTo('fieldmap')} />
          )}

          {phase === 'fieldmap' && !setupDone && (
            <FarmSetup key="setup" onComplete={() => setSetupDone(true)} />
          )}

          {phase === 'fieldmap' && setupDone && (
            <FieldMapView
              key="fieldmap"
              zones={zones}
              polygons={polygons}
              center={center}
              zoom={zoom}
              zonesLoading={zonesStatus === 'loading'}
              region={region}
              initialZone={selectedFieldZone}
              onZoneSelect={handleFieldZoneSelect}
              onScanLeaf={handleScanLeaf}
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
              initialZone={selectedFieldZone}
              selectedZone
              onZoneSelect={handleFieldZoneSelect}
              onScanLeaf={handleScanLeaf}
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
      )}
    </GradientBackground>
  );
}

export default App;
