import { AutoAwesome, DescriptionOutlined } from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import type {
  DashboardActivityItem,
  DashboardAiInsight,
  DashboardStatChip,
  DashboardWelcome,
} from '@/features/dashboard/types';

const ICON_MAP: Record<string, SvgIconComponent> = {
  description: DescriptionOutlined,
  autoAwesome: AutoAwesome,
};

export function resolveDashboardIcon(iconKey?: string): SvgIconComponent {
  if (!iconKey) return DescriptionOutlined;
  return ICON_MAP[iconKey] || DescriptionOutlined;
}

export function mapStatChips(
  stats: Array<{ id: string; label: string; value: string; iconKey: string }>
): DashboardStatChip[] {
  return stats.map((stat) => ({
    id: stat.id,
    label: stat.label,
    value: stat.value,
    icon: resolveDashboardIcon(stat.iconKey),
  }));
}

export function mapWelcome(welcome: {
  greeting: string;
  subtitle: string;
  stats: Array<{ id: string; label: string; value: string; iconKey: string }>;
}): DashboardWelcome {
  return {
    greeting: welcome.greeting,
    subtitle: welcome.subtitle,
    stats: mapStatChips(welcome.stats),
  };
}

export function mapAiInsight(insight: {
  title: string;
  body: string;
  suggestionLabel: string;
  suggestionText: string;
  metrics: DashboardAiInsight['metrics'];
  ctaLabel: string;
  ctaHref: string;
}): DashboardAiInsight {
  return {
    title: insight.title,
    body: insight.body,
    suggestionLabel: insight.suggestionLabel,
    suggestionText: insight.suggestionText,
    metrics: insight.metrics,
    ctaLabel: insight.ctaLabel,
    ctaHref: insight.ctaHref,
  };
}

export function mapActivityItems(
  items: Array<{
    id: string;
    title: string;
    detail: string;
    iconKey: string;
    iconFilled?: boolean;
    actions: DashboardActivityItem['actions'];
    href?: string;
  }>
): DashboardActivityItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.detail,
    icon: resolveDashboardIcon(item.iconKey),
    iconFilled: item.iconFilled,
    actions: item.actions,
    href: item.href,
  }));
}
