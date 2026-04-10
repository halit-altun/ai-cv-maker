'use client';

import { Box, Divider, Typography } from '@mui/material';
import { dashboardCopy } from '../constants/copy';
import { useDashboardContent } from '../hooks/useDashboardContent';
import { DashboardShell } from './shell/DashboardShell';
import { DashboardContentFrame } from './DashboardContentFrame';
import { DashboardHero } from './DashboardHero';
import { MetricsSection } from './widgets/MetricsSection';
import { QuickActionsSection } from './widgets/QuickActionsSection';
import { ActivityFeed } from './widgets/ActivityFeed';
import { ProgressPanel } from './widgets/ProgressPanel';
import { UsageBarsPanel } from './widgets/UsageBarsPanel';
import { InsightBanner } from './widgets/InsightBanner';

export function DashboardView() {
  const { sidebarItems, metrics, quickActions, activity, tasks, usage } = useDashboardContent();

  return (
    <DashboardShell sidebarItems={sidebarItems}>
      <DashboardContentFrame>
        <DashboardHero title={dashboardCopy.pageTitle} subtitle={dashboardCopy.pageSubtitle} />

        <Box sx={{ mt: 2.5, mb: 3 }}>
          <InsightBanner title={dashboardCopy.insightTitle} body={dashboardCopy.insightBody} />
        </Box>

        <Box sx={{ mb: 3.5 }}>
          <MetricsSection
            kicker={dashboardCopy.kickerMetrics}
            title={dashboardCopy.metricsSectionTitle}
            metrics={metrics}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.12fr 0.88fr' },
            gap: { xs: 3, lg: 3.5 },
            alignItems: 'start',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            <QuickActionsSection
              kicker={dashboardCopy.kickerActions}
              title={dashboardCopy.quickActionsTitle}
              actions={quickActions}
            />
            <ActivityFeed
              kicker={dashboardCopy.kickerActivity}
              title={dashboardCopy.activityTitle}
              items={activity}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            <ProgressPanel
              kicker={dashboardCopy.kickerProgress}
              title={dashboardCopy.progressTitle}
              tasks={tasks}
            />
            <UsageBarsPanel
              kicker={dashboardCopy.kickerUsage}
              title={dashboardCopy.usageTitle}
              bars={usage}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'divider' }} />

        <Typography variant="caption" color="text.disabled" display="block" textAlign="center">
          {dashboardCopy.footerNote}
        </Typography>
      </DashboardContentFrame>
    </DashboardShell>
  );
}
