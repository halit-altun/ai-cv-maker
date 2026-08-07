/**
 * Global Gemini Rate Limiter
 * Çoklu sekme/paralel istek olsa bile minimum 5-10 sn gecikme sağlar.
 * 429 hatasını önlemek için tüm Gemini istekleri buradan geçer.
 */

const MIN_REQUEST_GAP_MS = 10_000; // 10 saniye zorunlu bekleme
let lastRequestTimestamp = 0;

/**
 * Bir sonraki isteğe kadar beklemesi gereken ms.
 * 0 ise hemen yapabilir.
 */
function getRequiredWaitMs() {
  const now = Date.now();
  const elapsed = now - lastRequestTimestamp;
  const remaining = MIN_REQUEST_GAP_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * İstek yapılabilir mi kontrol et.
 * false ise kaç ms beklemeli bilgisi döner.
 */
function canProceed() {
  const waitMs = getRequiredWaitMs();
  if (waitMs === 0) {
    lastRequestTimestamp = Date.now();
    return { allowed: true, waitMs: 0 };
  }
  return { allowed: false, waitMs };
}

/**
 * Bekle ve sonra devam et (blocking).
 */
async function waitAndProceed() {
  const check = canProceed();
  if (check.allowed) {
    return { waited: false, waitedMs: 0 };
  }

  console.log(`[gemini-rate-limiter] ${check.waitMs / 1000}s bekleniyor (429 önleme)`);
  await new Promise((resolve) => setTimeout(resolve, check.waitMs));

  lastRequestTimestamp = Date.now();
  return { waited: true, waitedMs: check.waitMs };
}

/**
 * Son istek zamanını manuel sıfırla (test/debug için).
 */
function reset() {
  lastRequestTimestamp = 0;
}

module.exports = {
  MIN_REQUEST_GAP_MS,
  getRequiredWaitMs,
  canProceed,
  waitAndProceed,
  reset,
};
