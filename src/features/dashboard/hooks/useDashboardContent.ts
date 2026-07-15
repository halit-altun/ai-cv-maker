'use client';

import { useMemo } from 'react';
import {
  getDashboardUser,
  getWelcomeContent,
  getAiInsight,
  getProfileScore,
  getRecentActivity,
} from '../data/mockData';

/**
 * Yalnızca dashboard sayfa içeriği.
 * Shell (nav/user) için useAppShell kullanılır.
 */
export function useDashboardContent() {
  return useMemo(() => {
    const user = getDashboardUser();
    return {
      welcome: getWelcomeContent(user.name),
      aiInsight: getAiInsight(),
      profileScore: getProfileScore(),
      activity: getRecentActivity(),
    };
  }, []);
}
