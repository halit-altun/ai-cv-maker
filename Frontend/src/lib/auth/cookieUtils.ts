function canUseDocument(): boolean {
  return typeof document !== 'undefined';
}

export function getCookie(name: string): string | null {
  if (!canUseDocument()) {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split('; ');

  for (const part of parts) {
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }

  return null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (!canUseDocument()) {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    'SameSite=Lax',
    secure,
  ]
    .filter(Boolean)
    .join('; ');
}

export function deleteCookie(name: string): void {
  if (!canUseDocument()) {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = [
    `${encodeURIComponent(name)}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
    secure,
  ]
    .filter(Boolean)
    .join('; ');
}
