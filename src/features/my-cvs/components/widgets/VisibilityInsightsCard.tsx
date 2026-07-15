'use client';

import { Box, Typography } from '@mui/material';
import { AnalyticsOutlined } from '@mui/icons-material';
import type { VisibilityInsightBar } from '../../types';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { myCvsCopy } from '../../constants/copy';

interface VisibilityInsightsCardProps {
  bars: VisibilityInsightBar[];
}

export function VisibilityInsightsCard({ bars }: VisibilityInsightsCardProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        gridColumn: { xs: 'span 1', lg: 'span 2' },
        bgcolor: colors.surfaceContainerLowest,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: radius.lg,
        p: 3,
      }}
    >
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: '16px',
          letterSpacing: '0.01em',
          fontWeight: 600,
          color: colors.primary,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <AnalyticsOutlined sx={{ color: colors.secondary, fontSize: 20 }} />
        {myCvsCopy.visibilityTitle}
      </Typography>

      <Box
        sx={{
          height: 192,
          width: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {bars.map((bar) => (
          <Box
            key={bar.id}
            sx={{
              flex: 1,
              height: `${bar.heightPercent}%`,
              borderRadius: `${radius.md} ${radius.md} 0 0`,
              bgcolor: bar.highlighted ? colors.secondary : colors.surfaceContainerLow,
              transition: 'background-color 0.2s',
              '&:hover': {
                bgcolor: bar.highlighted ? colors.secondary : 'rgba(70, 72, 212, 0.2)',
              },
            }}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 2,
        }}
      >
        {bars.map((bar) => (
          <Typography
            key={`${bar.id}-label`}
            sx={{
              flex: 1,
              textAlign: 'center',
              fontFamily: fonts.body,
              fontSize: 12,
              lineHeight: '14px',
              letterSpacing: '0.02em',
              fontWeight: 500,
              color: colors.onSurfaceVariant,
            }}
          >
            {bar.dayLabel}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
