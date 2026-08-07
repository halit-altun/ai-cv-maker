import { getApiBaseUrl } from './api';
import {
  clearSession,
  getAccessToken,
  getClientId,
  getRefreshToken,
  getStoredUser,
  saveSession,
} from './tokenStorage';
import type { AuthUser } from './types';

let refreshPromise: Promise<boolean> | null = null;
let clientIdPromise: Promise<string | null> | null = null;

function buildAuthHeaders(extra: HeadersInit | undefined, clientId: string | null): Headers {
  const headers = new Headers(extra || {});
  const accessToken = getAccessToken();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (clientId) {
    headers.set('X-Client-Id', clientId);
    headers.set('client_id', clientId);
  }

  return headers;
}

/**
 * clientId eski oturumlarda kayıtlı olmayabilir; /api/auth/me ile tamamlanır.
 */
async function resolveClientId(): Promise<string | null> {
  const stored = getClientId();
  if (stored) return stored;

  if (!clientIdPromise) {
    clientIdPromise = fetch(`${getApiBaseUrl()}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }, null),
    })
      .then(async (response) => {
        if (!response.ok) return null;

        const data = (await response.json()) as { ok?: boolean; user?: AuthUser };
        const clientId = String(data.user?.clientId || '').trim();
        if (data.ok === false || !clientId) return null;

        const currentUser = getStoredUser<AuthUser>();
        saveSession({
          accessToken: getAccessToken() || '',
          refreshToken: getRefreshToken() || '',
          user: { ...(currentUser || {}), ...data.user },
        });

        return clientId;
      })
      .catch(() => null)
      .finally(() => {
        clientIdPromise = null;
      });
  }

  return clientIdPromise;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: getRefreshToken() || undefined }),
    })
      .then(async (response) => {
        if (!response.ok) {
          clearSession();
          return false;
        }

        const data = (await response.json()) as {
          ok?: boolean;
          user?: AuthUser;
          accessToken?: string;
          refreshToken?: string;
        };

        if (
          data.ok === false ||
          !data.user ||
          !data.accessToken ||
          !data.refreshToken ||
          !data.user.clientId
        ) {
          clearSession();
          return false;
        }

        saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        return true;
      })
      .catch(() => {
        clearSession();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * JWT + client_id header'lı yetkili istek istemcisi.
 * Access token süresi dolarsa refresh ile bir kez yeniler ve isteği tekrarlar.
 */
export async function authFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;
  const clientId = await resolveClientId();

  const requestInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers: buildAuthHeaders(init.headers, clientId),
  };

  let response = await fetch(url, requestInit);
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    return response;
  }

  response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: buildAuthHeaders(init.headers, await resolveClientId()),
  });
  return response;
}
