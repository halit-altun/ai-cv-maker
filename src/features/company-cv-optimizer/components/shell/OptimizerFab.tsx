'use client';

import { Box, IconButton, Tooltip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

/** HTML: AI Assistant Persistent Bubble */
export function OptimizerFab() {
  const { shadows, gradients } = dashboardTokens;

  return (
    <Tooltip title="AI Asistanına Sor" placement="left">
      <IconButton
        aria-label="AI Asistanı"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          background: gradients.aiFab,
          color: '#ffffff',
          boxShadow: shadows.fab,
          zIndex: 50,
          overflow: 'hidden',
          '&:hover': {
            transform: 'scale(1.1)',
            background: gradients.aiFab,
          },
          transition: 'transform 0.2s ease',
        }}
      >
        <SmartToyIcon sx={{ fontSize: 28 }} />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(255,255,255,0.1)',
            opacity: 0,
            transition: 'opacity 0.2s',
            filter: 'blur(8px)',
            '.MuiIconButton-root:hover &': { opacity: 1 },
          }}
        />
      </IconButton>
    </Tooltip>
  );
}
