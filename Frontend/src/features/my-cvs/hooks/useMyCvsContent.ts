'use client';

import { useEffect, useState } from 'react';
import { listCvsRequest } from '@/lib/cv/api';
import { getDashboardInsightsRequest } from '@/lib/dashboard/api';
import type { AiRecommendation, SavedCvRecord, VisibilityInsightBar } from '../types';

/**
 * My CVs — CV listesi + insights tamamen API'den.
 */
export function useMyCvsContent() {
  const [cvs, setCvs] = useState<SavedCvRecord[]>([]);
  const [visibility, setVisibility] = useState<VisibilityInsightBar[]>([]);
  const [recommendation, setRecommendation] = useState<AiRecommendation>({
    title: '',
    body: '',
    ctaLabel: '',
    ctaHref: '#',
    relatedCvId: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [items, insights] = await Promise.all([
          listCvsRequest(),
          getDashboardInsightsRequest(),
        ]);
        if (cancelled) return;
        setCvs(items);
        setVisibility(insights.visibility);
        setRecommendation(insights.recommendation);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Veriler alınamadı.');
          setCvs([]);
          setVisibility([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    cvs,
    loading,
    error,
    visibility,
    recommendation,
  };
}
