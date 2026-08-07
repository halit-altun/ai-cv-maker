import { authFetch } from '@/lib/auth/authFetch';

export type OutreachProject = {
  id: string;
  name: string;
  lastSelectedAt?: string;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectCompanyActivity = {
  companyName: string;
  domain: string;
  lastActivityAt: string;
  hasMailSent: boolean;
  hasAnalysisOnly: boolean;
  analysisOnlyAt: string | null;
  mailSentAt: string | null;
  sentEmails: string[];
  verifiedEmails: string[];
  invalidEmails: string[];
  statuses: string[];
  activityCount: number;
  logs: Array<{
    id: string;
    status: string;
    sentAt: string;
    sentCount: number;
    failedCount: number;
    sentEmails: string[];
    verifiedEmails: string[];
    invalidEmails: string[];
    errorMessage?: string;
    subject?: string;
    targetPosition?: string;
    verification?: {
      enabled?: boolean;
      mxOk?: boolean;
      provider?: string;
      selectedEmail?: string;
      selectedEmails?: string[];
      checks?: Array<{ email: string; isValid: boolean; provider?: string; result?: string }>;
      warning?: string;
    } | null;
    recipients?: Array<{
      email: string;
      status: string;
      errorMessage?: string;
      verifyProvider?: string;
      verifyResult?: string;
    }>;
  }>;
};

export type ProjectDashboard = {
  project: OutreachProject;
  dateRange?: {
    preset: 'today' | 'yesterday' | 'custom' | 'all' | string;
    from: string | null;
    to: string | null;
  };
  totals: {
    companiesTotal: number;
    companiesWithMail: number;
    companiesAnalysisOnly: number;
    companiesTouched: number;
    totalApplications?: number;
    mailAttemptCount: number;
    analysisOnlyCount: number;
    aiErrorCount: number;
    verifyFailedCount: number;
    totalMailsSent: number;
    totalMailsFailed: number;
    totalMailsLogged: number;
    uniqueSentEmails: number;
    uniqueVerifiedEmails: number;
    uniqueInvalidEmails: number;
    logCount: number;
  };
  companies: ProjectCompanyActivity[];
};

export type ProjectDashboardRange = 'today' | 'yesterday' | 'custom' | 'all';

export type ProjectDashboardQuery = {
  range?: ProjectDashboardRange;
  from?: string;
  to?: string;
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
  ) as Error & { code?: string };
  if (typeof data.code === 'string') err.code = data.code;
  throw err;
}

export async function listOutreachProjectsRequest(): Promise<{
  projects: OutreachProject[];
  lastSelectedId: string | null;
}> {
  const response = await authFetch('/api/outreach-projects', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Projeler alınamadı.');
  }
  return {
    projects: Array.isArray(data.projects) ? (data.projects as OutreachProject[]) : [],
    lastSelectedId:
      typeof data.lastSelectedId === 'string' ? data.lastSelectedId : null,
  };
}

export async function createOutreachProjectRequest(name: string): Promise<OutreachProject> {
  const response = await authFetch('/api/outreach-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Proje oluşturulamadı.');
  }
  return data.project as OutreachProject;
}

export async function selectOutreachProjectRequest(projectId: string): Promise<OutreachProject> {
  const response = await authFetch(`/api/outreach-projects/${projectId}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Proje seçilemedi.');
  }
  return data.project as OutreachProject;
}

export async function getOutreachProjectDashboardRequest(
  projectId: string,
  query: ProjectDashboardQuery = {}
): Promise<ProjectDashboard> {
  const params = new URLSearchParams();
  if (query.range) params.set('range', query.range);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  const response = await authFetch(
    `/api/outreach-projects/${projectId}/dashboard${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Proje özeti alınamadı.');
  }
  return data as unknown as ProjectDashboard;
}
