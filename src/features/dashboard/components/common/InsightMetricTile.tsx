'use client';

import { Box, Typography } from '@mui/material';
import { dashboardTokens } from '../../styles/dashboardTokens';

interface InsightMetricTileProps {
  label: string;
  value: string;
}

/** Keywords / Top Match gibi basit metrik kutusu */
export function InsightMetricTile({ label, value }: InsightMetricTileProps) {
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
      <Typography
        sx={{
          fontFamily: fonts.display,
          fontSize: 20,
          lineHeight: '28px',
          fontWeight: 700,
          mt: 0.5,
          color: colors.onSurface,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
