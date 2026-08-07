/**
 * Gemini API Key Round-Robin Rotator
 * X → Y → Z → X … (indeks tabanlı; key değerleri gemini.service'te)
 */

const NEXT_KEY_DELAY_MS = 2_000;
const ALL_KEYS_COOLDOWN_MS = 60_000;

/** Sunucu tarafı round-robin sayacı (preferredKeyIndex yoksa) */
let serverRoundRobinIndex = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Atomik claim (Node tek-thread event loop; await arasına girmeyen senkron claim).
 * @param {number} keyCount
 * @returns {number} claim edilen indeks
 */
function claimServerKeyIndex(keyCount) {
  const n = Math.max(1, Number(keyCount) || 1);
  const claimed = ((serverRoundRobinIndex % n) + n) % n;
  serverRoundRobinIndex = claimed + 1;
  return claimed;
}

/**
 * Client preferred index veya sunucu RR.
 * @param {number} keyCount
 * @param {number|null|undefined} preferredKeyIndex
 */
function resolveStartKeyIndex(keyCount, preferredKeyIndex) {
  const n = Math.max(1, Number(keyCount) || 1);
  if (
    preferredKeyIndex !== undefined &&
    preferredKeyIndex !== null &&
    Number.isFinite(Number(preferredKeyIndex))
  ) {
    return ((Number(preferredKeyIndex) % n) + n) % n;
  }
  return claimServerKeyIndex(n);
}

/**
 * Başarılı kullanımdan sonra sunucu sayacını “sonraki key”e hizala.
 * (Client localStorage ile çakışmayı azaltır.)
 */
function advanceServerPastUsed(usedIndex, keyCount) {
  const n = Math.max(1, Number(keyCount) || 1);
  const used = ((Number(usedIndex) % n) + n) % n;
  serverRoundRobinIndex = used + 1;
}

module.exports = {
  NEXT_KEY_DELAY_MS,
  ALL_KEYS_COOLDOWN_MS,
  sleep,
  claimServerKeyIndex,
  resolveStartKeyIndex,
  advanceServerPastUsed,
};
