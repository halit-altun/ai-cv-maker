const {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
  updateCurrentUserProfile,
  updateCurrentUserPhoto,
  deleteCurrentUserPhoto,
} = require("../services/auth.service");
const {
  changePassword,
  requestPasswordReset,
  resetPassword,
} = require("../services/password.service");
const { isAppError } = require("../utils/app-error");
const {
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
} = require("../config/cookie.config");

function getClientMeta(req) {
  return {
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || req.socket?.remoteAddress || "",
  };
}

function sendError(res, error) {
  if (isAppError(error)) {
    const body = {
      ok: false,
      message: error.message,
      code: error.code,
    };
    if (error.details != null) {
      body.details = error.details;
    }
    return res.status(error.statusCode || 500).json(body);
  }

  return null;
}

async function registerHandler(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "E-posta ve şifre zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await register({ email, password, fullName, role });
    return res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function verifyEmailHandler(req, res, next) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({
        ok: false,
        message: "E-posta ve doğrulama kodu zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await verifyEmail(email, code);
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function resendVerificationHandler(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-posta zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await resendVerificationCode(email);
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "E-posta ve şifre zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await login(email, password, getClientMeta(req));
    setAuthCookies(res, result);
    return res.json({
      ok: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function refreshHandler(req, res, next) {
  try {
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        message: "refreshToken zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await refresh(refreshToken, getClientMeta(req));
    setAuthCookies(res, result);
    return res.json({
      ok: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function logoutHandler(req, res, next) {
  try {
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const result = await logout(refreshToken);
    clearAuthCookies(res);

    return res.json({
      ok: true,
      message: "Oturum kapatıldı. İstemci tarafındaki credential bilgilerini silin.",
      ...result,
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function logoutAllHandler(req, res, next) {
  try {
    const result = await logoutAll(req.user.id);
    clearAuthCookies(res);
    return res.json({
      ok: true,
      message: "Tüm oturumlar kapatıldı. İstemci tarafındaki credential bilgilerini silin.",
      ...result,
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function meHandler(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);
    return res.json({ ok: true, user });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function updateMeHandler(req, res, next) {
  try {
    const {
      fullName,
      firstName,
      lastName,
      title,
      contactEmail,
      phone,
      country,
      city,
      linkedinUrl,
      portfolioUrl,
      githubUrl,
      autoSendOutreachAfterAnalysis,
      preferredAiProvider,
      gmailSendIntervalMinMinutes,
      gmailSendIntervalMaxMinutes,
      enableMailTracking,
    } = req.body || {};

    const user = await updateCurrentUserProfile(req.user.id, {
      fullName,
      firstName,
      lastName,
      title,
      contactEmail,
      phone,
      country,
      city,
      linkedinUrl,
      portfolioUrl,
      githubUrl,
      autoSendOutreachAfterAnalysis,
      preferredAiProvider,
      gmailSendIntervalMinMinutes,
      gmailSendIntervalMaxMinutes,
      enableMailTracking,
    });

    return res.json({ ok: true, user });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function uploadMePhotoHandler(req, res, next) {
  try {
    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl) {
      return res.status(400).json({
        ok: false,
        message: "imageDataUrl zorunludur (kırpılmış base64).",
        code: "VALIDATION_ERROR",
      });
    }
    const user = await updateCurrentUserPhoto(req.user.id, imageDataUrl);
    return res.json({ ok: true, user });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function deleteMePhotoHandler(req, res, next) {
  try {
    const user = await deleteCurrentUserPhoto(req.user.id);
    return res.json({ ok: true, user });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function changePasswordHandler(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "currentPassword ve newPassword zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await changePassword(req.user.id, currentPassword, newPassword);
    clearAuthCookies(res);

    return res.json({
      ok: true,
      message: "Şifre güncellendi. Yeniden giriş yapın.",
      ...result,
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function forgotPasswordHandler(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-posta zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    await requestPasswordReset(email);

    return res.json({
      ok: true,
      message:
        "Eğer bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.",
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

async function resetPasswordHandler(req, res, next) {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "token ve newPassword zorunludur.",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await resetPassword(token, newPassword);
    clearAuthCookies(res);

    return res.json({
      ok: true,
      message: "Şifre sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.",
      ...result,
    });
  } catch (error) {
    if (sendError(res, error)) {
      return undefined;
    }
    return next(error);
  }
}

module.exports = {
  registerHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
  meHandler,
  updateMeHandler,
  uploadMePhotoHandler,
  deleteMePhotoHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
};
