const crypto = require("crypto");
const MailTracking = require("../models/mail-tracking.model");
const MailOpenEvent = require("../models/mail-open-event.model");

/**
 * Yeni mail tracking kaydı oluştur
 */
async function createMailTracking({
  userId,
  recipient,
  company,
  jobTitle,
  subject,
  outreachLogId,
  projectId,
  projectName,
}) {
  const mailId = crypto.randomUUID();

  const tracking = new MailTracking({
    mailId,
    userId,
    recipient,
    company,
    jobTitle,
    subject,
    status: "SENT",
    sentAt: new Date(),
    outreachLogId,
    projectId: projectId || null,
    projectName: projectName || "",
  });

  await tracking.save();

  console.log(`[MAIL_TRACKING] Created tracking: ${mailId} | recipient: ${recipient}`);

  return {
    mailId,
    tracking,
  };
}

/**
 * Mail açılışını kaydet (pixel tetiklendi)
 */
async function recordMailOpen(mailId, { ip, userAgent, referer } = {}) {
  const tracking = await MailTracking.findOne({ mailId });

  if (!tracking) {
    console.warn(`[MAIL_TRACKING] Tracking not found for mailId: ${mailId}`);
    return { found: false };
  }

  const now = new Date();
  const sentAt = tracking.sentAt || tracking.createdAt;
  const openedInSeconds = Math.floor((now - sentAt) / 1000);

  // Bot detection: 3 saniye içinde açıldıysa muhtemelen bot
  const isLikelyBot = openedInSeconds < 3;

  // MailOpenEvent kaydet
  const openEvent = new MailOpenEvent({
    mailId,
    ip,
    userAgent,
    referer,
    openedInSeconds,
    isLikelyBot,
  });

  await openEvent.save();

  // MailTracking güncelle
  tracking.openedCount += 1;
  tracking.status = "OPENED";

  if (!tracking.firstOpenedAt) {
    tracking.firstOpenedAt = now;
  }

  tracking.lastOpenedAt = now;

  // İlk açılış bot ise işaretle
  if (tracking.openedCount === 1 && isLikelyBot) {
    tracking.isLikelyBot = true;
  }

  await tracking.save();

  console.log(
    `[MAIL_TRACKING] Recorded open: ${mailId} | count: ${tracking.openedCount} | bot: ${isLikelyBot} | ${openedInSeconds}s`
  );

  return {
    found: true,
    tracking,
    openEvent,
    isLikelyBot,
  };
}

/**
 * Mail statüsünü güncelle (DELIVERED/FAILED)
 */
async function updateMailStatus(mailId, status, errorMessage = null) {
  const tracking = await MailTracking.findOne({ mailId });

  if (!tracking) {
    console.warn(`[MAIL_TRACKING] Tracking not found for mailId: ${mailId}`);
    return { found: false };
  }

  tracking.status = status;

  if (errorMessage) {
    tracking.errorMessage = errorMessage;
  }

  await tracking.save();

  console.log(`[MAIL_TRACKING] Updated status: ${mailId} → ${status}`);

  return { found: true, tracking };
}

/**
 * Kullanıcının mail tracking listesini al
 */
async function getUserMailTrackings(userId, { limit = 50, skip = 0, status, projectId, company, startDate, endDate } = {}) {
  const query = { userId };

  if (status) {
    query.status = status;
  }

  if (projectId) {
    query.projectId = projectId;
  }

  if (company) {
    query.company = { $regex: String(company), $options: "i" };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [trackings, total] = await Promise.all([
    MailTracking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    MailTracking.countDocuments(query),
  ]);

  return {
    trackings,
    total,
    limit,
    skip,
  };
}

/**
 * Mail tracking detaylarını al (açılış event'leri ile)
 */
async function getMailTrackingDetails(mailId, userId) {
  const tracking = await MailTracking.findOne({ mailId, userId }).lean();

  if (!tracking) {
    return { found: false };
  }

  const openEvents = await MailOpenEvent.find({ mailId })
    .sort({ createdAt: -1 })
    .lean();

  const pixelUrl = generateTrackingPixelUrl(mailId);
  const trackingBase = getTrackingPublicBaseUrl();

  return {
    found: true,
    tracking,
    openEvents,
    pixelUrl,
    trackingBaseIsLocal: isLocalTrackingBase(trackingBase),
  };
}

/**
 * Kullanıcı outcome bildirimi: inbox | spam | unknown
 */
async function setDeliveryOutcome(mailId, userId, outcome) {
  const allowed = new Set(["inbox", "spam", "unknown"]);
  const value = String(outcome || "").trim().toLowerCase();
  if (!allowed.has(value)) {
    return { ok: false, error: "Geçersiz outcome (inbox|spam|unknown)" };
  }

  const tracking = await MailTracking.findOneAndUpdate(
    { mailId, userId },
    {
      deliveryOutcome: value,
      deliveryOutcomeAt: value === "unknown" ? null : new Date(),
    },
    { new: true }
  ).lean();

  if (!tracking) {
    return { ok: false, error: "Mail tracking bulunamadı" };
  }

  return { ok: true, tracking };
}

/**
 * Production Northflank public API (env yokken son çare).
 * Gmail proxy localhost'a erişemez; pixel her zaman public HTTPS olmalı.
 */
const DEFAULT_PRODUCTION_API_BASE =
  "https://portal--cv-ai-maker--6gvfdf2h8v7d.code.run";

function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim().replace(/\/$/, "");
  return value || "";
}

function isLocalTrackingBase(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/**
 * Express req üzerinden public base (Northflank X-Forwarded-* ile).
 */
function resolveTrackingBaseFromRequest(req) {
  if (!req || typeof req.get !== "function") return "";
  const host = String(
    req.get("x-forwarded-host") || req.get("host") || ""
  )
    .split(",")[0]
    .trim();
  if (!host || isLocalTrackingBase(`http://${host}`)) return "";

  const proto = String(
    req.get("x-forwarded-proto") || req.protocol || "https"
  )
    .split(",")[0]
    .trim()
    .replace(/:$/, "");

  return normalizeBaseUrl(`${proto || "https"}://${host}`);
}

/**
 * Tracking pixel URL tabanı.
 * Öncelik: override → env → production default → localhost (yalnızca local).
 */
function getTrackingPublicBaseUrl(overrideBaseUrl) {
  const candidates = [
    overrideBaseUrl,
    process.env.TRACKING_PUBLIC_BASE_URL,
    process.env.API_BASE_URL,
    process.env.PUBLIC_API_URL,
    process.env.BACKEND_PUBLIC_URL,
  ];

  for (const candidate of candidates) {
    const base = normalizeBaseUrl(candidate);
    if (base && !isLocalTrackingBase(base)) {
      return base;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_API_BASE;
  }

  return normalizeBaseUrl(
    `http://localhost:${process.env.PORT || 3011}`
  );
}

function generateTrackingPixelUrl(mailId, baseUrl) {
  const base = getTrackingPublicBaseUrl(baseUrl);
  const id = String(mailId || "").replace(/\.png$/i, "");
  return `${base}/api/track/pixel/${id}.png`;
}

/**
 * Tracking pixel HTML tag
 */
function generateTrackingPixelHtml(mailId, baseUrl) {
  const pixelUrl = generateTrackingPixelUrl(mailId, baseUrl);
  if (isLocalTrackingBase(pixelUrl)) {
    console.warn(
      `[MAIL_TRACKING] UYARI: Pixel URL localhost (${pixelUrl}). Gmail/Outlook bu adresi açamaz; OPENED kaydı düşmez. TRACKING_PUBLIC_BASE_URL veya API_BASE_URL ayarlayın.`
    );
  } else {
    console.log(`[MAIL_TRACKING] Pixel URL: ${pixelUrl}`);
  }
  // display:none Gmail'de bazen yüklenmez; 1x1 block kullan
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;text-decoration:none;" />`;
}

module.exports = {
  createMailTracking,
  recordMailOpen,
  updateMailStatus,
  getUserMailTrackings,
  getMailTrackingDetails,
  setDeliveryOutcome,
  getTrackingPublicBaseUrl,
  resolveTrackingBaseFromRequest,
  isLocalTrackingBase,
  generateTrackingPixelUrl,
  generateTrackingPixelHtml,
  DEFAULT_PRODUCTION_API_BASE,
};
