import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MailTrackingView } from '@/features/mail-tracking';

export default function MailTrackingPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <MailTrackingView />
    </Suspense>
  );
}
