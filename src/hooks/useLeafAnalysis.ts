import { useState, useCallback } from 'react';
import type { LeafAnalysisResult, LeafAnalysisStatus } from '../types';

export function useLeafAnalysis() {
  const [status, setStatus] = useState<LeafAnalysisStatus>('idle');
  const [result, setResult] = useState<LeafAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (imageDataUrl: string, fieldId?: string) => {
    setStatus('loading');
    setResult(null);
    setError(null);

    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      setError('Invalid image format');
      setStatus('error');
      return;
    }
    const [, mediaType, imageBase64] = match;

    try {
      const res = await fetch('http://localhost:3001/api/analyze-leaf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType, fieldId }),
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('Image is too large. Try a smaller or compressed photo.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data: LeafAnalysisResult = await res.json();
      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, analyze, reset };
}
