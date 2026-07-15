'use client';

import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import { AutoFixHigh } from '@mui/icons-material';
import type { AiRecommendation } from '../../types';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { myCvsCopy } from '../../constants/copy';

interface AiRecommendationCardProps {
  recommendation: AiRecommendation;
}

export function AiRecommendationCard({ recommendation }: AiRecommendationCardProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        bgcolor: colors.secondaryContainer,
        color: colors.onSecondaryContainer,
        borderRadius: radius.lg,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 240,
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <AutoFixHigh sx={{ fontSize: 40, mb: 2 }} />
        <Typography
          component="h3"
          sx={{
            fontFamily: fonts.display,
            fontSize: 20,
            lineHeight: '28px',
            fontWeight: 600,
            mb: 1,
          }}
        >
          {recommendation.title || myCvsCopy.aiRecTitle}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: '24px',
            fontWeight: 400,
            opacity: 0.9,
            mb: 5,
          }}
        >
          {recommendation.body}
        </Typography>
        <Button
          component={Link}
          href={recommendation.ctaHref}
          sx={{
            px: 3,
            py: 2,
            borderRadius: radius.md,
            bgcolor: colors.onSecondaryContainer,
            color: colors.secondary,
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 3,
            '&:hover': {
              bgcolor: colors.onSecondaryContainer,
              transform: 'scale(1.05)',
            },
            transition: 'transform 0.2s',
          }}
        >
          {recommendation.ctaLabel || myCvsCopy.fixNow}
        </Button>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          right: -32,
          bottom: -32,
          width: 128,
          height: 128,
          borderRadius: radius.full,
          bgcolor: 'rgba(255,255,255,0.1)',
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
