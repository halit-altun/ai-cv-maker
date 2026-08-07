import { authFetch } from '@/lib/auth/authFetch';
import type { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';
import type { SavedCvRecord } from '@/features/my-cvs/types';
import { appRoutes, getEditCvPath } from '@/features/dashboard/constants/routes';

export type CvApiItem = {
  id: string;
  clientId: string;
  displayTitle: string;
  strengthPercent: number;
  badge: 'recently-edited' | null;
  previewImageUrl: string;
  data: CompanyBasedCVData;
  createdAt?: string;
  updatedAt?: string;
};

function formatLastModified(value?: string): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function mapCvToSavedRecord(item: CvApiItem): SavedCvRecord {
  return {
    id: item.id,
    displayTitle: item.displayTitle,
    lastModifiedLabel: formatLastModified(item.updatedAt),
    strengthPercent: item.strengthPercent || 0,
    badge: item.badge,
    previewImageUrl: item.previewImageUrl || '',
    data: item.data,
    editHref: getEditCvPath(item.id),
    optimizeHref: appRoutes.aiOptimizer,
  };
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function throwApiError(data: Record<string, unknown>, fallback: string): never {
  throw new Error(
    typeof data.message === 'string' && data.message.trim()
      ? data.message
      : fallback
  );
}

export async function listCvsRequest(): Promise<SavedCvRecord[]> {
  const response = await authFetch('/api/cvs', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV listesi alınamadı.');
  }

  const items = Array.isArray(data.items) ? (data.items as CvApiItem[]) : [];
  return items.map(mapCvToSavedRecord);
}

export async function getCvRequest(id: string): Promise<CvApiItem | null> {
  const response = await authFetch(`/api/cvs/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (response.status === 404) return null;
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV alınamadı.');
  }
  return (data.item as CvApiItem) || null;
}

export async function createCvRequest(payload: {
  data: CompanyBasedCVData;
  displayTitle?: string;
  strengthPercent?: number;
  previewImageUrl?: string;
}): Promise<CvApiItem> {
  const response = await authFetch('/api/cvs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV kaydedilemedi.');
  }
  return data.item as CvApiItem;
}

export async function updateCvRequest(
  id: string,
  payload: {
    data?: CompanyBasedCVData;
    displayTitle?: string;
    strengthPercent?: number;
    previewImageUrl?: string;
    badge?: 'recently-edited' | null;
  }
): Promise<CvApiItem> {
  const response = await authFetch(`/api/cvs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV güncellenemedi.');
  }
  return data.item as CvApiItem;
}

export async function deleteCvRequest(id: string): Promise<void> {
  const response = await authFetch(`/api/cvs/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV silinemedi.');
  }
}
