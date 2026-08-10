'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { CompanyCvOptimizerView } from '@/features/company-cv-optimizer';

export default function CompanyBasedCvEditorPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      }
    >
      <CompanyCvOptimizerView />
    </Suspense>
  );
}
