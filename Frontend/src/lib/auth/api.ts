import { clearSession, getAccessToken, getRefreshToken, getStoredUser, saveSession } from './tokenStorage';
import type {
  AuthApiError,
  AuthSession,
  AuthUser,
  ForgotPasswordResult,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  ResetPasswordPayload,
  ResetPasswordResult,
  VerifyEmailPayload,
  VerifyEmailResult,
} from './types';

const DEFAULT_API_BASE = 'http://localhost:3011';

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE;
  return raw.replace(/\/$/, '');
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toAuthError(data: Record<string, unknown>, fallback: string): AuthApiError {
  return {
    ok: false,
    message: typeof data.message === 'string' ? data.message : fallback,
    code: typeof data.code === 'string' ? data.code : undefined,
    details: data.details,
  };
}

function parseSession(data: Record<string, unknown>): AuthSession {
  const accessToken = String(data.accessToken || '');
  const refreshToken = String(data.refreshToken || '');
  const user = data.user;

  if (!accessToken || !refreshToken || !user || typeof user !== 'object') {
    throw {
      ok: false,
      message: 'Sunucudan geçersiz oturum yanıtı alındı.',
      code: 'INVALID_SESSION_RESPONSE',
    } satisfies AuthApiError;
  }

  const session: AuthSession = {
    user: user as AuthSession['user'],
    accessToken,
    refreshToken,
    refreshTokenExpiresAt:
      typeof data.refreshTokenExpiresAt === 'string'
        ? data.refreshTokenExpiresAt
        : undefined,
  };

  if (!session.user.clientId) {
    throw {
      ok: false,
      message: 'Oturum yanıtında clientId yok.',
      code: 'CLIENT_ID_MISSING',
    } satisfies AuthApiError;
  }

  saveSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    user: session.user,
  });

  return session;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthSession> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Giriş başarısız. Bilgilerinizi kontrol edin.');
  }

  return parseSession(data);
}

export async function registerRequest(payload: RegisterPayload): Promise<RegisterResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
      fullName: payload.fullName?.trim() || undefined,
    }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Kayıt başarısız. Bilgilerinizi kontrol edin.');
  }

  return {
    requiresEmailVerification: data.requiresEmailVerification !== false,
    email: String(data.email || payload.email.trim().toLowerCase()),
    expiresInMinutes:
      typeof data.expiresInMinutes === 'number' ? data.expiresInMinutes : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

export async function verifyEmailRequest(
  payload: VerifyEmailPayload
): Promise<VerifyEmailResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/verify-email`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim(),
      code: payload.code.trim(),
    }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'E-posta doğrulama başarısız.');
  }

  return {
    verified: data.verified !== false,
    email: String(data.email || payload.email.trim().toLowerCase()),
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

export async function resendVerificationRequest(email: string): Promise<{
  accepted: boolean;
  message?: string;
  expiresInMinutes?: number;
}> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/resend-verification`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Doğrulama kodu gönderilemedi.');
  }

  return {
    accepted: data.accepted !== false,
    message: typeof data.message === 'string' ? data.message : undefined,
    expiresInMinutes:
      typeof data.expiresInMinutes === 'number' ? data.expiresInMinutes : undefined,
  };
}

export async function forgotPasswordRequest(email: string): Promise<ForgotPasswordResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Şifre sıfırlama isteği gönderilemedi.');
  }

  return {
    message:
      typeof data.message === 'string'
        ? data.message
        : 'Eğer bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.',
  };
}

export async function resetPasswordRequest(
  payload: ResetPasswordPayload
): Promise<ResetPasswordResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: payload.token,
      newPassword: payload.newPassword,
    }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Şifre sıfırlama başarısız.');
  }

  return {
    reset: data.reset !== false,
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });
  } finally {
    clearSession();
  }
}

export async function updateProfileRequest(payload: {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  contactEmail?: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  autoSendOutreachAfterAnalysis?: boolean;
  preferredAiProvider?: 'gemini-free' | 'gemini-pro' | 'openai';
  gmailSendIntervalMinSeconds?: number;
  gmailSendIntervalMaxSeconds?: number;
  gmailSendIntervalMinMinutes?: number;
  gmailSendIntervalMaxMinutes?: number;
  enableMailTracking?: boolean;
  persistOutreachHistory?: boolean;
}): Promise<AuthUser> {
  const accessToken = getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Profil güncellenemedi.');
  }

  const user = data.user as AuthUser | undefined;
  if (!user || typeof user !== 'object') {
    throw toAuthError(data, 'Profil yanıtı geçersiz.');
  }

  saveSession({
    accessToken: getAccessToken() || '',
    refreshToken: getRefreshToken() || '',
    user: { ...(getStoredUser<AuthUser>() || {}), ...user },
  });

  return user;
}

export async function uploadProfilePhotoRequest(imageDataUrl: string): Promise<AuthUser> {
  const accessToken = getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/api/auth/me/photo`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ imageDataUrl }),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Fotoğraf yüklenemedi.');
  }
  const user = data.user as AuthUser | undefined;
  if (!user) throw toAuthError(data, 'Fotoğraf yanıtı geçersiz.');
  saveSession({
    accessToken: getAccessToken() || '',
    refreshToken: getRefreshToken() || '',
    user: { ...(getStoredUser<AuthUser>() || {}), ...user },
  });
  return user;
}

export async function deleteProfilePhotoRequest(): Promise<AuthUser> {
  const accessToken = getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/api/auth/me/photo`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const data = await parseJsonSafe(response);
  if (!response.ok || data.ok === false) {
    throw toAuthError(data, 'Fotoğraf silinemedi.');
  }
  const user = data.user as AuthUser | undefined;
  if (!user) throw toAuthError(data, 'Fotoğraf silme yanıtı geçersiz.');
  saveSession({
    accessToken: getAccessToken() || '',
    refreshToken: getRefreshToken() || '',
    user: { ...(getStoredUser<AuthUser>() || {}), ...user },
  });
  return user;
}
