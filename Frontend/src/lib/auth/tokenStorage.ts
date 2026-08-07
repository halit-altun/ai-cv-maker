import { deleteCookie, getCookie, setCookie } from './cookieUtils';

/** Must match Next.js middleware cookie names. */
export const AUTH_COOKIE_KEYS = {
  accessToken: 'cvai_access_token',
  refreshToken: 'cvai_refresh_token',
  refreshExpiresAt: 'cvai_refresh_expires_at',
  clientId: 'cvai_client_id',
} as const;

const USER_SESSION_KEY = 'cvai_auth_user_session';
const LEGACY_LOCAL_KEYS = [
  'cvai_access_token',
  'cvai_refresh_token',
  'cvai_auth_user',
] as const;

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function canUseWindow(): boolean {
  return typeof window !== 'undefined';
}

function clearLegacyLocalStorage(): void {
  if (!canUseWindow()) return;
  LEGACY_LOCAL_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
  });
}

function persistUserBackup(user: unknown): void {
  if (!canUseWindow()) return;
  try {
    window.sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  } catch {
    // ignore quota / private mode
  }
}

function readUserBackup<T = unknown>(): T | null {
  if (!canUseWindow()) return null;
  try {
    const raw = window.sessionStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clearUserBackup(): void {
  if (!canUseWindow()) return;
  try {
    window.sessionStorage.removeItem(USER_SESSION_KEY);
  } catch {
    // ignore
  }
}

function resolveRefreshExpiresAt(refreshTokenExpiresAt?: string): string {
  if (refreshTokenExpiresAt) return refreshTokenExpiresAt;
  return new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000).toISOString();
}

export function getAccessToken(): string | null {
  return getCookie(AUTH_COOKIE_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return getCookie(AUTH_COOKIE_KEYS.refreshToken);
}

export function getClientId(): string | null {
  const fromCookie = String(getCookie(AUTH_COOKIE_KEYS.clientId) || '').trim();
  if (fromCookie) return fromCookie;
  const user = getStoredUser<{ clientId?: string }>();
  const clientId = String(user?.clientId || '').trim();
  return clientId || null;
}

export function getStoredUser<T = unknown>(): T | null {
  return readUserBackup<T>();
}

export function saveSession(params: {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt?: string;
  user: unknown;
}): void {
  if (!params.accessToken || !params.refreshToken) {
    persistUserBackup(params.user);
    return;
  }

  const refreshExpiresAt = resolveRefreshExpiresAt(params.refreshTokenExpiresAt);
  const clientId =
    params.user &&
    typeof params.user === 'object' &&
    'clientId' in params.user
      ? String((params.user as { clientId?: string }).clientId || '').trim()
      : '';

  setCookie(
    AUTH_COOKIE_KEYS.accessToken,
    params.accessToken,
    ACCESS_TOKEN_MAX_AGE_SECONDS
  );
  setCookie(
    AUTH_COOKIE_KEYS.refreshToken,
    params.refreshToken,
    REFRESH_TOKEN_MAX_AGE_SECONDS
  );
  setCookie(
    AUTH_COOKIE_KEYS.refreshExpiresAt,
    refreshExpiresAt,
    REFRESH_TOKEN_MAX_AGE_SECONDS
  );
  if (clientId) {
    setCookie(AUTH_COOKIE_KEYS.clientId, clientId, REFRESH_TOKEN_MAX_AGE_SECONDS);
  }

  persistUserBackup(params.user);
  clearLegacyLocalStorage();
}

export function clearSession(): void {
  Object.values(AUTH_COOKIE_KEYS).forEach((key) => {
    deleteCookie(key);
  });
  clearUserBackup();
  clearLegacyLocalStorage();
}
