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
  CRITICAL: { bg: 'rgba(185,28,28,0.2)',  text: '#fca5a5', label: 'CRITICAL' },
  HIGH:     { bg: 'rgba(220,38,38,0.15)', text: '#f87171', label: 'HIGH' },
  MEDIUM:   { bg: 'rgba(217,119,6,0.15)', text: '#fbbf24', label: 'MEDIUM' },
  LOW:      { bg: 'rgba(22,163,74,0.15)', text: '#4ade80', label: 'LOW — Looks Healthy' },
};

const CONF_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#4ade80',
};

function ResultDisplay({ result }: { result: LeafAnalysisResult }) {
  const urgency = URGENCY_STYLES[result.urgency] ?? URGENCY_STYLES.MEDIUM;
  return (
    <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1">
      {/* Urgency badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: urgency.bg }}>
        <AlertTriangle size={14} style={{ color: urgency.text }} />
        <span className="text-[12px] font-bold tracking-wide" style={{ color: urgency.text }}>
          {urgency.label}
        </span>
      </div>

      {/* Assessment */}
      <div>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Assessment</p>
        <p className="text-[13px] text-white/80 leading-relaxed">{result.assessment}</p>
      </div>

      {/* Symptoms */}
      {result.symptoms.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Symptoms Observed</p>
          <ul className="flex flex-col gap-1">
            {result.symptoms.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-white/70">
                <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deficiencies */}
      {result.deficiencies.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Likely Issues</p>
          <div className="flex flex-wrap gap-1.5">
            {result.deficiencies.map((d, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${CONF_COLORS[d.confidence]}40`, color: CONF_COLORS[d.confidence] }}
              >
                {d.name}
                <span className="ml-1 text-[9px] opacity-60">{d.confidence}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Recommendations</p>
          <ol className="flex flex-col gap-1.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-white/70">
                <CheckCircle2 size={13} className="text-green-400 mt-0.5 shrink-0" />
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

  const panelStyle = {
    background: 'rgba(10,10,10,0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl px-5 pt-4 pb-8"
      style={panelStyle}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
    >
      {/* Handle + header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            {fieldLabel ? `Field ${fieldLabel}` : 'Leaf Analysis'}
          </p>
          <h3 className="text-[15px] font-semibold text-white leading-tight">AI Crop Diagnosis</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <X size={14} className="text-white/60" />
        </button>
      </div>

      {/* Body */}
      {status === 'idle' && (
        <div className="flex flex-col gap-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-6 gap-2 transition-colors"
            style={{
              borderColor: dragging ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.15)',
              background: dragging ? 'rgba(74,222,128,0.05)' : preview ? 'transparent' : 'rgba(255,255,255,0.03)',
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-36 rounded-lg object-contain" />
            ) : (
              <>
                <Upload size={22} className="text-white/30" />
                <p className="text-[12px] text-white/40">Drop a leaf photo or tap to upload</p>
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

          <div className="flex gap-2">
            {onScanLeaf && (
              <button
                onClick={onScanLeaf}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/60 flex-1 justify-center"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <Camera size={14} />
                Use Camera
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!preview}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-opacity"
              style={{
                background: preview ? '#16a34a' : 'rgba(255,255,255,0.1)',
                color: preview ? 'white' : 'rgba(255,255,255,0.3)',
                cursor: preview ? 'pointer' : 'not-allowed',
              }}
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={28} className="text-green-400 animate-spin" />
          <p className="text-[13px] text-white/50">Analyzing with Claude AI…</p>
        </div>
      )}

      {status === 'success' && result && (
        <div className="flex flex-col gap-3">
          <ResultDisplay result={result} />
          <button
            onClick={() => { reset(); setPreview(null); }}
            className="mt-1 py-2 rounded-lg text-[12px] font-medium text-white/40"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Analyze Another Photo
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-[13px] text-red-300 text-center">{error}</p>
          <button
            onClick={() => { reset(); setPreview(null); }}
            className="px-4 py-2 rounded-lg text-[12px] font-medium text-white/60"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            Try Again
          </button>
        </div>
      )}
    </motion.div>
  );
}
