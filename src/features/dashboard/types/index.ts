import type { SvgIconComponent } from '@mui/icons-material';

export type DashboardMetricTone = 'primary' | 'secondary' | 'success' | 'warning';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: DashboardMetricTone;
  icon: SvgIconComponent;
}

export interface DashboardQuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: SvgIconComponent;
  tone: DashboardMetricTone;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
}

export interface DashboardTaskProgress {
  id: string;
  label: string;
  percent: number;
}

export interface DashboardUsageBar {
  id: string;
  label: string;
  percent: number;
}

export interface DashboardSidebarLink {
  id: string;
  label: string;
  href: string;
  icon: SvgIconComponent;
  matchPath?: string;
}
