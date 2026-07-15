'use client';

import { useMemo } from 'react';
import {
  getSavedCvs,
  getVisibilityInsights,
  getAiRecommendation,
} from '../data/mockCvs';

/**
 * My CVs sayfa verisi.
 * Şimdilik dummy; ileride API / SWR / DB ile değiştirilir.
 */
export function useMyCvsContent() {
  return useMemo(
    () => ({
      cvs: getSavedCvs(),
      visibility: getVisibilityInsights(),
      recommendation: getAiRecommendation(),
    }),
    []
  );
}
