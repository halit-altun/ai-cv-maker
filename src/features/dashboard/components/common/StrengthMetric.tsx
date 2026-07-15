'use client';

import { Box, LinearProgress, Typography } from '@mui/material';
import { dashboardTokens } from '../../styles/dashboardTokens';

interface StrengthMetricProps {
  label: string;
  value: string;
  progressPercent: number;
}

/** AI Insights Strength satırı — ortak progress bileşeni */
export function StrengthMetric({ label, value, progressPercent }: StrengthMetricProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        bgcolor: colors.surfaceContainerLow,
        p: 2,
        borderRadius: radius.md,
      }}
    >
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
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: 20,
            lineHeight: '28px',
            fontWeight: 700,
            color: colors.secondary,
          }}
        >
          {value}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: radius.full,
              bgcolor: colors.outlineVariant,
              '& .MuiLinearProgress-bar': {
                borderRadius: radius.full,
                bgcolor: colors.secondary,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
