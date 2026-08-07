const ApiQuota = require("../models/api-quota.model");

const EMAILVERIFY_SERVICE = "emailverify_io";

function currentPeriodKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getEmailVerifyMonthlyLimit() {
  return Math.max(1, Number(process.env.EMAILVERIFY_MONTHLY_LIMIT || 3000));
}

function getEmailVerifyConfigured() {
  return Boolean(String(process.env.EMAILVERIFY_API_KEY || "").trim());
}

async function getEmailVerifyQuotaStatus() {
  const periodKey = currentPeriodKey();
  const limit = getEmailVerifyMonthlyLimit();
  const offset = Math.max(0, Number(process.env.EMAILVERIFY_USAGE_OFFSET || 0));
  const doc = await ApiQuota.findOne({ service: EMAILVERIFY_SERVICE, periodKey }).lean();
  const used = Number(doc?.used || 0) + offset;

  return {
    service: EMAILVERIFY_SERVICE,
    provider: "EmailVerify.io",
    docsUrl: "https://www.emailverify.io/api/docs/",
    configured: getEmailVerifyConfigured(),
    periodKey,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    trackedInApp: Number(doc?.used || 0),
    priorUseOffset: offset,
    lastUsedAt: doc?.lastUsedAt || null,
    lastEmail: doc?.lastEmail || "",
    note:
      "Yerel sayaç: uygulamadaki kullanımlar + EMAILVERIFY_USAGE_OFFSET. Resmi bakiye için EmailVerify paneli / check-account-balance geçerlidir.",
  };
}

/**
 * Kota doluysa false — EmailVerify çağrısı yapılmamalı.
 */
async function canUseEmailVerifyCredit() {
  if (!getEmailVerifyConfigured()) return false;
  const status = await getEmailVerifyQuotaStatus();
  return status.remaining > 0;
}

async function recordEmailVerifyUsage({ email, httpStatus } = {}) {
  const periodKey = currentPeriodKey();
  const updated = await ApiQuota.findOneAndUpdate(
    { service: EMAILVERIFY_SERVICE, periodKey },
    {
      $inc: { used: 1 },
      $set: {
        lastUsedAt: new Date(),
        lastEmail: String(email || "").slice(0, 200),
        lastHttpStatus: httpStatus ?? null,
      },
    },
    { upsert: true, new: true }
  ).lean();

  const limit = getEmailVerifyMonthlyLimit();
  const offset = Math.max(0, Number(process.env.EMAILVERIFY_USAGE_OFFSET || 0));
  const used = Number(updated?.used || 0) + offset;
  return {
    periodKey,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

module.exports = {
  EMAILVERIFY_SERVICE,
  currentPeriodKey,
  getEmailVerifyMonthlyLimit,
  getEmailVerifyQuotaStatus,
  canUseEmailVerifyCredit,
  recordEmailVerifyUsage,
};
