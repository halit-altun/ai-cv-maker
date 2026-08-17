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
