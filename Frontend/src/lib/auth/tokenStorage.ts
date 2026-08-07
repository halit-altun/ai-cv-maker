const ACCESS_TOKEN_KEY = 'cvai_access_token';
const REFRESH_TOKEN_KEY = 'cvai_refresh_token';
const USER_KEY = 'cvai_auth_user';

/** Must match Backend cookie names — Next.js middleware gates protected routes with these. */
const ACCESS_COOKIE_NAME = 'cvai_access_token';
const REFRESH_COOKIE_NAME = 'cvai_refresh_token';

const ACCESS_MAX_AGE_SEC = 60 * 60; // 1h
const REFRESH_MAX_AGE_SEC = 60 * 60 * 24 * 90; // 90d

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function canUseDocument(): boolean {
  return typeof document !== 'undefined';
}

/**
 * First-party cookies on the frontend host (e.g. Netlify).
 * Backend httpOnly cookies are set on the API host (Render) and are invisible to
 * Next.js middleware on a different origin — so we mirror tokens here for route guards.
 */
function setClientAuthCookies(accessToken: string, refreshToken: string): void {
  if (!canUseDocument()) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE_NAME}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${ACCESS_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  document.cookie = `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; Path=/; Max-Age=${REFRESH_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function clearClientAuthCookies(): void {
  if (!canUseDocument()) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `${REFRESH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser<T = unknown>(): T | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getClientId(): string | null {
  const user = getStoredUser<{ clientId?: string }>();
  const clientId = String(user?.clientId || '').trim();
  return clientId || null;
}

export function saveSession(params: {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(params.user));
  setClientAuthCookies(params.accessToken, params.refreshToken);
}

export function clearSession(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearClientAuthCookies();
}
