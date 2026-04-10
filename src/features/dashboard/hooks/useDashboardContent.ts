'use client';

import { useMemo } from 'react';
import { getSidebarNavItems } from '../data/sidebarNav';
import {
  getDashboardMetrics,
  getQuickActions,
  getRecentActivity,
  getTaskProgress,
  getUsageBars,
} from '../data/mockData';

/**
 * İleride API / SWR ile değiştirilecek tek giriş noktası.
 * Şimdilik mock veriyi tek yerden toplar.
 */
export function useDashboardContent() {
  return useMemo(
    () => ({
      sidebarItems: getSidebarNavItems(),
      metrics: getDashboardMetrics(),
      quickActions: getQuickActions(),
      activity: getRecentActivity(),
      tasks: getTaskProgress(),
      usage: getUsageBars(),
    }),
    []
  );
}
