const jwt = require("jsonwebtoken");
const { getJwtConfig } = require("../config/jwt.config");
const { AppError } = require("../utils/app-error");

function buildAccessTokenPayload(user) {
  return {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    clientId: user.clientId,
  };
}

function signAccessToken(user) {
  const { accessSecret, accessExpiresIn } = getJwtConfig();

  return jwt.sign(buildAccessTokenPayload(user), accessSecret, {
    expiresIn: accessExpiresIn,
  });
}

function verifyAccessToken(token) {
  const { accessSecret } = getJwtConfig();

  try {
    return jwt.verify(String(token), accessSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Access token süresi dolmuş.", 401, "ACCESS_TOKEN_EXPIRED");
    }

    throw new AppError("Geçersiz access token.", 401, "ACCESS_TOKEN_INVALID");
  }
}

module.exports = {
  buildAccessTokenPayload,
  signAccessToken,
  verifyAccessToken,
};
