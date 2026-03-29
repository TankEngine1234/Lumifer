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

const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File): Promise<string> {
  if (file.type === 'image/gif') {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to process image'));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      URL.revokeObjectURL(objectUrl);
      resolve(compressed);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load selected image'));
    };

    image.src = objectUrl;
  });
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: 'rgba(255,255,255,0.08)', text: '#FFFFFF', label: 'CRITICAL' },
  HIGH: { bg: 'rgba(45,90,39,0.2)', text: '#D9F6D0', label: 'HIGH' },
  MEDIUM: { bg: 'rgba(74,122,68,0.2)', text: '#E6FFD9', label: 'MEDIUM' },
  LOW: { bg: 'rgba(107,145,101,0.2)', text: '#E6FFD9', label: 'LOW - Looks Healthy' },
};

const CONF_COLORS: Record<string, string> = {
  high: '#FFFFFF',
  medium: '#9ED88E',
  low: '#D9F6D0',
};

function ResultDisplay({ result }: { result: LeafAnalysisResult }) {
  const urgency = URGENCY_STYLES[result.urgency] ?? URGENCY_STYLES.MEDIUM;

  return (
    <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: urgency.bg }}>
        <AlertTriangle size={16} style={{ color: urgency.text }} />
        <span className="text-sm font-extrabold tracking-wide" style={{ color: urgency.text }}>
          {urgency.label}
        </span>
      </div>

      <div>
        <p className="section-label mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>Assessment</p>
        <p className="app-text" style={{ lineHeight: 1.55, color: '#FFFFFF' }}>{result.assessment}</p>
      </div>

      {result.symptoms.length > 0 && (
        <div>
          <p className="section-label mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>Symptoms Observed</p>
          <ul className="flex flex-col gap-2">
            {result.symptoms.map((symptom, index) => (
              <li key={index} className="flex items-start gap-2 app-text" style={{ color: '#FFFFFF' }}>
                <span style={{ color: '#2D5A27', marginTop: 2 }}>*</span>
                {symptom}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.deficiencies.length > 0 && (
        <div>
          <p className="section-label mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>Likely Issues</p>
          <div className="flex flex-wrap gap-2">
            {result.deficiencies.map((deficiency, index) => (
              <span
                key={index}
                className="rounded-full px-3 py-2 text-sm font-bold"
                style={{
                  background: `${CONF_COLORS[deficiency.confidence]}12`,
                  border: `1px solid ${CONF_COLORS[deficiency.confidence]}22`,
                  color: CONF_COLORS[deficiency.confidence],
                }}
              >
                {deficiency.name}
                <span className="ml-1 text-xs opacity-70">{deficiency.confidence}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <p className="section-label mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>Recommendations</p>
          <ol className="flex flex-col gap-2">
            {result.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2 app-text" style={{ color: '#FFFFFF' }}>
                <CheckCircle2 size={16} style={{ color: '#2D5A27', marginTop: 2 }} className="shrink-0" />
                {recommendation}
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

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    reset();

    try {
      const dataUrl = await compressImageFile(file);
      setPreview(dataUrl);
    } catch {
      const fallback = await readFileAsDataUrl(file);
      setPreview(fallback);
    }
  }, [reset]);

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
      className="absolute inset-x-4 bottom-4 z-50 rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5 lg:inset-x-auto lg:right-6 lg:top-[152px] lg:bottom-6 lg:w-[min(33vw,440px)] lg:min-w-[360px] lg:px-6 lg:py-6"
      style={{
        background: 'rgba(5,8,5,0.96)',
        borderColor: 'rgba(45,90,39,0.9)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.42)',
        backdropFilter: 'blur(12px)',
      }}
      initial={{ opacity: 0, x: 24, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 18, y: 12 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col lg:max-w-none">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="section-label" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {fieldLabel ? `Field ${fieldLabel}` : 'Leaf Analysis'}
            </p>
            <h3 className="text-[24px] font-extrabold sm:text-[26px]" style={{ color: '#FFFFFF' }}>
              AI Crop Diagnosis
            </h3>
          </div>
          <button
            onClick={onClose}
            className="app-button-secondary"
            style={{
              width: 48,
              height: 48,
              padding: 0,
              borderRadius: '999px',
              background: '#111111',
              color: '#FFFFFF',
              border: '2px solid #2D5A27',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {status === 'idle' && (
          <div className="app-section flex flex-1 flex-col gap-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-5 py-10 transition-colors"
              style={{
                border: `2px dashed ${dragging ? '#2D5A27' : '#CCCCCC'}`,
                background: preview ? '#111111' : dragging ? 'rgba(45,90,39,0.14)' : 'rgba(255,255,255,0.04)',
              }}
            >
              {preview ? (
                <img src={preview} alt="preview" className="max-h-48 rounded-xl object-contain" />
              ) : (
                <>
                  <Upload size={24} style={{ color: '#2D5A27' }} />
                  <p className="app-text mt-3 text-center" style={{ color: '#FFFFFF' }}>Drop a leaf photo or tap to upload</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
            />

            <div className="flex flex-col gap-3">
              {onScanLeaf && (
                <button
                  onClick={onScanLeaf}
                  className="app-button-secondary flex-1"
                  style={{
                    background: '#111111',
                    color: '#FFFFFF',
                    border: '2px solid #2D5A27',
                  }}
                >
                  <Camera size={16} />
                  Use Camera
                </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={!preview}
                className="app-button-primary app-button-cta flex-1"
                style={{ width: 'auto', padding: '16px 20px', fontSize: 18, borderRadius: 14 }}
              >
                Analyze
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div
            className="flex flex-col items-center gap-4 rounded-[20px] border p-8"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(45,90,39,0.65)' }}
          >
            <Loader2 size={30} className="animate-spin" style={{ color: '#2D5A27' }} />
            <p className="app-text" style={{ color: '#FFFFFF' }}>Analyzing with Claude AI...</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="app-section flex flex-1 flex-col gap-4">
            <div
              className="rounded-[20px] border p-5"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(45,90,39,0.65)' }}
            >
              <ResultDisplay result={result} />
            </div>
            <button
              onClick={() => { reset(); setPreview(null); }}
              className="app-button-secondary"
              style={{
                background: '#111111',
                color: '#FFFFFF',
                border: '2px solid #2D5A27',
              }}
            >
              Analyze Another Photo
            </button>
          </div>
        )}

        {status === 'error' && (
          <div
            className="flex flex-col items-center gap-4 rounded-[20px] border p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(45,90,39,0.65)' }}
          >
            <AlertTriangle size={28} style={{ color: '#FFFFFF' }} />
            <p className="app-text" style={{ color: '#FFFFFF' }}>{error}</p>
            <button
              onClick={() => { reset(); setPreview(null); }}
              className="app-button-secondary"
              style={{
                background: '#111111',
                color: '#FFFFFF',
                border: '2px solid #2D5A27',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
