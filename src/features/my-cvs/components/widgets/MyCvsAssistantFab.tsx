'use client';

import { Box, Fab, Tooltip } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { myCvsCopy } from '../../constants/copy';

interface MyCvsAssistantFabProps {
  onClick?: () => void;
}

export function MyCvsAssistantFab({ onClick }: MyCvsAssistantFabProps) {
  const { colors } = dashboardTokens;

  return (
    <Tooltip title={myCvsCopy.assistantTooltip} placement="left">
      <Fab
        aria-label={myCvsCopy.assistantAria}
        onClick={onClick}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          zIndex: 50,
          bgcolor: colors.secondary,
          color: colors.onSecondary,
          boxShadow: '0 12px 40px rgba(70, 72, 212, 0.4)',
          '&:hover': {
            bgcolor: colors.secondary,
            transform: 'scale(1.1)',
            '& .fab-icon': { transform: 'rotate(12deg)' },
          },
          '&:active': { transform: 'scale(0.95)' },
          transition: 'transform 0.2s',
        }}
      >
        <Box
          className="fab-icon"
          sx={{ display: 'flex', transition: 'transform 0.2s' }}
        >
          <AutoAwesome sx={{ fontSize: 28 }} />
        </Box>
      </Fab>
    </Tooltip>
  );
}
