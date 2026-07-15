'use client';

import { useMemo } from 'react';
import { getPrimaryNavItems, getFooterNavItems } from '../data/sidebarNav';
import { getDashboardUser } from '../data/mockData';

/**
 * Tüm sayfalarda kullanılan global shell verisi (sidebar, topbar, kullanıcı).
 * İleride auth/API ile değiştirilebilir.
 */
export function useAppShell() {
  return useMemo(() => {
    const user = getDashboardUser();
    return {
      user,
      primaryNav: getPrimaryNavItems(),
      footerNav: getFooterNavItems(),
    };
  }, []);
}
