const crypto = require("crypto");
const EmailVerificationToken = require("../models/email-verification-token.model");
const { hashToken } = require("../utils/token-hash.utils");

function getEmailVerifyExpiresMs() {
  const minutes = Number(process.env.EMAIL_VERIFY_EXPIRES_MINUTES || 15);
  return Math.max(minutes, 5) * 60 * 1000;
}

function getEmailVerifyExpiresMinutes() {
  return Math.round(getEmailVerifyExpiresMs() / 60000);
}

function generateVerificationCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

async function createEmailVerificationCode(userId) {
  await EmailVerificationToken.updateMany(
    { userId, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  const code = generateVerificationCode();
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + getEmailVerifyExpiresMs());

  await EmailVerificationToken.create({
    userId,
    codeHash,
    expiresAt,
  });

  return {
    code,
    expiresAt,
    expiresInMinutes: getEmailVerifyExpiresMinutes(),
  };
}

async function findActiveVerificationRecord(userId) {
  return EmailVerificationToken.findOne({
    userId,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

async function markVerificationTokenUsed(tokenId) {
  return EmailVerificationToken.findByIdAndUpdate(
    tokenId,
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();
}

async function incrementVerificationAttempt(tokenId) {
  return EmailVerificationToken.findByIdAndUpdate(
    tokenId,
    { $inc: { attemptCount: 1 } },
    { new: true }
  );
}

module.exports = {
  createEmailVerificationCode,
  findActiveVerificationRecord,
  markVerificationTokenUsed,
  incrementVerificationAttempt,
  getEmailVerifyExpiresMinutes,
  hashToken,
};
