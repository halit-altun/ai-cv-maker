'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { ResetPasswordView } from '@/features/auth';

function ResetFallback() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetPasswordView />
    </Suspense>
  );
}
