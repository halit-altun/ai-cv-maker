import type { ClientUiPreferences, ClientUiPreferencesPatch } from './api';

const STORAGE_KEY = 'cvai_client_ui_preferences_v1';

export function readClientUiPreferencesLocalCache(): ClientUiPreferencesPatch | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientUiPreferencesPatch;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeClientUiPreferencesLocalCache(
  patch: ClientUiPreferencesPatch | ClientUiPreferences
): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readClientUiPreferencesLocalCache() || {};
    const next = { ...prev, ...patch };
    delete (next as { updatedAt?: unknown }).updatedAt;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
