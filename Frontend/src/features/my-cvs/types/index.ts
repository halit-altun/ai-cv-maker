import type { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';

/** Liste kartı için badge / durum */
export type CvListBadge = 'recently-edited' | null;

/**
 * Kaydedilmiş CV kaydı — ileride DB entity ile birebir map edilecek.
 * `data` alanı mevcut CV form parametrelerini (CompanyBasedCVData) taşır.
 */
export interface SavedCvRecord {
  id: string;
  /** Kart başlığı (ör. Senior Product Designer) */
  displayTitle: string;
  lastModifiedLabel: string;
  strengthPercent: number;
  badge: CvListBadge;
  previewImageUrl: string;
  /** Tam CV formu verisi — dummy şimdilik, sonra API/DB */
  data: CompanyBasedCVData;
  editHref: string;
  optimizeHref: string;
}

export interface VisibilityInsightBar {
  id: string;
  dayLabel: string;
  heightPercent: number;
  highlighted?: boolean;
}

export interface AiRecommendation {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  relatedCvId: string;
}
