import type { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';
import { getSavedCvs } from '@/features/my-cvs/data/mockCvs';

/** Dummy store — ileride DB/API */
export function getCvById(id: string): CompanyBasedCVData | null {
  const record = getSavedCvs().find((cv) => cv.id === id);
  return record?.data ?? null;
}
