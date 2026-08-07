const RefreshToken = require("../models/refresh-token.model");
const { getJwtConfig } = require("../config/jwt.config");
const { createRefreshTokenValue, hashToken } = require("../utils/token-hash.utils");

async function createRefreshToken(userId, meta = {}) {
  const { refreshExpiresMs } = getJwtConfig();
  const token = createRefreshTokenValue();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + refreshExpiresMs);

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent: meta.userAgent || "",
    ipAddress: meta.ipAddress || "",
  });

  return {
    token,
    expiresAt,
  };
}

async function findValidRefreshToken(rawToken) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const record = await RefreshToken.findOne({ tokenHash }).lean();

  if (!record) {
    return null;
  }

  if (record.revokedAt) {
    return null;
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return record;
}

async function revokeRefreshTokenByHash(tokenHash, replacedByTokenHash = null) {
  return RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    {
      revokedAt: new Date(),
      replacedByTokenHash: replacedByTokenHash || null,
    },
    { new: true }
  ).lean();
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) {
    return null;
  }

  return revokeRefreshTokenByHash(hashToken(rawToken));
}

async function revokeAllRefreshTokensForUser(userId) {
  const result = await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return result.modifiedCount || 0;
}

async function rotateRefreshToken(existingRecord, meta = {}) {
  const created = await createRefreshToken(existingRecord.userId, meta);
  await revokeRefreshTokenByHash(existingRecord.tokenHash, hashToken(created.token));

  return created;
}

module.exports = {
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
};
