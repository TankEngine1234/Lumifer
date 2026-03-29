import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useLeafAnalysis } from '../../hooks/useLeafAnalysis';
import type { LeafAnalysisResult } from '../../types';

interface Props {
  fieldId?: string;
  fieldLabel?: string;
  onClose: () => void;
  onScanLeaf?: () => void;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: 'rgba(17,17,17,0.08)', text: '#111111', label: 'CRITICAL' },
  HIGH: { bg: 'rgba(45,90,39,0.12)', text: '#2D5A27', label: 'HIGH' },
  MEDIUM: { bg: 'rgba(74,122,68,0.12)', text: '#4A7A44', label: 'MEDIUM' },
  LOW: { bg: 'rgba(107,145,101,0.12)', text: '#6B9165', label: 'LOW — Looks Healthy' },
};

const CONF_COLORS: Record<string, string> = {
  high: '#111111',
  medium: '#2D5A27',
  low: '#6B9165',
};

function ResultDisplay({ result }: { result: LeafAnalysisResult }) {
  const urgency = URGENCY_STYLES[result.urgency] ?? URGENCY_STYLES.MEDIUM;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-1">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: urgency.bg }}>
        <AlertTriangle size={16} style={{ color: urgency.text }} />
        <span className="text-sm font-extrabold tracking-wide" style={{ color: urgency.text }}>
          {urgency.label}
        </span>
      </div>

      <div>
        <p className="section-label mb-2">Assessment</p>
        <p className="app-text" style={{ lineHeight: 1.55 }}>{result.assessment}</p>
      </div>

      {result.symptoms.length > 0 && (
        <div>
          <p className="section-label mb-2">Symptoms Observed</p>
          <ul className="flex flex-col gap-2">
            {result.symptoms.map((s, i) => (
              <li key={i} className="flex items-start gap-2 app-text">
                <span style={{ color: '#2D5A27', marginTop: 2 }}>•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.deficiencies.length > 0 && (
        <div>
          <p className="section-label mb-2">Likely Issues</p>
          <div className="flex flex-wrap gap-2">
            {result.deficiencies.map((d, i) => (
              <span
                key={i}
                className="px-3 py-2 rounded-full text-sm font-bold"
                style={{
                  background: `${CONF_COLORS[d.confidence]}12`,
                  border: `1px solid ${CONF_COLORS[d.confidence]}22`,
                  color: CONF_COLORS[d.confidence],
                }}
              >
                {d.name}
                <span className="ml-1 opacity-70 text-xs">{d.confidence}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <p className="section-label mb-2">Recommendations</p>
          <ol className="flex flex-col gap-2">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 app-text">
                <CheckCircle2 size={16} style={{ color: '#2D5A27', marginTop: 2 }} className="shrink-0" />
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function LeafAnalysisPanel({ fieldId, fieldLabel, onClose, onScanLeaf }: Props) {
  const { status, result, error, analyze, reset } = useLeafAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = useCallback(() => {
    if (preview) analyze(preview, fieldId);
  }, [preview, analyze, fieldId]);

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[24px] px-4 pt-4 pb-8"
      style={{
        background: '#F5F5F5',
        borderTop: '1px solid rgba(17,17,17,0.08)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
      }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
    >
      <div className="w-full max-w-[480px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label">
              {fieldLabel ? `Field ${fieldLabel}` : 'Leaf Analysis'}
            </p>
            <h3 className="text-[24px] font-extrabold" style={{ color: '#111111' }}>
              AI Crop Diagnosis
            </h3>
          </div>
          <button
            onClick={onClose}
            className="app-button-secondary"
            style={{ width: 48, height: 48, padding: 0, borderRadius: '999px' }}
          >
            <X size={18} />
          </button>
        </div>

        {status === 'idle' && (
          <div className="app-section">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="app-card cursor-pointer flex flex-col items-center justify-center py-8 px-4 transition-colors"
              style={{
                border: `2px dashed ${dragging ? '#2D5A27' : '#CCCCCC'}`,
                background: preview ? '#FFFFFF' : dragging ? 'rgba(45,90,39,0.05)' : '#FFFFFF',
              }}
            >
              {preview ? (
                <img src={preview} alt="preview" className="max-h-48 rounded-xl object-contain" />
              ) : (
                <>
                  <Upload size={24} style={{ color: '#2D5A27' }} />
                  <p className="app-text mt-3 text-center">Drop a leaf photo or tap to upload</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            <div className="flex gap-3">
              {onScanLeaf && (
                <button
                  onClick={onScanLeaf}
                  className="app-button-secondary flex-1"
                >
                  <Camera size={16} />
                  Use Camera
                </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={!preview}
                className="app-button-primary app-button-cta flex-1"
                style={{ width: 'auto', padding: '14px 20px', fontSize: 16, borderRadius: 12 }}
              >
                Analyze
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="app-card p-8 flex flex-col items-center gap-4">
            <Loader2 size={30} className="animate-spin" style={{ color: '#2D5A27' }} />
            <p className="app-text">Analyzing with Claude AI...</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="app-section">
            <div className="app-card p-5">
              <ResultDisplay result={result} />
            </div>
            <button
              onClick={() => { reset(); setPreview(null); }}
              className="app-button-secondary"
            >
              Analyze Another Photo
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="app-card p-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle size={28} style={{ color: '#111111' }} />
            <p className="app-text">{error}</p>
            <button
              onClick={() => { reset(); setPreview(null); }}
              className="app-button-secondary"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
