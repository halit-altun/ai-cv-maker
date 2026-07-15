import {
  Dashboard as DashboardIcon,
  DescriptionOutlined,
  AutoAwesome,
  SettingsOutlined,
  HelpOutline,
  Logout,
} from '@mui/icons-material';
import type { DashboardSidebarLink } from '../types';
import { appRoutes } from '../constants/routes';
import { dashboardCopy } from '../constants/copy';

export function getPrimaryNavItems(): DashboardSidebarLink[] {
  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: appRoutes.dashboard,
      icon: DashboardIcon,
      matchPath: '/dashboard',
      group: 'primary',
    },
    {
      id: 'my-cvs',
      label: 'My CVs',
      href: appRoutes.myCvs,
      icon: DescriptionOutlined,
      matchPath: '/my-cvs',
      group: 'primary',
    },
    {
      id: 'ai-optimizer',
      label: 'AI Optimizer',
      href: appRoutes.aiOptimizer,
      icon: AutoAwesome,
      group: 'primary',
    },
    {
      id: 'settings',
      label: 'Settings',
      href: appRoutes.settings,
      icon: SettingsOutlined,
      group: 'primary',
    },
  ];
}

export function getFooterNavItems(): DashboardSidebarLink[] {
  return [
    {
      id: 'help',
      label: dashboardCopy.helpCenter,
      href: appRoutes.help,
      icon: HelpOutline,
      group: 'footer',
    },
    {
      id: 'logout',
      label: dashboardCopy.logout,
      href: appRoutes.logout,
      icon: Logout,
      group: 'footer',
    },
  ];
}

/** Geriye uyumluluk — tüm sidebar linkleri */
export function getSidebarNavItems(): DashboardSidebarLink[] {
  return [...getPrimaryNavItems(), ...getFooterNavItems()];
}
