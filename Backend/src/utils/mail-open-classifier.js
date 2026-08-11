/**
 * Mail tracking pixel açılış sınıflandırması.
 *
 * Gerçek: Gmail Image Proxy, güvenlik tarayıcıları, Outlook “link protection”
 * gönderimden saniyeler–dakikalar içinde pixeli çeker. Bu insan “okundu” değildir.
 */

/** Çok hızlı = neredeyse kesin otomatik */
const ULTRA_FAST_SECONDS = 5;

/**
 * Aynı dakika / teslimat tarayıcı penceresi.
 * Birçok kurumsal proxy 15–90 sn içinde prefetch yapar.
 */
const PREFETCH_WINDOW_SECONDS = 90;

/**
 * Bilinen otomatik / proxy User-Agent kalıpları (case-insensitive).
 */
const NON_HUMAN_UA_PATTERNS = [
  /GoogleImageProxy/i,
  /via ggpht\.com GoogleImageProxy/i,
  /YahooMailProxy/i,
  /YahooMail/i,
  /Outlook-iOS/i, // sık prefetch; tek başına zayıf sinyal — zaman ile birlikte
  /Microsoft Office/i,
  /MSOffice/i,
  /Proofpoint/i,
  /Barracuda/i,
  /Mimecast/i,
  /FireEye/i,
  /Symantec/i,
  /Messagelabs/i,
  /Trustwave/i,
  /SpamAssassin/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /Go-http-client/i,
  /Java\//i,
  /Apache-HttpClient/i,
  /bot\b/i,
  /spider\b/i,
  /crawler\b/i,
  /preview/i,
  /url.?scan/i,
  /safelinks/i,
  /protection\.outlook\.com/i,
];

/** Manuel UI simülasyonu — insan sayılır */
const HUMAN_UA_ALLOWLIST = [/manual-simulate-open/i];

/**
 * @param {object} params
 * @param {number} params.openedInSeconds gönderimden sonra geçen sn (floor)
 * @param {string} [params.userAgent]
 * @param {string} [params.ip]
 * @param {string} [params.referer]
 * @returns {{
 *   isLikelyBot: boolean,
 *   countsAsHumanOpen: boolean,
 *   reason: string,
 *   openedInSeconds: number,
 *   matchedUaPattern: string | null,
 * }}
 */
function classifyMailOpen({
  openedInSeconds,
  userAgent = "",
  ip = "",
  referer = "",
} = {}) {
  const seconds = Number.isFinite(Number(openedInSeconds))
    ? Math.max(0, Math.floor(Number(openedInSeconds)))
    : 0;
  const ua = String(userAgent || "");
  const ref = String(referer || "");

  if (HUMAN_UA_ALLOWLIST.some((re) => re.test(ua))) {
    return {
      isLikelyBot: false,
      countsAsHumanOpen: true,
      reason: "manual_simulate",
      openedInSeconds: seconds,
      matchedUaPattern: "manual-simulate-open",
    };
  }

  if (seconds < ULTRA_FAST_SECONDS) {
    return {
      isLikelyBot: true,
      countsAsHumanOpen: false,
      reason: "ultra_fast",
      openedInSeconds: seconds,
      matchedUaPattern: null,
    };
  }

  const uaHit = NON_HUMAN_UA_PATTERNS.find((re) => re.test(ua));
  if (uaHit) {
    return {
      isLikelyBot: true,
      countsAsHumanOpen: false,
      reason: "ua_proxy_or_scanner",
      openedInSeconds: seconds,
      matchedUaPattern: String(uaHit),
    };
  }

  if (/googleusercontent\.com|ggpht\.com|protection\.outlook\.com/i.test(ref)) {
    return {
      isLikelyBot: true,
      countsAsHumanOpen: false,
      reason: "referer_proxy",
      openedInSeconds: seconds,
      matchedUaPattern: null,
    };
  }

  // Aynı dakika civarı + boş/minimal UA → şüpheli prefetch
  if (seconds < PREFETCH_WINDOW_SECONDS) {
    const uaTrim = ua.trim();
    if (!uaTrim || uaTrim.length < 12) {
      return {
        isLikelyBot: true,
        countsAsHumanOpen: false,
        reason: "prefetch_window_empty_ua",
        openedInSeconds: seconds,
        matchedUaPattern: null,
      };
    }
    // Prefetch penceresinde bilinen tarayıcı dışı kısa UA
    if (
      !/Mozilla|Chrome|Safari|Firefox|Edg\//i.test(ua) &&
      seconds < PREFETCH_WINDOW_SECONDS
    ) {
      return {
        isLikelyBot: true,
        countsAsHumanOpen: false,
        reason: "prefetch_window_non_browser_ua",
        openedInSeconds: seconds,
        matchedUaPattern: null,
      };
    }
    // Gmail proxy çoğu zaman Mozilla gibi görünür ama GoogleImageProxy içerir — yukarıda yakalandı.
    // Aynı dakika + sadece zaman: konservatif şüphe (aynı-dakika %90 sorunu)
    return {
      isLikelyBot: true,
      countsAsHumanOpen: false,
      reason: "prefetch_window",
      openedInSeconds: seconds,
      matchedUaPattern: null,
    };
  }

  return {
    isLikelyBot: false,
    countsAsHumanOpen: true,
    reason: "human_likely",
    openedInSeconds: seconds,
    matchedUaPattern: null,
  };
}

/**
 * Tracking dokümanına uygulanacak güncelleme kararı (saf, DB yok).
 * @param {object} tracking lean/plain tracking alanları
 * @param {ReturnType<typeof classifyMailOpen>} classification
 * @param {Date} now
 */
function decideMailOpenUpdate(tracking, classification, now = new Date()) {
  const openedCount = Number(tracking?.openedCount || 0);
  const prefetchCount = Number(tracking?.prefetchCount || 0);
  const status = String(tracking?.status || "SENT");

  if (!classification.countsAsHumanOpen) {
    return {
      openedCount,
      prefetchCount: prefetchCount + 1,
      status, // OPENED'a çekme
      isLikelyBot: openedCount === 0 ? true : Boolean(tracking?.isLikelyBot),
      firstOpenedAt: tracking?.firstOpenedAt || null,
      lastOpenedAt: tracking?.lastOpenedAt || null,
      firstPrefetchAt: tracking?.firstPrefetchAt || now,
      lastPrefetchAt: now,
      countedAsHuman: false,
    };
  }

  return {
    openedCount: openedCount + 1,
    prefetchCount,
    status: "OPENED",
    isLikelyBot: false,
    firstOpenedAt: tracking?.firstOpenedAt || now,
    lastOpenedAt: now,
    firstPrefetchAt: tracking?.firstPrefetchAt || null,
    lastPrefetchAt: tracking?.lastPrefetchAt || null,
    countedAsHuman: true,
  };
}

module.exports = {
  ULTRA_FAST_SECONDS,
  PREFETCH_WINDOW_SECONDS,
  NON_HUMAN_UA_PATTERNS,
  classifyMailOpen,
  decideMailOpenUpdate,
};
