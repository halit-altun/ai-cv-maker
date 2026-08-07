'use client';

import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import NextLink from 'next/link';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy } from '../constants/copy';
import { useResetPassword } from '../hooks/useResetPassword';

export function ResetPasswordForm() {
  const {
    token,
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    loading,
    error,
    success,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setShowConfirmPassword,
    handleSubmit,
  } = useResetPassword();

  const { colors, fonts, radius } = dashboardTokens;
  const canSubmit = Boolean(token) && !loading;

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
        {authCopy.resetTitle}
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
        {authCopy.resetSubtitle}
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

      {token ? (
        <>
          <TextField
            fullWidth
            required
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            label={authCopy.newPasswordLabel}
            placeholder={authCopy.newPasswordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            helperText={authCopy.passwordHint}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            required
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            label={authCopy.confirmPasswordLabel}
            placeholder={authCopy.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={
                      showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={!canSubmit || !password || !confirmPassword}
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
            {loading ? authCopy.resetSubmitting : authCopy.resetSubmit}
          </Button>
        </>
      ) : (
        <Button
          component={NextLink}
          href={appRoutes.forgotPassword}
          fullWidth
          variant="contained"
          sx={{
            py: 1.4,
            borderRadius: radius.md,
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 15,
            bgcolor: colors.onSurface,
            color: colors.onPrimary,
            boxShadow: 'none',
            textAlign: 'center',
            '&:hover': {
              bgcolor: colors.primaryContainer,
              boxShadow: 'none',
            },
          }}
        >
          {authCopy.forgotSubmit}
        </Button>
      )}

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
