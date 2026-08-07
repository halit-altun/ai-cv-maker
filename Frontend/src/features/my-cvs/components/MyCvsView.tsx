'use client';

import { Alert, Box, CircularProgress } from '@mui/material';
import { useMyCvsContent } from '../hooks/useMyCvsContent';
import { MyCvsHeader } from './widgets/MyCvsHeader';
import { CvCard } from './widgets/CvCard';
import { CreateCvCard } from './widgets/CreateCvCard';
import { VisibilityInsightsCard } from './widgets/VisibilityInsightsCard';
import { AiRecommendationCard } from './widgets/AiRecommendationCard';
import { MyCvsAssistantFab } from './widgets/MyCvsAssistantFab';

/** My CVs sayfa içeriği — shell AppChrome’dan global gelir */
export function MyCvsView() {
  const { cvs, visibility, recommendation, loading, error } = useMyCvsContent();

  return (
    <>
      <MyCvsHeader />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {!loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {cvs.map((cv, index) => (
            <CvCard key={cv.id} cv={cv} emphasizeOptimize={index === 0} />
          ))}
          <CreateCvCard />
        </Box>
      ) : null}

      {!loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: 3,
            mt: 8,
          }}
        >
          <VisibilityInsightsCard bars={visibility} />
          <AiRecommendationCard recommendation={recommendation} />
        </Box>
      ) : null}

      <MyCvsAssistantFab />
    </>
  );
}
