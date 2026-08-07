import { authFetch } from '@/lib/auth/authFetch';

export type OutreachPdfAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export type OutreachSendPayload = {
  recipients: string[];
  subject?: string;
  bodyText: string;
  replyTo?: string;
  companyName?: string;
  domain?: string;
  /** Kullanıcının girdiği ham domain/email — öncelik seçiminde manuel/ana adres (son çare) */
  rawDomainInput?: string;
  trustedEmail?: string;
  cvId?: string;
  cvTitle?: string;
  cvFileName?: string;
  selectedCategories?: string[];
  templateType?: 'cover_letter' | 'linkedin' | 'custom' | 'cold_email' | 'none';
  targetPosition?: string;
  forceResend?: boolean;
  pdfAttachment?: OutreachPdfAttachment;
  /** Seçili outreach projesi — yoksa projesiz akış */
  projectId?: string | null;
};

export type OutreachSendResult = {
  ok: boolean;
  message: string;
  total: number;
  sentCount: number;
  loggedCount: number;
  failedCount?: number;
  status?: string;
  domain?: string;
  logId?: string;
  attachmentIncluded?: boolean;
  selectedRecipient?: string | null;
  selectedRecipients?: string[];
  verification?: {
    enabled?: boolean;
    mxOk?: boolean;
    provider?: string;
    selectedEmail?: string;
    selectedEmails?: string[];
    warning?: string;
    checks?: Array<{
      email: string;
      isValid: boolean;
      provider?: string;
      result?: string;
    }>;
  };
  results: Array<{
    email?: string;
    to?: string;
    status?: string;
    sent?: boolean;
    logged?: boolean;
    errorMessage?: string;
  }>;
};

export type EmailVerifyResult = {
  ok: boolean;
  message?: string;
  reason?: string | null;
  validEmail: string | null;
  validEmails?: string[];
  domain?: string | null;
  provider?: string | null;
  warning?: string | null;
  mx?: {
    ok: boolean;
    domain?: string;
    records?: Array<{ exchange: string; priority: number }>;
  } | null;
  checks: Array<{
    email: string;
    isValid: boolean;
    provider?: string;
    result?: string;
    reason?: string;
  }>;
};

export type OutreachLogItem = {
  id: string;
  clientId: string;
  companyName: string;
  domain: string;
  status: 'success' | 'partial' | 'failed' | 'ai_error' | 'verify_failed' | 'analysis_only';
  projectId?: string | null;
  subject: string;
  bodyText: string;
  templateType: string;
  cvId: string | null;
  cvTitle: string;
  cvFileName: string;
  selectedCategories: string[];
  recipients: Array<{
    email: string;
    status: string;
    errorMessage?: string;
    verifyProvider?: string;
    verifyResult?: string;
  }>;
  sentCount: number;
  failedCount: number;
  loggedCount: number;
  totalRecipients: number;
  errorMessage: string;
  targetPosition: string;
  replyTo: string;
  verification?: {
    enabled?: boolean;
    mxOk?: boolean;
    provider?: string;
    selectedEmail?: string;
    selectedEmails?: string[];
    warning?: string;
    checks?: Array<{
      email: string;
      isValid: boolean;
      provider?: string;
      result?: string;
    }>;
  } | null;
  sentAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OutreachCompanyGroup = {
  domain: string;
  companyName: string;
  totalAttempts: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  aiErrorCount: number;
  lastSentAt: string;
  lastStatus: string;
  logs: OutreachLogItem[];
};

export type DomainCheckResult = {
  ok: boolean;
  domain: string;
  /** Yalnızca gerçek mail gönderimi (SMTP sent/logged) */
  previouslyContacted: boolean;
  blockedResend?: boolean;
  /** Gerçek mail gönderim sayısı */
  count: number;
  mailSendCount?: number;
  analysisOnlyCount?: number;
  otherAttemptCount?: number;
  hasAnalysisOnly?: boolean;
  lastSentAt: string | null;
  lastStatus: string | null;
  lastCompanyName: string | null;
  lastAnalysisAt?: string | null;
  lastAnalysis?: {
    id: string;
    sentAt: string;
    companyName: string;
    status: string;
  } | null;
  allSentEmails?: string[];
  lastOutreach?: {
    id: string;
    sentAt: string;
    status: string;
    companyName: string;
    subject?: string;
    sentEmails: string[];
    verification?: OutreachLogItem['verification'];
    recipients: OutreachLogItem['recipients'];
  } | null;
  items: OutreachLogItem[];
  limits?: {
    maxRecipientsPerSend: number;
    dailyEmailLimit: number;
    blockDomainResend: boolean;
  };
};

export type OutreachQuota = {
  maxRecipientsPerSend: number;
  dailyEmailLimit: number;
  blockDomainResend: boolean;
  usedToday: number;
  remainingToday: number;
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
    typeof data.message === 'string' && data.message.trim()
      ? data.message
      : fallback
  ) as Error & { code?: string; details?: unknown };
  if (typeof data.code === 'string') err.code = data.code;
  if (data.details != null) err.details = data.details;
  throw err;
}

export async function sendCompanyOutreachRequest(
  payload: OutreachSendPayload
): Promise<OutreachSendResult> {
  const response = await authFetch('/api/outreach/company-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Mail gönderilemedi.');
  }
  return data as unknown as OutreachSendResult;
}

export async function verifyOutreachEmailsRequest(payload: {
  recipients: string[];
  domain?: string;
}): Promise<EmailVerifyResult> {
  const response = await authFetch('/api/outreach/verify-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throwApiError(data, 'E-posta doğrulanamadı.');
  }
  return data as unknown as EmailVerifyResult;
}

export async function checkOutreachDomainRequest(
  domain: string
): Promise<DomainCheckResult> {
  const response = await authFetch(
    `/api/outreach/check-domain?domain=${encodeURIComponent(domain)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Domain geçmişi kontrol edilemedi.');
  }
  return data as unknown as DomainCheckResult;
}

export async function getOutreachQuotaRequest(): Promise<OutreachQuota> {
  const response = await authFetch('/api/outreach/quota', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Kota bilgisi alınamadı.');
  }
  return (data.quota || data) as unknown as OutreachQuota;
}

export async function getEmailVerifyQuotaRequest(): Promise<{
  service: string;
  provider: string;
  docsUrl: string;
  configured: boolean;
  periodKey: string;
  limit: number;
  used: number;
  remaining: number;
  lastUsedAt: string | null;
  lastEmail: string;
  note: string;
}> {
  const response = await authFetch('/api/outreach/emailverify-quota', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'EmailVerify kota bilgisi alınamadı.');
  }
  return (data.quota || data) as {
    service: string;
    provider: string;
    docsUrl: string;
    configured: boolean;
    periodKey: string;
    limit: number;
    used: number;
    remaining: number;
    lastUsedAt: string | null;
    lastEmail: string;
    note: string;
  };
}

export async function listOutreachCompaniesRequest(): Promise<OutreachCompanyGroup[]> {
  const response = await authFetch('/api/outreach/companies', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Outreach logları alınamadı.');
  }
  return Array.isArray(data.companies)
    ? (data.companies as OutreachCompanyGroup[])
    : [];
}

export async function listOutreachLogsRequest(params?: {
  domain?: string;
  status?: string;
}): Promise<OutreachLogItem[]> {
  const qs = new URLSearchParams();
  if (params?.domain) qs.set('domain', params.domain);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await authFetch(`/api/outreach/logs${suffix}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Log listesi alınamadı.');
  }
  return Array.isArray(data.items) ? (data.items as OutreachLogItem[]) : [];
}

export async function createOutreachAiErrorLogRequest(payload: {
  domain?: string;
  companyName?: string;
  errorMessage: string;
  cvFileName?: string;
  targetPosition?: string;
  projectId?: string | null;
}): Promise<{ logId: string }> {
  const response = await authFetch('/api/outreach/ai-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'AI hata logu kaydedilemedi.');
  }
  return { logId: String(data.logId || '') };
}

export async function createOutreachAnalysisOnlyLogRequest(payload: {
  domain?: string;
  companyName?: string;
  cvFileName?: string;
  targetPosition?: string;
  projectId: string;
  matchScore?: number;
}): Promise<{ logId: string }> {
  const response = await authFetch('/api/outreach/analysis-only', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Analiz kaydı oluşturulamadı.');
  }
  return { logId: String(data.logId || '') };
}

export async function checkMailInfraRequest(options?: {
  forceRefresh?: boolean;
  subject?: string;
  bodyText?: string;
  hasAttachment?: boolean;
}): Promise<Record<string, unknown>> {
  const response = await authFetch('/api/outreach/check-deliverability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      forceRefresh: Boolean(options?.forceRefresh),
      subject: options?.subject || undefined,
      bodyText: options?.bodyText || undefined,
      hasAttachment: Boolean(options?.hasAttachment),
    }),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Mail altyapı kontrolü başarısız.');
  }
  return data;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
