import { authFetch } from '@/lib/auth/authFetch';

export type MailTrackingStatus = 'SENT' | 'DELIVERED' | 'OPENED' | 'FAILED';

export type MailTrackingItem = {
  _id: string;
  mailId: string;
  recipient: string;
  company?: string;
  jobTitle?: string;
  subject?: string;
  status: MailTrackingStatus;
  openedCount: number;
  /** Gönderimden 5 sn sonraki okuma sayısı (ilk 5 sn pixel tetikleri hariç) */
  bilateralOpenCount?: number;
  firstBilateralOpenedAt?: string | null;
  lastBilateralOpenedAt?: string | null;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  isLikelyBot?: boolean;
  deliveryOutcome?: 'unknown' | 'inbox' | 'spam';
  deliveryOutcomeAt?: string | null;
  projectId?: string | null;
  projectName?: string;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Outreach log’dan — liste bayrakları */
  hasCvPdf?: boolean;
  hasStandardColdMail?: boolean;
  hasInfoContactColdMail?: boolean;
  hasStandardLinkedIn?: boolean;
  hasInfoContactLinkedIn?: boolean;
  cvFileName?: string;
  /** Company Based yeniden analiz */
  canReanalyze?: boolean;
  reanalyze?: MailTrackingReanalyzeContext | null;
};

export type MailTrackingReanalyzeContext = {
  companyUrl?: string;
  rawDomainInput?: string;
  domain?: string;
  companyName?: string;
  targetPosition?: string;
  projectId?: string;
  selectedCategories?: string[];
  pageType?: string;
  pageTypeOther?: string;
  cvLanguage?: string;
  outreachEmailLanguageMode?: string;
  customEmailLocalParts?: string[];
  includePrimaryEmailInSend?: boolean;
  skipPrimaryEmailVerification?: boolean;
  includeEnteredMainDomainInSend?: boolean;
  shouldSendCompanyEmail?: boolean;
  shouldGenerateCoverLetter?: boolean;
  shouldGenerateLinkedInMessage?: boolean;
  coverLetterSource?: string;
  linkedinMessageSource?: string;
  cvAdaptationSource?: string;
  outreachCvAttachmentSource?: string;
  includeCvPhoto?: boolean;
  aiSettings?: {
    about?: boolean;
    workExperience?: boolean;
    skills?: boolean;
  } | null;
  cvSectionLengthMode?: 'fit_range' | 'keywords_only';
};

export type MailOpenEvent = {
  _id: string;
  mailId: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
  openedInSeconds?: number;
  isLikelyBot?: boolean;
  createdAt?: string;
};

export type MailTrackingStats = {
  total: number;
  /** Benzersiz şirket sayısı (boş company hariç) */
  companyCount: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  openRate: number;
  inbox?: number;
  spam?: number;
  inboxRate?: number | null;
};

export type MailTrackingListFilters = {
  status?: string;
  projectId?: string;
  company?: string;
  /** Alıcı e-posta (kısmi eşleşme: hi@rubyroidlabs.com) */
  recipient?: string;
  /** Tek gün (YYYY-MM-DD) — gönderim tarihi */
  date?: string;
  startDate?: string;
  endDate?: string;
};

export async function listMailTrackingsRequest(params?: MailTrackingListFilters & {
  limit?: number;
  skip?: number;
}): Promise<{ trackings: MailTrackingItem[]; total: number; companyCount: number }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.status) qs.set('status', params.status);
  if (params?.projectId) qs.set('projectId', params.projectId);
  if (params?.company) qs.set('company', params.company);
  if (params?.recipient) qs.set('recipient', params.recipient);
  if (params?.date) qs.set('date', params.date);
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);

  const res = await authFetch(`/api/mail-tracking?${qs.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Mail takip listesi alınamadı.');
  }
  return {
    trackings: data.trackings || [],
    total: data.total || 0,
    companyCount: data.companyCount ?? 0,
  };
}

export async function getMailTrackingDetailRequest(
  mailId: string
): Promise<{
  tracking: MailTrackingItem;
  openEvents: MailOpenEvent[];
  pixelUrl?: string;
  trackingBaseIsLocal?: boolean;
}> {
  const res = await authFetch(`/api/mail-tracking/${encodeURIComponent(mailId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Mail takip detayı alınamadı.');
  }
  return {
    tracking: data.tracking,
    openEvents: data.openEvents || [],
    pixelUrl: data.pixelUrl,
    trackingBaseIsLocal: Boolean(data.trackingBaseIsLocal),
  };
}

export async function simulateMailOpenRequest(mailId: string): Promise<{
  tracking: MailTrackingItem;
  pixelUrl?: string;
  trackingBaseIsLocal?: boolean;
  hint?: string;
}> {
  const res = await authFetch(`/api/mail-tracking/${encodeURIComponent(mailId)}/simulate-open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Okundu simülasyonu başarısız.');
  }
  return {
    tracking: data.tracking,
    pixelUrl: data.pixelUrl,
    trackingBaseIsLocal: Boolean(data.trackingBaseIsLocal),
    hint: data.hint,
  };
}

export async function getMailTrackingStatsRequest(
  filters?: MailTrackingListFilters
): Promise<MailTrackingStats> {
  const qs = new URLSearchParams();
  if (filters?.projectId) qs.set('projectId', filters.projectId);
  if (filters?.status) qs.set('status', filters.status);
  if (filters?.company) qs.set('company', filters.company);
  if (filters?.recipient) qs.set('recipient', filters.recipient);
  if (filters?.date) qs.set('date', filters.date);
  if (filters?.startDate) qs.set('startDate', filters.startDate);
  if (filters?.endDate) qs.set('endDate', filters.endDate);

  const query = qs.toString();
  const res = await authFetch(
    `/api/mail-tracking/stats/summary${query ? `?${query}` : ''}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Mail takip istatistikleri alınamadı.');
  }
  return {
    ...data.stats,
    companyCount: data.stats?.companyCount ?? 0,
  };
}

export async function setMailDeliveryOutcomeRequest(
  mailId: string,
  outcome: 'inbox' | 'spam' | 'unknown'
): Promise<MailTrackingItem> {
  const res = await authFetch(`/api/mail-tracking/${encodeURIComponent(mailId)}/outcome`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Outcome kaydedilemedi.');
  }
  return data.tracking as MailTrackingItem;
}

export async function downloadMailTrackingCvRequest(mailId: string): Promise<{
  filename: string;
  contentType: string;
  contentBase64: string;
  company?: string;
}> {
  const res = await authFetch(`/api/mail-tracking/${encodeURIComponent(mailId)}/cv`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.contentBase64) {
    throw new Error(data.message || 'CV indirilemedi.');
  }
  return {
    filename: String(data.filename || 'CV.pdf'),
    contentType: String(data.contentType || 'application/pdf'),
    contentBase64: String(data.contentBase64),
    company: data.company ? String(data.company) : undefined,
  };
}

export async function getMailTrackingColdMailsRequest(mailId: string): Promise<{
  subject: string;
  standardBody: string;
  infoContactBody: string;
  company?: string;
}> {
  const res = await authFetch(`/api/mail-tracking/${encodeURIComponent(mailId)}/cold-mails`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Cold mail alınamadı.');
  }
  return {
    subject: String(data.subject || ''),
    standardBody: String(data.standardBody || ''),
    infoContactBody: String(data.infoContactBody || ''),
    company: data.company ? String(data.company) : undefined,
  };
}

export async function getMailTrackingLinkedInMessagesRequest(mailId: string): Promise<{
  standardBody: string;
  infoContactBody: string;
  company?: string;
}> {
  const res = await authFetch(
    `/api/mail-tracking/${encodeURIComponent(mailId)}/linkedin-messages`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'LinkedIn mesajı alınamadı.');
  }
  return {
    standardBody: String(data.standardBody || ''),
    infoContactBody: String(data.infoContactBody || ''),
    company: data.company ? String(data.company) : undefined,
  };
}

export async function getMailTrackingReanalyzeRequest(mailId: string): Promise<{
  mailId: string;
  reanalyze: MailTrackingReanalyzeContext;
}> {
  const res = await authFetch(
    `/api/mail-tracking/${encodeURIComponent(mailId)}/reanalyze`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.reanalyze) {
    throw new Error(data.message || 'Yeniden analiz bilgisi alınamadı.');
  }
  return {
    mailId: String(data.mailId || mailId),
    reanalyze: data.reanalyze as MailTrackingReanalyzeContext,
  };
}

export type SendQueueStatus = 'pending' | 'processing' | 'sent' | 'failed';

export type SendQueueItem = {
  id: string;
  status: SendQueueStatus | string;
  to: string[];
  recipient: string;
  subject?: string;
  companyName?: string;
  domain?: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  lastError?: string;
  projectId?: string | null;
  companyUrl?: string;
  todoJobId?: string | null;
  todoItemId?: string | null;
  mailId?: string;
  appliedIntervalSeconds?: number | null;
  createdAt?: string;
};

export type PendingJobSendItem = {
  jobId: string;
  itemId: string;
  jobStatus: string;
  itemStatus: string;
  pipeline?: string;
  source?: string;
  projectId?: string | null;
  companyName?: string;
  companyUrl?: string;
  recipients: string[];
  recipientCount: number;
  scheduledAt?: string | null;
  waitingForJob: boolean;
  cvFileName?: string;
  coldEmailSubject?: string;
  hasAnalysisSnapshot?: boolean;
};

export type SendQueueAnalysisDetail = {
  jobId: string;
  itemId: string;
  jobStatus: string;
  itemStatus: string;
  pipeline?: string;
  source?: string;
  projectId?: string | null;
  companyName?: string;
  companyUrl?: string;
  emailDomainInput?: string;
  cvFileName?: string;
  selectedRecipients?: string[];
  candidateRecipients?: string[];
  recipientResults?: Array<{ email: string; status: string; errorMessage?: string }>;
  coldEmailSubject?: string;
  coldEmailBody?: string;
  linkedinMessage?: string;
  adaptationNotes?: string;
  analysisSnapshot?: {
    matchScore?: number;
    originalAbout?: string;
    updatedAbout?: string;
    originalExperience?: string;
    updatedExperience?: string;
    originalSkills?: string;
    updatedSkills?: string;
    recommendations?: string[];
    positiveMatches?: Array<{ label: string; evidence: string }>;
    negativeMismatches?: Array<{ label: string; gap: string; evidence?: string }>;
    keywordIntegrationReport?: Array<{
      keyword: string;
      integratedIn: 'about' | 'experience' | 'both' | 'none' | 'already_present';
      note: string;
    }>;
    detectedKeywords?: string[];
    candidateKeywords?: string[];
    extractedKeywords?: string[];
    deliverabilityScore?: Record<string, unknown> | null;
    coverLetter?: string;
    targetPosition?: string;
    cvLanguage?: string;
    cvSectionLengthMode?: string;
  } | null;
  verification?: Record<string, unknown> | null;
  sentCount?: number;
  failedCount?: number;
  queuedCount?: number;
  errorMessage?: string;
  step?: string;
};

export type SendQueueDetailResponse = {
  queueItem: SendQueueItem | null;
  relatedQueueItems: SendQueueItem[];
  analysis: SendQueueAnalysisDetail | null;
};

export type SendQueueSummary = {
  queued: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  pendingJobItemCount: number;
  pendingJobRecipientCount: number;
  estimatedCompletionAt?: string | null;
  intervalMinSeconds?: number;
  intervalMaxSeconds?: number;
};

export async function listSendQueueRequest(params?: MailTrackingListFilters & {
  limit?: number;
  skip?: number;
}): Promise<{
  items: SendQueueItem[];
  total: number;
  pendingJobItems: PendingJobSendItem[];
}> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.status) qs.set('status', params.status);
  if (params?.projectId) qs.set('projectId', params.projectId);
  if (params?.company) qs.set('company', params.company);
  if (params?.recipient) qs.set('recipient', params.recipient);
  if (params?.date) qs.set('date', params.date);
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);

  const res = await authFetch(`/api/mail-tracking/send-queue?${qs.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Gönderim kuyruğu alınamadı.');
  }
  return {
    items: (data.items || []) as SendQueueItem[],
    total: Number(data.total || 0),
    pendingJobItems: (data.pendingJobItems || []) as PendingJobSendItem[],
  };
}

export async function getSendQueueSummaryRequest(
  filters?: MailTrackingListFilters
): Promise<SendQueueSummary> {
  const qs = new URLSearchParams();
  if (filters?.projectId) qs.set('projectId', filters.projectId);
  if (filters?.status) qs.set('status', filters.status);
  if (filters?.company) qs.set('company', filters.company);
  if (filters?.recipient) qs.set('recipient', filters.recipient);
  if (filters?.date) qs.set('date', filters.date);
  if (filters?.startDate) qs.set('startDate', filters.startDate);
  if (filters?.endDate) qs.set('endDate', filters.endDate);
  const query = qs.toString();
  const res = await authFetch(
    `/api/mail-tracking/send-queue/summary${query ? `?${query}` : ''}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Kuyruk özeti alınamadı.');
  }
  return data.summary as SendQueueSummary;
}

export async function getSendQueueDetailRequest(params: {
  jobId?: string;
  itemId?: string;
  queueId?: string;
}): Promise<SendQueueDetailResponse> {
  const qs = new URLSearchParams();
  if (params.jobId) qs.set('jobId', params.jobId);
  if (params.itemId) qs.set('itemId', params.itemId);
  if (params.queueId) qs.set('queueId', params.queueId);
  const res = await authFetch(`/api/mail-tracking/send-queue/detail?${qs.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Kuyruk detayı alınamadı.');
  }
  return {
    queueItem: (data.queueItem || null) as SendQueueItem | null,
    relatedQueueItems: (data.relatedQueueItems || []) as SendQueueItem[],
    analysis: (data.analysis || null) as SendQueueAnalysisDetail | null,
  };
}

