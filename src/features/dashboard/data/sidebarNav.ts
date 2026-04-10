import {
  Dashboard as DashboardIcon,
  AutoAwesome,
  Business,
  Email,
  Send,
  Home,
} from '@mui/icons-material';
import type { DashboardSidebarLink } from '../types';
import { appRoutes } from '../constants/routes';

export function getSidebarNavItems(): DashboardSidebarLink[] {
  return [
    {
      id: 'overview',
      label: 'Genel bakış',
      href: appRoutes.dashboard,
      icon: DashboardIcon,
      matchPath: '/dashboard',
    },
    {
      id: 'cv-ai',
      label: 'CV Maker AI',
      href: appRoutes.cvMakerAi,
      icon: AutoAwesome,
    },
    {
      id: 'company',
      label: 'Şirket bazlı CV',
      href: appRoutes.companyCvEditor,
      icon: Business,
    },
    {
      id: 'cover',
      label: 'AI başvuru maili',
      href: appRoutes.aiCoverLetter,
      icon: Email,
    },
    {
      id: 'bulk',
      label: 'Toplu mail',
      href: appRoutes.bulkEmail,
      icon: Send,
    },
    {
      id: 'site-home',
      label: 'Site ana sayfa',
      href: appRoutes.home,
      icon: Home,
    },
  ];
}
