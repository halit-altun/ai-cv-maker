'use client';

import { useEffect, useState } from 'react';
import { getDashboardRequest, type DashboardContent } from '@/lib/dashboard/api';

const emptyContent: DashboardContent = {
  user: { name: '', accountLabel: '', avatarUrl: '' },
  welcome: { greeting: '', subtitle: '', stats: [] },
  aiInsight: {
    title: '',
    body: '',
    suggestionLabel: '',
    suggestionText: '',
    metrics: [],
    ctaLabel: '',
    ctaHref: '#',
  },
  profileScore: {
    score: 0,
    maxScore: 100,
    hint: '',
    ctaLabel: '',
    ctaHref: '#',
  },
  activity: [],
  visibility: [],
  recommendation: {
    title: '',
    body: '',
    ctaLabel: '',
    ctaHref: '#',
    relatedCvId: '',
  },
};

/**
 * Dashboard sayfa içeriği — GET /api/dashboard (JWT + client_id).
 */
export function useDashboardContent() {
  const [data, setData] = useState<DashboardContent>(emptyContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const payload = await getDashboardRequest();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Dashboard yüklenemedi.');
          setData(emptyContent);
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
    welcome: data.welcome,
    aiInsight: data.aiInsight,
    profileScore: data.profileScore,
    activity: data.activity,
    loading,
    error,
  };
}
