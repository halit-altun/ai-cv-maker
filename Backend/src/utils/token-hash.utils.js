const crypto = require("crypto");

function createRefreshTokenValue() {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

module.exports = {
  createRefreshTokenValue,
  hashToken,
};
