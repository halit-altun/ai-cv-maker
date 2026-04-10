'use client';

import { Paper } from '@mui/material';
import { dashboardTokens } from '../styles/dashboardTokens';

interface DashboardContentFrameProps {
  children: React.ReactNode;
}

export function DashboardContentFrame({ children }: DashboardContentFrameProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3, md: 3.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: dashboardTokens.contentFrameShadow,
      }}
    >
      {children}
    </Paper>
  );
}
