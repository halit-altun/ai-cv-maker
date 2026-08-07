const { verifyAccessToken } = require("../services/token.service");
const { findActiveUserById, toPublicUser } = require("../services/user.service");
const { AppError, isAppError } = require("../utils/app-error");
const { ACCESS_COOKIE_NAME } = require("../config/cookie.config");

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = String(authorizationHeader).split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function requireAuth(req, res, next) {
  try {
    const token =
      extractBearerToken(req.get("authorization")) ||
      req.cookies?.[ACCESS_COOKIE_NAME];

    if (!token) {
      throw new AppError("Yetkilendirme gerekli.", 401, "UNAUTHORIZED");
    }

    const payload = verifyAccessToken(token);
    const user = await findActiveUserById(payload.sub);

    if (!user) {
      throw new AppError("Kullanıcı bulunamadı veya pasif.", 401, "USER_INACTIVE");
    }

    const headerClientId = String(req.clientId || req.get("x-client-id") || "").trim();
    const userClientId = String(user.clientId || "").trim();

    // Header opsiyonel: /api/auth/me gibi bootstrap uçları clientId'yi öğrenmek için kullanılır.
    // Client bazlı uçlarda zorunluluk requireClientId ile uygulanır.
    if (headerClientId && userClientId && headerClientId !== userClientId) {
      throw new AppError("client_id uyuşmazlığı.", 403, "CLIENT_ID_MISMATCH");
    }

    if (headerClientId && payload.clientId && payload.clientId !== headerClientId) {
      throw new AppError("client_id token ile uyuşmuyor.", 403, "CLIENT_ID_MISMATCH");
    }

    req.auth = {
      token,
      payload,
    };
    req.user = toPublicUser(user);
    req.authClientId = userClientId || null;
    req.clientId = headerClientId || null;

    return next();
  } catch (error) {
    if (isAppError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        code: error.code,
      });
    }

    return next(error);
  }
}

function requireRoles(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((role) => String(role).toLowerCase());

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Yetkilendirme gerekli.",
        code: "UNAUTHORIZED",
      });
    }

    const userRole = String(req.user.role || "").toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        ok: false,
        message: "Bu işlem için yetkiniz yok.",
        code: "FORBIDDEN",
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRoles,
  extractBearerToken,
};
