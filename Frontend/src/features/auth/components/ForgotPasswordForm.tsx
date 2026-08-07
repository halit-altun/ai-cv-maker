'use client';

import {
  Alert,
  Box,
  Button,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import NextLink from 'next/link';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy } from '../constants/copy';
import { useForgotPassword } from '../hooks/useForgotPassword';

export function ForgotPasswordForm() {
  const { email, loading, error, success, submitted, setEmail, handleSubmit } =
    useForgotPassword();
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
      <Typography
        component="h1"
        sx={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: { xs: 28, md: 32 },
          lineHeight: 1.2,
          color: colors.onSurface,
          mb: 1,
        }}
      >
        {authCopy.forgotTitle}
      </Typography>
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.onSurfaceVariant,
          mb: 3.5,
          lineHeight: 1.6,
        }}
      >
        {authCopy.forgotSubtitle}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: radius.md }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: radius.md }}>
          {success}
        </Alert>
      ) : null}

      {!submitted ? (
        <>
          <TextField
            fullWidth
            required
            type="email"
            autoComplete="email"
            label={authCopy.emailLabel}
            placeholder={authCopy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !email.trim()}
            sx={{
              py: 1.4,
              borderRadius: radius.md,
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 15,
              bgcolor: colors.onSurface,
              color: colors.onPrimary,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: colors.primaryContainer,
                boxShadow: 'none',
              },
              '&.Mui-disabled': {
                bgcolor: colors.surfaceContainerHigh,
                color: colors.outline,
              },
            }}
          >
            {loading ? authCopy.forgotSubmitting : authCopy.forgotSubmit}
          </Button>
        </>
      ) : null}

      <Typography
        sx={{
          mt: 3,
          textAlign: 'center',
          fontSize: 14,
          color: colors.onSurfaceVariant,
        }}
      >
        <MuiLink
          component={NextLink}
          href={appRoutes.login}
          underline="hover"
          sx={{ fontWeight: 600, color: colors.secondary }}
        >
          {authCopy.backToLogin}
        </MuiLink>
      </Typography>
    </Box>
  );
}
