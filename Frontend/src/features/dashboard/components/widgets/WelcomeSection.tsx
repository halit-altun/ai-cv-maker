'use client';

import { Box, Typography } from '@mui/material';
import type { DashboardWelcome } from '../../types';
import { dashboardTokens } from '../../styles/dashboardTokens';

interface WelcomeSectionProps {
  welcome: DashboardWelcome;
}

export function WelcomeSection({ welcome }: WelcomeSectionProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        mb: 8,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'flex-end' },
        justifyContent: 'space-between',
        gap: 3,
      }}
    >
      <Box>
        <Typography
          component="h1"
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            color: colors.primary,
            mb: 0.5,
            fontSize: { xs: 32, md: 48 },
            lineHeight: { xs: '40px', md: '56px' },
            letterSpacing: { xs: '-0.01em', md: '-0.02em' },
          }}
        >
          {welcome.greeting}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 18,
            lineHeight: '28px',
            fontWeight: 400,
            color: colors.onSurfaceVariant,
          }}
        >
          {welcome.subtitle}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {welcome.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Box
              key={stat.id}
              sx={{
                bgcolor: colors.surfaceContainerLowest,
                border: `1px solid ${colors.outlineVariant}`,
                p: 2,
                borderRadius: radius.lg,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  bgcolor: colors.secondaryFixed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon sx={{ color: colors.secondary, fontSize: 22 }} />
              </Box>
              <Box>
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
                  {stat.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: 20,
                    lineHeight: '28px',
                    fontWeight: 700,
                    color: colors.onSurface,
                  }}
                >
                  {stat.value}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
