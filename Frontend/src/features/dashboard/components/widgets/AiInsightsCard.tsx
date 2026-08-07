'use client';

import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import { AutoAwesome, ArrowForward } from '@mui/icons-material';
import type { DashboardAiInsight } from '../../types';
import { dashboardTokens } from '../../styles/dashboardTokens';
import { StrengthMetric } from '../common/StrengthMetric';
import { InsightMetricTile } from '../common/InsightMetricTile';

interface AiInsightsCardProps {
  insight: DashboardAiInsight;
}

export function AiInsightsCard({ insight }: AiInsightsCardProps) {
  const { colors, fonts, radius, gradients, shadows } = dashboardTokens;

  return (
    <Box
      sx={{
        gridColumn: { xs: 'span 1', lg: 'span 2' },
        borderRadius: radius.lg,
        p: 5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: shadows.aiGlow,
        border: '1px solid transparent',
        background: `linear-gradient(${colors.surfaceContainerLowest}, ${colors.surfaceContainerLowest}) padding-box, ${gradients.aiBorder} border-box`,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesome sx={{ color: colors.secondary, fontSize: 22 }} />
          <Typography
            component="h3"
            sx={{
              fontFamily: fonts.display,
              fontSize: 20,
              lineHeight: '28px',
              fontWeight: 700,
              color: colors.onSurface,
            }}
          >
            {insight.title}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: '24px',
            fontWeight: 400,
            color: colors.onSurfaceVariant,
            mb: 5,
            maxWidth: 576,
          }}
        >
          {insight.body}{' '}
          <Box component="span" sx={{ color: colors.secondary, fontWeight: 700 }}>
            {insight.suggestionLabel}
          </Box>{' '}
          {insight.suggestionText}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 5,
          }}
        >
          {insight.metrics.map((metric) =>
            metric.progressPercent != null ? (
              <StrengthMetric
                key={metric.id}
                label={metric.label}
                value={metric.value}
                progressPercent={metric.progressPercent}
              />
            ) : (
              <InsightMetricTile key={metric.id} label={metric.label} value={metric.value} />
            )
          )}
        </Box>
      </Box>

      <Button
        component={Link}
        href={insight.ctaHref}
        endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
        sx={{
          alignSelf: 'flex-start',
          px: 3,
          py: 2,
          borderRadius: radius.md,
          bgcolor: colors.primary,
          color: colors.onPrimary,
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: '16px',
          letterSpacing: '0.01em',
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': { bgcolor: colors.primary, opacity: 0.9 },
        }}
      >
        {insight.ctaLabel}
      </Button>
    </Box>
  );
}
