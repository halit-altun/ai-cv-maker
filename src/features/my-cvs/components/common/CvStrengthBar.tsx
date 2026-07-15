'use client';

import { Box, LinearProgress, Typography } from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { myCvsCopy } from '../../constants/copy';

interface CvStrengthBarProps {
  percent: number;
}

export function CvStrengthBar({ percent }: CvStrengthBarProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 12,
            lineHeight: '14px',
            letterSpacing: '0.02em',
            fontWeight: 500,
            color: colors.onSurfaceVariant,
          }}
        >
          {myCvsCopy.cvStrength}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
            color: colors.secondary,
          }}
        >
          {percent}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 8,
          borderRadius: radius.full,
          bgcolor: colors.surfaceContainerHighest,
          '& .MuiLinearProgress-bar': {
            borderRadius: radius.full,
            bgcolor: colors.secondary,
          },
        }}
      />
    </Box>
  );
}
