'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
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
import { useLogin } from '../hooks/useLogin';

export function LoginForm() {
  const {
    email,
    password,
    showPassword,
    rememberMe,
    loading,
    error,
    success,
    setEmail,
    setPassword,
    setShowPassword,
    setRememberMe,
    handleSubmit,
  } = useLogin();

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
        {authCopy.loginTitle}
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
        {authCopy.loginSubtitle}
      </Typography>

      {success ? (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: radius.md }}>
          {success}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: radius.md }}>
          {error}
        </Alert>
      ) : null}

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
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        required
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        label={authCopy.passwordLabel}
        placeholder={authCopy.passwordPlaceholder}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
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
        sx={{ mb: 1 }}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              sx={{ color: colors.secondary }}
            />
          }
          label={
            <Typography sx={{ fontSize: 14, color: colors.onSurfaceVariant }}>
              {authCopy.rememberMe}
            </Typography>
          }
        />
        <MuiLink
          component={NextLink}
          href={appRoutes.forgotPassword}
          underline="hover"
          sx={{ fontSize: 14, fontWeight: 500, color: colors.secondary }}
        >
          {authCopy.forgotPassword}
        </MuiLink>
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading || !email.trim() || !password}
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
        {loading ? authCopy.submitting : authCopy.submit}
      </Button>

      <Typography
        sx={{
          mt: 3,
          textAlign: 'center',
          fontSize: 14,
          color: colors.onSurfaceVariant,
        }}
      >
        {authCopy.noAccount}{' '}
        <MuiLink
          component={NextLink}
          href={appRoutes.register}
          underline="hover"
          sx={{ fontWeight: 600, color: colors.secondary }}
        >
          {authCopy.registerCta}
        </MuiLink>
      </Typography>
    </Box>
  );
}
