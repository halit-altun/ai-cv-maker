/**
 * Gemini Key Round-Robin — sekme arası senkron (localStorage + Web Locks).
 * API key tarayıcıda tutulmaz; yalnızca 0..N-1 indeks claim edilir.
 */

const STORAGE_KEY = 'cv_ai_gemini_rr_key_index';
const STORAGE_KEY_COUNT = 'cv_ai_gemini_rr_key_count';
const LOCK_NAME = 'cv_ai_gemini_rr_lock';
const DEFAULT_KEY_COUNT = 3;

function readKeyCount(): number {
  if (typeof window === 'undefined') return DEFAULT_KEY_COUNT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_COUNT);
    const n = raw ? Number.parseInt(raw, 10) : DEFAULT_KEY_COUNT;
    if (Number.isFinite(n) && n >= 1 && n <= 16) return n;
  } catch {
    /* ignore */
  }
  return DEFAULT_KEY_COUNT;
}

function writeKeyCount(keyCount: number): void {
  if (typeof window === 'undefined') return;
  const n = Math.max(1, Math.min(16, Math.floor(keyCount) || DEFAULT_KEY_COUNT));
  try {
    window.localStorage.setItem(STORAGE_KEY_COUNT, String(n));
  } catch {
    /* ignore */
  }
}

function readIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeIndex(index: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    /* ignore */
  }
}

/** Senkron claim: mevcut indeksi al, sonraki için +1 yaz. */
function claimSync(keyCount: number): number {
  const n = Math.max(1, keyCount);
  const current = readIndex();
  const claimed = ((current % n) + n) % n;
  writeIndex((claimed + 1) % n);
  return claimed;
}

/**
 * Sekmeler arası atomik claim.
 * Web Locks varsa kilit altında; yoksa kısa CAS retry.
 */
export async function claimGeminiKeyIndex(
  keyCount: number = readKeyCount()
): Promise<number> {
  const n = Math.max(1, keyCount);

  if (typeof window === 'undefined') {
    return 0;
  }

  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(LOCK_NAME, { mode: 'exclusive' }, async () => claimSync(n));
  }

  // Fallback: CAS benzeri doğrulama ile birkaç deneme
  for (let attempt = 0; attempt < 25; attempt++) {
    const before = readIndex();
    const claimed = ((before % n) + n) % n;
    const next = (claimed + 1) % n;
    writeIndex(next);
    // Başka sekme aynı anda yazdıysa next tutmaz; tekrar dene
    const after = readIndex();
    if (after === next) {
      return claimed;
    }
    await new Promise((r) => setTimeout(r, 5 + attempt * 2));
  }

  return claimSync(n);
}

/**
 * Backend'in gerçekten kullandığı key sonrası sıradaki indeksi hizala.
 * Retry sırasında farklı key kullanıldıysa localStorage güncellenir.
 */
export function syncGeminiKeyIndexAfterUse(
  usedIndex: number,
  keyCount?: number
): void {
  const n = Math.max(1, keyCount ?? readKeyCount());
  if (keyCount !== undefined) writeKeyCount(n);
  const used = ((Math.floor(usedIndex) % n) + n) % n;
  writeIndex((used + 1) % n);
}

export function getGeminiKeyCount(): number {
  return readKeyCount();
}

export function setGeminiKeyCount(keyCount: number): void {
  writeKeyCount(keyCount);
}
