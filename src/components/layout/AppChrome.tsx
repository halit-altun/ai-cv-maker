'use client';

import { DashboardShell } from '@/features/dashboard/components/shell/DashboardShell';
import { useAppShell } from '@/features/dashboard/hooks/useAppShell';

interface AppChromeProps {
  children: React.ReactNode;
}

/**
 * Uygulama geneli tek layout: SideNav + TopBar + Footer.
 * Tüm sayfalar aynı CareerAI shell’ini kullanır.
 */
export function AppChrome({ children }: AppChromeProps) {
  const { user, primaryNav, footerNav } = useAppShell();

  return (
    <DashboardShell primaryNav={primaryNav} footerNav={footerNav} avatarUrl={user.avatarUrl}>
      {children}
    </DashboardShell>
  );
}
