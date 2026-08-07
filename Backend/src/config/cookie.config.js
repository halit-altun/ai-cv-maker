const { parseDurationToMs } = require("./jwt.config");

const ACCESS_COOKIE_NAME = "cvai_access_token";
const REFRESH_COOKIE_NAME = "cvai_refresh_token";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
  };
}

function getAccessCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: parseDurationToMs(process.env.JWT_ACCESS_EXPIRES_IN || "1h"),
  };
}

function getRefreshCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || "90d"),
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearAuthCookies(res) {
  const options = getBaseCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, options);
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
};
