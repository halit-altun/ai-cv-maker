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
import { authCopy, getVerifySubtitle } from '../constants/copy';
import { useRegister } from '../hooks/useRegister';

export function RegisterForm() {
  const {
    step,
    fullName,
    email,
    password,
    confirmPassword,
    code,
    showPassword,
    showConfirmPassword,
    loading,
    resending,
    error,
    info,
    expiresInMinutes,
    setFullName,
    setEmail,
    setPassword,
    setConfirmPassword,
    setCode,
    setShowPassword,
    setShowConfirmPassword,
    handleRegisterSubmit,
    handleVerifySubmit,
    handleResendCode,
  } = useRegister();

  const { colors, fonts, radius } = dashboardTokens;

  if (step === 'verify') {
    return (
      <Box component="form" onSubmit={handleVerifySubmit} noValidate sx={{ width: '100%' }}>
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
          {authCopy.verifyTitle}
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
          {getVerifySubtitle(email)}
          {expiresInMinutes
            ? ` Kod ${expiresInMinutes} dakika geçerlidir.`
            : ''}
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: radius.md }}>
            {error}
          </Alert>
        ) : null}
        {info ? (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: radius.md }}>
            {info}
          </Alert>
        ) : null}

        <TextField
          fullWidth
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          label={authCopy.verifyCodeLabel}
          placeholder={authCopy.verifyCodePlaceholder}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={loading}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || code.length !== 6}
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
          {loading ? authCopy.verifySubmitting : authCopy.verifySubmit}
        </Button>

        <Button
          type="button"
          fullWidth
          variant="text"
          onClick={handleResendCode}
          disabled={loading || resending}
          sx={{
            mt: 1.5,
            py: 1.1,
            fontWeight: 600,
            color: colors.secondary,
          }}
        >
          {resending ? authCopy.resendingCode : authCopy.resendCode}
        </Button>

        <Typography
          sx={{
            mt: 3,
            textAlign: 'center',
            fontSize: 14,
            color: colors.onSurfaceVariant,
          }}
        >
          {authCopy.hasAccount}{' '}
          <MuiLink
            component={NextLink}
            href={appRoutes.login}
            underline="hover"
            sx={{ fontWeight: 600, color: colors.secondary }}
          >
            {authCopy.loginCta}
          </MuiLink>
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleRegisterSubmit} noValidate sx={{ width: '100%' }}>
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
        {authCopy.registerTitle}
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
        {authCopy.registerSubtitle}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: radius.md }}>
          {error}
        </Alert>
      ) : null}

      <TextField
        fullWidth
        type="text"
        autoComplete="name"
        label={authCopy.fullNameLabel}
        placeholder={authCopy.fullNamePlaceholder}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />

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
        autoComplete="new-password"
        label={authCopy.passwordLabel}
        placeholder={authCopy.passwordPlaceholder}
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
        disabled={loading || !email.trim() || !password || !confirmPassword}
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
        {loading ? authCopy.registerSubmitting : authCopy.registerSubmit}
      </Button>

      <Typography
        sx={{
          mt: 3,
          textAlign: 'center',
          fontSize: 14,
          color: colors.onSurfaceVariant,
        }}
      >
        {authCopy.hasAccount}{' '}
        <MuiLink
          component={NextLink}
          href={appRoutes.login}
          underline="hover"
          sx={{ fontWeight: 600, color: colors.secondary }}
        >
          {authCopy.loginCta}
        </MuiLink>
      </Typography>
    </Box>
  );
}
