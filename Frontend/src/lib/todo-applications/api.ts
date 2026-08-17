import { authFetch } from '@/lib/auth/authFetch';
import type { EmailPrefixCategoryId } from '@/features/company-cv-optimizer/constants/outreachConstants';
import type { CompanyPageType } from '@/features/company-cv-optimizer/constants/outreachConstants';

export type TodoApplicationItem = {
  id: string;
  projectId: string;
  companyUrl: string;
  pageType: CompanyPageType | string;
  pageTypeOther?: string;
  emailDomainInput: string;
  companyName?: string;
  notes?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TodoJobMode = 'analyze_and_send' | 'analyze_only';

export type TodoJobItemStatus =
  | 'pending'
  | 'fetching'
  | 'analyzing'
  | 'sending'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type TodoJobStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TodoJobRecipientResult = {
  email: string;
  status: string;
  errorMessage?: string;
  verifyProvider?: string;
  verifyResult?: string;
  mailId?: string;
  openedCount?: number;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
};

export type TodoJobItem = {
  id: string;
  sourceItemId?: string | null;
  companyUrl: string;
  pageType: string;
  pageTypeOther?: string;
  emailDomainInput: string;
  companyName?: string;
  status: TodoJobItemStatus;
  step?: string;
  pageTextLength?: number;
  detectedLanguage?: string;
  coldEmailSubject?: string;
  coldEmailBody?: string;
  linkedinMessage?: string;
  adaptationNotes?: string;
  cvFileName?: string;
  candidateRecipients?: string[];
  selectedRecipients?: string[];
  recipientResults?: TodoJobRecipientResult[];
  outreachLogId?: string | null;
  mailIds?: string[];
  sentCount?: number;
  failedCount?: number;
  queuedCount?: number;
  openedCount?: number;
  uniqueOpenedRecipients?: number;
  errorMessage?: string;
  errorCode?: string;
  verification?: Record<string, unknown> | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type TodoJobProgress = {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  companiesMailed?: number;
  mailsSent: number;
  mailsFailed: number;
  mailsQueued: number;
  mailsOpened: number;
  uniqueOpenedRecipients: number;
};

export type TodoApplicationJob = {
  id: string;
  projectId: string;
  mode: TodoJobMode;
  status: TodoJobStatus;
  settings?: Record<string, unknown>;
  items: TodoJobItem[];
  progress: TodoJobProgress;
  currentItemId?: string | null;
  pauseAfterCurrent?: boolean;
  lastError?: string;
  startedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TodoJobStartPayload = {
  projectId: string;
  mode: TodoJobMode;
  itemIds?: string[];
  items?: Array<{
    companyUrl: string;
    pageType?: string;
    pageTypeOther?: string;
    emailDomainInput: string;
    companyName?: string;
    notes?: string;
  }>;
  selectedEmailPrefixCategories?: EmailPrefixCategoryId[] | string[];
  customEmailLocalParts?: string[];
  customEmailLocalPartsText?: string;
  includePrimaryEmailInSend?: boolean;
  skipPrimaryEmailVerification?: boolean;
  includeEnteredMainDomainInSend?: boolean;
  forceResend?: boolean;
  outreachEmailLanguageMode?: 'auto' | 'turkish' | 'english';
  targetPosition?: string;
  cvLanguage?: 'turkish' | 'english';
  aiSettings?: { about?: boolean; workExperience?: boolean; skills?: boolean };
  cvSectionLengthMode?: 'fit_range' | 'keywords_only';
  cvAdaptationSource?: 'company' | 'text';
  shouldGenerateCoverLetter?: boolean;
  shouldGenerateLinkedInMessage?: boolean;
  includeCvPhoto?: boolean;
  profileImageUrl?: string;
  outreachCvAttachmentSource?: 'optimized' | 'original';
  cvId?: string | null;
  cvTitle?: string;
  cvFileName?: string;
  replyTo?: string;
  pdfAttachment?: {
    filename: string;
    contentBase64: string;
    contentType?: string;
  };
  candidateFullName?: string;
  candidateTitle?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
  phone?: string;
  sendMail?: boolean;
};

export type TodoSendHistoryFilter = 'all' | 'sent' | 'unsent';

export type TodoProjectCvMeta = {
  hasCv: boolean;
  cvFileName: string;
  cvTitle: string;
  uploadedAt?: string | null;
  contentType?: string;
  bulkSendHistoryFilter?: TodoSendHistoryFilter;
};

export type TodoProjectSummary = {
  itemCount: number;
  cv?: TodoProjectCvMeta;
  activeJob: TodoApplicationJob | null;
  recentJobs: TodoApplicationJob[];
};

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function throwApiError(data: Record<string, unknown>, fallback: string): never {
  const err = new Error(
    typeof data.message === 'string' && data.message.trim() ? data.message : fallback
  ) as Error & { code?: string; details?: unknown };
  if (typeof data.code === 'string') err.code = data.code;
  if (data.details != null) err.details = data.details;
  throw err;
}

export async function listTodoItemsRequest(projectId: string): Promise<TodoApplicationItem[]> {
  const response = await authFetch(
    `/api/todo-applications/items?projectId=${encodeURIComponent(projectId)}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'To Do listesi alınamadı.');
  }
  return Array.isArray(data.items) ? (data.items as TodoApplicationItem[]) : [];
}

export async function createTodoItemsRequest(
  projectId: string,
  items: Array<{
    companyUrl: string;
    pageType?: string;
    pageTypeOther?: string;
    emailDomainInput: string;
    companyName?: string;
    notes?: string;
  }>
): Promise<TodoApplicationItem[]> {
  const response = await authFetch('/api/todo-applications/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, items }),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Firma satırları eklenemedi.');
  }
  return Array.isArray(data.items) ? (data.items as TodoApplicationItem[]) : [];
}

export async function updateTodoItemRequest(
  itemId: string,
  patch: Partial<{
    companyUrl: string;
    pageType: string;
    pageTypeOther: string;
    emailDomainInput: string;
    companyName: string;
    notes: string;
    sortOrder: number;
  }>
): Promise<TodoApplicationItem> {
  const response = await authFetch(`/api/todo-applications/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Kayıt güncellenemedi.');
  }
  return data.item as TodoApplicationItem;
}

export async function deleteTodoItemRequest(itemId: string): Promise<void> {
  const response = await authFetch(`/api/todo-applications/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Kayıt silinemedi.');
  }
}

export async function bulkDeleteTodoItemsRequest(
  projectId: string,
  itemIds: string[]
): Promise<number> {
  const response = await authFetch('/api/todo-applications/items/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, itemIds }),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Toplu silme başarısız.');
  }
  return Number(data.modifiedCount || 0);
}

export async function getTodoProjectSummaryRequest(
  projectId: string
): Promise<TodoProjectSummary> {
  const response = await authFetch(
    `/api/todo-applications/projects/${encodeURIComponent(projectId)}/summary`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Proje özeti alınamadı.');
  }
  return {
    itemCount: Number(data.itemCount || 0),
    cv: (data.cv as TodoProjectCvMeta) || undefined,
    activeJob: (data.activeJob as TodoApplicationJob) || null,
    recentJobs: Array.isArray(data.recentJobs)
      ? (data.recentJobs as TodoApplicationJob[])
      : [],
  };
}

export async function getTodoProjectCvRequest(
  projectId: string
): Promise<TodoProjectCvMeta> {
  const response = await authFetch(
    `/api/todo-applications/projects/${encodeURIComponent(projectId)}/cv`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Proje CV bilgisi alınamadı.');
  }
  return (data.cv as TodoProjectCvMeta) || {
    hasCv: false,
    cvFileName: '',
    cvTitle: '',
  };
}

export async function updateTodoProjectSettingsRequest(
  projectId: string,
  patch: { bulkSendHistoryFilter?: TodoSendHistoryFilter }
): Promise<TodoProjectCvMeta> {
  const response = await authFetch(
    `/api/todo-applications/projects/${encodeURIComponent(projectId)}/settings`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Proje tercihleri kaydedilemedi.');
  }
  return (data.cv as TodoProjectCvMeta) || {
    hasCv: false,
    cvFileName: '',
    cvTitle: '',
    bulkSendHistoryFilter: patch.bulkSendHistoryFilter || 'all',
  };
}

export async function uploadTodoProjectCvRequest(
  projectId: string,
  payload: {
    filename: string;
    contentBase64: string;
    contentType?: string;
    cvTitle?: string;
  }
): Promise<TodoProjectCvMeta> {
  const response = await authFetch(
    `/api/todo-applications/projects/${encodeURIComponent(projectId)}/cv`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV yüklenemedi.');
  }
  return data.cv as TodoProjectCvMeta;
}

export async function deleteTodoProjectCvRequest(
  projectId: string
): Promise<TodoProjectCvMeta> {
  const response = await authFetch(
    `/api/todo-applications/projects/${encodeURIComponent(projectId)}/cv`,
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'CV silinemedi.');
  }
  return (data.cv as TodoProjectCvMeta) || {
    hasCv: false,
    cvFileName: '',
    cvTitle: '',
  };
}

export async function getTodoProjectCompanyResultsRequest(
  projectId: string,
  options?: { limit?: number }
): Promise<{
  companies: Array<
    TodoJobItem & {
      jobId?: string;
      jobStatus?: string;
      jobMode?: string;
      jobCreatedAt?: string;
    }
  >;
  totals: {
    total: number;
    mailed: number;
    completed: number;
    failed: number;
    cancelled: number;
    pending: number;
    opened: number;
  };
  cv?: TodoProjectCvMeta;
}> {
  const qs = new URLSearchParams();
  if (options?.limit != null) qs.set('limit', String(options.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await authFetch(
    `/api/todo-applications/projects/${encodeURIComponent(projectId)}/company-results${suffix}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Firma sonuçları alınamadı.');
  }
  return {
    companies: Array.isArray(data.companies)
      ? (data.companies as Array<
          TodoJobItem & {
            jobId?: string;
            jobStatus?: string;
            jobMode?: string;
            jobCreatedAt?: string;
          }
        >)
      : [],
    totals: (data.totals as {
      total: number;
      mailed: number;
      completed: number;
      failed: number;
      cancelled: number;
      pending: number;
      opened: number;
    }) || {
      total: 0,
      mailed: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      pending: 0,
      opened: 0,
    },
    cv: (data.cv as TodoProjectCvMeta) || undefined,
  };
}

export async function startTodoJobRequest(
  payload: TodoJobStartPayload
): Promise<TodoApplicationJob> {
  const response = await authFetch('/api/todo-applications/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'İş başlatılamadı.');
  }
  return data.job as TodoApplicationJob;
}

export async function listTodoJobsRequest(params?: {
  projectId?: string;
  limit?: number;
}): Promise<TodoApplicationJob[]> {
  const qs = new URLSearchParams();
  if (params?.projectId) qs.set('projectId', params.projectId);
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const response = await authFetch(`/api/todo-applications/jobs${suffix}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'İşler alınamadı.');
  }
  return Array.isArray(data.jobs) ? (data.jobs as TodoApplicationJob[]) : [];
}

export async function getTodoJobRequest(
  jobId: string,
  opts?: { refreshTracking?: boolean }
): Promise<TodoApplicationJob> {
  const qs =
    opts?.refreshTracking === false ? '?refreshTracking=false' : '';
  const response = await authFetch(`/api/todo-applications/jobs/${jobId}${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'İş detayı alınamadı.');
  }
  return data.job as TodoApplicationJob;
}

export async function pauseTodoJobRequest(jobId: string): Promise<TodoApplicationJob> {
  const response = await authFetch(`/api/todo-applications/jobs/${jobId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'İş duraklatılamadı.');
  }
  return data.job as TodoApplicationJob;
}

export async function resumeTodoJobRequest(jobId: string): Promise<TodoApplicationJob> {
  const response = await authFetch(`/api/todo-applications/jobs/${jobId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'İş devam ettirilemedi.');
  }
  return data.job as TodoApplicationJob;
}

export async function cancelTodoJobRequest(jobId: string): Promise<TodoApplicationJob> {
  const response = await authFetch(`/api/todo-applications/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'İş iptal edilemedi.');
  }
  return data.job as TodoApplicationJob;
}
