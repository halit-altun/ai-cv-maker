import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { OutreachLogsView } from '@/features/outreach-logs';

export default function OutreachLogsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <OutreachLogsView />
    </Suspense>
  );
}
