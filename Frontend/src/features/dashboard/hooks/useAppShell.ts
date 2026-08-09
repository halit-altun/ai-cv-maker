'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPrimaryNavItems, getFooterNavItems } from '../data/sidebarNav';
import { getDashboardRequest } from '@/lib/dashboard/api';
import { getStoredUser } from '@/lib/auth/tokenStorage';
import type { AuthUser } from '@/lib/auth/types';
import type { DashboardUser } from '../types';

function userFromAuthStorage(): DashboardUser {
  const stored = getStoredUser<AuthUser>();
  if (!stored) {
    return { name: '', accountLabel: '', avatarUrl: '' };
  }

  const name =
    String(stored.fullName || '').trim() ||
    String(stored.email || '').split('@')[0] ||
    '';

  return {
    name,
    accountLabel: stored.role === 'admin' ? 'Admin Account' : 'Free Account',
    avatarUrl: '',
  };
}

const emptyUser: DashboardUser = { name: '', accountLabel: '', avatarUrl: '' };

/**
 * Global shell verisi — kullanıcı API/dashboard'dan, nav statik.
 * İlk state boş tutulur (SSR = client hydrate); sessionStorage yalnızca mount sonrası okunur.
 */
export function useAppShell() {
  const [user, setUser] = useState<DashboardUser>(emptyUser);

  useEffect(() => {
    let cancelled = false;

    // Hydration sonrası: local oturum metni, ardından API.
    setUser(userFromAuthStorage());

    async function load() {
      try {
        const payload = await getDashboardRequest();
        if (!cancelled) setUser(payload.user);
      } catch {
        if (!cancelled) setUser(userFromAuthStorage());
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      user,
      primaryNav: getPrimaryNavItems(),
      footerNav: getFooterNavItems(),
    }),
    [user]
  );
}
