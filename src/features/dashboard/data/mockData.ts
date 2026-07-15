import { DescriptionOutlined, AutoAwesome } from '@mui/icons-material';
import type {
  DashboardActivityItem,
  DashboardAiInsight,
  DashboardProfileScore,
  DashboardUser,
  DashboardWelcome,
} from '../types';
import { appRoutes } from '../constants/routes';

export function getDashboardUser(): DashboardUser {
  return {
    name: 'Alex',
    accountLabel: 'Pro Account',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDbyo4fpTxKrl9SQ8jpIKUEupRlKrOJyqJsMiSnxJek5TfvPE03PZmKJ2Nj1YRTVHG1JEpbS-vibju2pLHlUBOtShS7r2OnUjMWR4RtKUzdmOgpuwjVwGjBoIVaad9ME29X8jiNgUq-dHrBFxiWlpOL6XJVcb4RSRdEeeMS3mh43g8cMxpdycxQa8A7h0qm5h7Kw4B0gLAUREkGP6-Fml5mJTaotg9VBG24jmirLhA4kn6QHVWaAH5wfg',
  };
}

export function getWelcomeContent(userName: string): DashboardWelcome {
  return {
    greeting: `Welcome back, ${userName}!`,
    subtitle: 'Your career progress is looking sharp today. Ready for the next leap?',
    stats: [
      {
        id: 'cvs-created',
        label: 'CVs Created',
        value: '3 Active CVs',
        icon: DescriptionOutlined,
      },
    ],
  };
}

export function getAiInsight(): DashboardAiInsight {
  return {
    title: 'AI Insights',
    body: 'Our AI analyzed your "Senior Product Manager" resume. You\'re hitting 85% of target keywords for high-end SaaS roles.',
    suggestionLabel: 'Suggestion:',
    suggestionText:
      'Strengthen your "Impact" statements in the Stripe experience section to boost visibility.',
    metrics: [
      { id: 'strength', label: 'Strength', value: '85%', progressPercent: 85 },
      { id: 'keywords', label: 'Keywords', value: '12/15' },
      { id: 'top-match', label: 'Top Match', value: 'FinTech' },
    ],
    ctaLabel: 'Apply AI Optimization',
    ctaHref: appRoutes.aiOptimizer,
  };
}

export function getProfileScore(): DashboardProfileScore {
  return {
    score: 75,
    maxScore: 100,
    hint: 'Complete your certification section to reach 90%.',
    ctaLabel: 'Update Profile',
    ctaHref: appRoutes.settings,
  };
}

export function getRecentActivity(): DashboardActivityItem[] {
  return [
    {
      id: 'a1',
      title: 'Senior PM Resume (Tech Optimized)',
      detail: 'Last edited 2 hours ago',
      icon: DescriptionOutlined,
      actions: ['edit', 'download'],
      href: appRoutes.myCvs,
    },
    {
      id: 'a2',
      title: 'UX Designer Portfolio CV',
      detail: 'Downloaded 1 day ago',
      icon: DescriptionOutlined,
      actions: ['edit', 'download'],
      href: appRoutes.myCvs,
    },
    {
      id: 'a3',
      title: 'AI Optimization Report',
      detail: 'Generated 3 days ago',
      icon: AutoAwesome,
      iconFilled: true,
      actions: ['visibility'],
      href: appRoutes.aiOptimizer,
    },
  ];
}
