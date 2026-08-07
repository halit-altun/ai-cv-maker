import { authFetch } from '@/lib/auth/authFetch';
import type {
  DashboardActivityItem,
  DashboardAiInsight,
  DashboardProfileScore,
  DashboardUser,
  DashboardWelcome,
} from '@/features/dashboard/types';
import type { AiRecommendation, VisibilityInsightBar } from '@/features/my-cvs/types';
import {
  mapActivityItems,
  mapAiInsight,
  mapStatChips,
  mapWelcome,
} from './mappers';

export type DashboardApiResponse = {
  ok: true;
  user: {
    id: string;
    name: string;
    email: string;
    clientId: string;
    accountLabel: string;
    avatarUrl: string;
    role: string;
  };
  welcome: {
    greeting: string;
    subtitle: string;
    stats: Array<{
      id: string;
      label: string;
      value: string;
      iconKey: string;
    }>;
  };
  aiInsight: {
    title: string;
    body: string;
    suggestionLabel: string;
    suggestionText: string;
    metrics: Array<{
      id: string;
      label: string;
      value: string;
      progressPercent?: number;
    }>;
    ctaLabel: string;
    ctaHref: string;
    relatedCvId?: string | null;
  };
  profileScore: DashboardProfileScore;
  activity: Array<{
    id: string;
    title: string;
    detail: string;
    iconKey: string;
    iconFilled?: boolean;
    actions: Array<'edit' | 'download' | 'visibility'>;
    href?: string;
    relatedCvId?: string | null;
  }>;
  insights: {
    visibility: VisibilityInsightBar[];
    recommendation: AiRecommendation;
  };
};

export type DashboardContent = {
  user: DashboardUser;
  welcome: DashboardWelcome;
  aiInsight: DashboardAiInsight;
  profileScore: DashboardProfileScore;
  activity: DashboardActivityItem[];
  visibility: VisibilityInsightBar[];
  recommendation: AiRecommendation;
};

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

export function mapDashboardResponse(raw: DashboardApiResponse): DashboardContent {
  return {
    user: {
      name: raw.user.name,
      accountLabel: raw.user.accountLabel,
      avatarUrl: raw.user.avatarUrl || '',
    },
    welcome: mapWelcome(raw.welcome),
    aiInsight: mapAiInsight(raw.aiInsight),
    profileScore: raw.profileScore,
    activity: mapActivityItems(raw.activity),
    visibility: raw.insights.visibility,
    recommendation: raw.insights.recommendation,
  };
}

export async function getDashboardRequest(): Promise<DashboardContent> {
  const response = await authFetch('/api/dashboard', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Dashboard verisi alınamadı.');
  }
  return mapDashboardResponse(data as unknown as DashboardApiResponse);
}

export async function getDashboardInsightsRequest(): Promise<{
  visibility: VisibilityInsightBar[];
  recommendation: AiRecommendation;
}> {
  const response = await authFetch('/api/dashboard/insights', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJson(response);
  if (!response.ok || data.ok === false) {
    throwApiError(data, 'Insights verisi alınamadı.');
  }

  return {
    visibility: Array.isArray(data.visibility)
      ? (data.visibility as VisibilityInsightBar[])
      : [],
    recommendation: (data.recommendation as AiRecommendation) || {
      title: 'AI Recommendation',
      body: 'No recommendation available.',
      ctaLabel: 'Open My CVs',
      ctaHref: '/my-cvs',
      relatedCvId: '',
    },
  };
}

export { mapStatChips };
