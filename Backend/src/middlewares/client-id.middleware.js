const { AppError } = require("../utils/app-error");

/**
 * Tüm isteklerde X-Client-Id / client_id header'ını req.clientId olarak bağlar.
 */
function attachClientId(req, _res, next) {
  const raw =
    req.get("x-client-id") ||
    req.get("client_id") ||
    req.get("client-id") ||
    "";

  req.clientId = String(raw).trim() || null;
  return next();
}

/**
 * Client bazlı endpoint'lerde client_id zorunlu ve oturumla eşleşmeli.
 */
function requireClientId(req, res, next) {
  if (!req.clientId) {
    return res.status(400).json({
      ok: false,
      message: "client_id header zorunludur (X-Client-Id).",
      code: "CLIENT_ID_REQUIRED",
    });
  }

  if (req.authClientId && req.clientId !== req.authClientId) {
    return res.status(403).json({
      ok: false,
      message: "client_id uyuşmazlığı.",
      code: "CLIENT_ID_MISMATCH",
    });
  }

  return next();
}

module.exports = {
  attachClientId,
  requireClientId,
};
