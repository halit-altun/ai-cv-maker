const PasswordResetToken = require("../models/password-reset-token.model");
const { createRefreshTokenValue, hashToken } = require("../utils/token-hash.utils");

function getPasswordResetExpiresMs() {
  const minutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
  return Math.max(minutes, 5) * 60 * 1000;
}

async function createPasswordResetToken(userId) {
  await PasswordResetToken.updateMany(
    { userId, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  const token = createRefreshTokenValue();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + getPasswordResetExpiresMs());

  await PasswordResetToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    token,
    expiresAt,
    expiresInMinutes: Math.round(getPasswordResetExpiresMs() / 60000),
  };
}

async function findValidPasswordResetToken(rawToken) {
  if (!rawToken) {
    return null;
  }

  const record = await PasswordResetToken.findOne({
    tokenHash: hashToken(rawToken),
    usedAt: null,
  }).lean();

  if (!record) {
    return null;
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return record;
}

async function markPasswordResetTokenUsed(tokenHash) {
  return PasswordResetToken.findOneAndUpdate(
    { tokenHash, usedAt: null },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();
}

module.exports = {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  getPasswordResetExpiresMs,
};
