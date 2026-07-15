'use client';

import { Box, Typography } from '@mui/material';
import { Bolt } from '@mui/icons-material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../../constants/copy';

interface CvStrengthBadgeProps {
  percent: number;
}

export function CvStrengthBadge({ percent }: CvStrengthBadgeProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        bgcolor: colors.secondaryContainer,
        color: colors.onSecondaryContainer,
        borderRadius: radius.full,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: '14px',
        letterSpacing: '0.02em',
        fontWeight: 500,
      }}
    >
      <Bolt sx={{ fontSize: 14 }} />
      <Typography component="span" sx={{ font: 'inherit', color: 'inherit' }}>
        {aiCvBuilderCopy.cvStrength}: {percent}%
      </Typography>
    </Box>
  );
}
