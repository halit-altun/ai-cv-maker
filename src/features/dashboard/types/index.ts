import type { SvgIconComponent } from '@mui/icons-material';

export interface DashboardSidebarLink {
  id: string;
  label: string;
  href: string;
  icon: SvgIconComponent;
  matchPath?: string;
  group?: 'primary' | 'footer';
}

export interface DashboardStatChip {
  id: string;
  label: string;
  value: string;
  icon: SvgIconComponent;
}

export interface DashboardAiInsightMetric {
  id: string;
  label: string;
  value: string;
  /** 0–100; progress bar için */
  progressPercent?: number;
}

export interface DashboardAiInsight {
  title: string;
  body: string;
  suggestionLabel: string;
  suggestionText: string;
  metrics: DashboardAiInsightMetric[];
  ctaLabel: string;
  ctaHref: string;
}

export interface DashboardProfileScore {
  score: number;
  maxScore: number;
  hint: string;
  ctaLabel: string;
  ctaHref: string;
}

export type DashboardActivityAction = 'edit' | 'download' | 'visibility';

export interface DashboardActivityItem {
  id: string;
  title: string;
  detail: string;
  icon: SvgIconComponent;
  iconFilled?: boolean;
  actions: DashboardActivityAction[];
  href?: string;
}

export interface DashboardWelcome {
  greeting: string;
  subtitle: string;
  stats: DashboardStatChip[];
}

export interface DashboardUser {
  name: string;
  avatarUrl: string;
  accountLabel: string;
}
