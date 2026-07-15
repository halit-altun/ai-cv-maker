'use client';

import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import type { DashboardProfileScore } from '../../types';
import { dashboardTokens } from '../../styles/dashboardTokens';
import { dashboardCopy } from '../../constants/copy';

interface ProfileScoreCardProps {
  profileScore: DashboardProfileScore;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProfileScoreCard({ profileScore }: ProfileScoreCardProps) {
  const { colors, fonts, radius } = dashboardTokens;
  const ratio = profileScore.score / profileScore.maxScore;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <Box
      sx={{
        bgcolor: colors.surfaceContainerLowest,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: radius.lg,
        p: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Box sx={{ position: 'relative', width: 160, height: 160, mb: 3 }}>
        <Box
          component="svg"
          viewBox="0 0 160 160"
          sx={{
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
          }}
        >
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="transparent"
            stroke={colors.surfaceContainerHighest}
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="transparent"
            stroke={colors.secondary}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: 32,
              lineHeight: 1.1,
              fontWeight: 700,
              color: colors.onSurface,
            }}
          >
            {profileScore.score}
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 12,
              lineHeight: '14px',
              letterSpacing: '0.02em',
              fontWeight: 500,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
            }}
          >
            {dashboardCopy.profileScoreLabel}
          </Typography>
        </Box>
      </Box>

      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 16,
          lineHeight: '24px',
          fontWeight: 400,
          color: colors.onSurfaceVariant,
          mb: 2,
        }}
      >
        {profileScore.hint}
      </Typography>

      <Button
        component={Link}
        href={profileScore.ctaHref}
        sx={{
          p: 0,
          minWidth: 0,
          textTransform: 'none',
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: '16px',
          letterSpacing: '0.01em',
          fontWeight: 600,
          color: colors.secondary,
          textDecoration: 'underline',
          '&:hover': {
            bgcolor: 'transparent',
            textDecoration: 'underline',
            color: colors.secondaryFixed,
          },
        }}
      >
        {profileScore.ctaLabel}
      </Button>
    </Box>
  );
}
