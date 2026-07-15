'use client';

import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useDashboardContent } from '../hooks/useDashboardContent';
import { WelcomeSection } from './widgets/WelcomeSection';
import { AiInsightsCard } from './widgets/AiInsightsCard';
import { ProfileScoreCard } from './widgets/ProfileScoreCard';
import { RecentActivityCard } from './widgets/RecentActivityCard';
import { AiAssistantFab } from './widgets/AiAssistantFab';
import { appRoutes } from '../constants/routes';

/** Dashboard sayfa içeriği — shell AppChrome’dan global gelir */
export function DashboardView() {
  const { welcome, aiInsight, profileScore, activity } = useDashboardContent();
  const router = useRouter();

  return (
    <>
      <WelcomeSection welcome={welcome} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <AiInsightsCard insight={aiInsight} />
        <ProfileScoreCard profileScore={profileScore} />
        <RecentActivityCard
          items={activity}
          onViewAll={() => router.push(appRoutes.myCvs)}
        />
      </Box>

      <AiAssistantFab />
    </>
  );
}
