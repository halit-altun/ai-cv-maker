'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell } from '@/features/dashboard/components/shell/DashboardShell';
import { useAppShell } from '@/features/dashboard/hooks/useAppShell';
import { isAuthShellExemptPath } from '@/features/dashboard/constants/routes';

interface AppChromeProps {
  children: React.ReactNode;
}

/**
 * Uygulama geneli layout: SideNav + TopBar + Footer.
 * Auth sayfalarında shell gizlenir (tam ekran form).
 */
export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname() ?? '';
  const { user, primaryNav, footerNav } = useAppShell();

  if (isAuthShellExemptPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <DashboardShell
      primaryNav={primaryNav}
      footerNav={footerNav}
      avatarUrl={user.avatarUrl}
      accountLabel={user.accountLabel}
    >
      {children}
    </DashboardShell>
  );
}
