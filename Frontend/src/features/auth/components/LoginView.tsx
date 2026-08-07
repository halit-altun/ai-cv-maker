'use client';

import { Box, Link as MuiLink, Typography } from '@mui/material';
import NextLink from 'next/link';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy } from '../constants/copy';
import { LoginForm } from './LoginForm';

export function LoginView() {
  const { colors, fonts, gradients } = dashboardTokens;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
        bgcolor: colors.background,
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 6, lg: 8 },
          position: 'relative',
          overflow: 'hidden',
          background: `
            radial-gradient(1200px 600px at -10% -20%, rgba(70, 72, 212, 0.22), transparent 55%),
            radial-gradient(900px 500px at 110% 10%, rgba(148, 102, 255, 0.18), transparent 50%),
            linear-gradient(160deg, #0f1424 0%, #171c2e 45%, #1a2036 100%)
          `,
          color: '#fff',
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-0.02em',
          }}
        >
          {authCopy.brandName}
        </Typography>

        <Box sx={{ maxWidth: 440 }}>
          <Box
            sx={{
              display: 'inline-block',
              px: 1.5,
              py: 0.5,
              mb: 2.5,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {authCopy.heroEyebrow}
          </Box>
          <Typography
            component="h2"
            sx={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: { md: 40, lg: 44 },
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              mb: 2,
            }}
          >
            {authCopy.heroTitle}
          </Typography>
          <Typography
            sx={{
              fontSize: 16,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.72)',
              maxWidth: 400,
            }}
          >
            {authCopy.heroBody}
          </Typography>
        </Box>

        <Box
          sx={{
            height: 4,
            width: 120,
            borderRadius: 999,
            background: gradients.aiGlowBorder,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: { xs: 3, sm: 5, md: 6, lg: 10 },
          py: { xs: 5, md: 6 },
          bgcolor: colors.surfaceContainerLowest,
        }}
      >
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 24,
              color: colors.onSurface,
            }}
          >
            {authCopy.brandName}
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto' }}>
          <LoginForm />

          <Typography sx={{ mt: 4, textAlign: 'center', fontSize: 13 }}>
            <MuiLink
              component={NextLink}
              href={appRoutes.dashboard}
              underline="hover"
              sx={{ color: colors.outline, fontWeight: 500 }}
            >
              {authCopy.backToHome}
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
