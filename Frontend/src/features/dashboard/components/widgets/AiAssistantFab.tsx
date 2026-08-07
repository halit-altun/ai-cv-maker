'use client';

import { Fab } from '@mui/material';
import { SmartToy } from '@mui/icons-material';
import { dashboardCopy } from '../../constants/copy';
import { dashboardTokens } from '../../styles/dashboardTokens';

interface AiAssistantFabProps {
  onClick?: () => void;
}

export function AiAssistantFab({ onClick }: AiAssistantFabProps) {
  const { colors, gradients, shadows } = dashboardTokens;

  return (
    <Fab
      aria-label={dashboardCopy.aiAssistantAria}
      onClick={onClick}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        zIndex: 50,
        background: gradients.aiFab,
        color: colors.onSecondary,
        boxShadow: shadows.fab,
        '&:hover': {
          background: gradients.aiFab,
          opacity: 0.95,
        },
        '&:active': {
          transform: 'scale(0.95)',
        },
        transition: 'transform 0.2s, opacity 0.2s',
      }}
    >
      <SmartToy />
    </Fab>
  );
}
