import type { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';
import { getCvRequest } from '@/lib/cv/api';

/** DB/API üzerinden CV getirir */
export async function getCvById(id: string): Promise<CompanyBasedCVData | null> {
  const item = await getCvRequest(id);
  return item?.data ?? null;
}
