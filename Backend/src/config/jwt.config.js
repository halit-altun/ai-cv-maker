function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`${name} ortam değişkeni tanımlı değil.`);
  }
  return String(value).trim();
}

function getJwtConfig() {
  return {
    accessSecret: requireEnv("JWT_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "90d",
    refreshExpiresMs: parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || "90d"),
  };
}

/**
 * Basit süre ayrıştırıcı: 15m, 7d, 24h, 60s, 90d
 */
function parseDurationToMs(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d+)(s|m|h|d)$/i);

  if (!match) {
    return 90 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

module.exports = {
  getJwtConfig,
  parseDurationToMs,
};
