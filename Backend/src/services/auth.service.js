const { comparePassword } = require("../utils/password.utils");
const { AppError } = require("../utils/app-error");
const { hashToken } = require("../utils/token-hash.utils");
const {
  findUserByEmail,
  findActiveUserById,
  createUser,
  updateUserProfile,
  updateUserProfilePhoto,
  deleteUserProfilePhoto,
  toPublicUser,
  ensureClientId,
} = require("./user.service");
const { signAccessToken } = require("./token.service");
const {
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
} = require("./refresh-token.service");
const {
  createEmailVerificationCode,
  findActiveVerificationRecord,
  markVerificationTokenUsed,
  incrementVerificationAttempt,
  getEmailVerifyExpiresMinutes,
} = require("./email-verification.service");
const { sendEmailVerificationCode } = require("./email.service");
const User = require("../models/user.model");

const LOGIN_MAX_ATTEMPTS = Math.max(Number(process.env.LOGIN_MAX_ATTEMPTS || 10), 1);
const LOGIN_FINAL_LOCK_MINUTES = Math.max(
  Number(process.env.LOGIN_FINAL_LOCK_MINUTES || 30),
  1
);
const VERIFY_CODE_MAX_ATTEMPTS = 8;

function extractRequestMeta(meta = {}) {
  return {
    userAgent: meta.userAgent || "",
    ipAddress: meta.ipAddress || "",
  };
}

function getLoginBackoffSeconds(failedAttempts) {
  if (failedAttempts >= LOGIN_MAX_ATTEMPTS) {
    return LOGIN_FINAL_LOCK_MINUTES * 60;
  }
  return Math.min(2 ** failedAttempts, 15 * 60);
}

function getRemainingLockSeconds(user) {
  if (!user?.loginLockUntil) {
    return 0;
  }
  const remainingMs = new Date(user.loginLockUntil).getTime() - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

async function clearLoginLock(userId) {
  await User.findByIdAndUpdate(userId, {
    $set: { failedLoginAttempts: 0, loginLockUntil: null },
  });
}

async function applyFailedLogin(user) {
  const nextAttempts = Number(user.failedLoginAttempts || 0) + 1;
  const delaySeconds = getLoginBackoffSeconds(nextAttempts);
  const loginLockUntil = new Date(Date.now() + delaySeconds * 1000);

  await User.findByIdAndUpdate(user._id, {
    $set: {
      failedLoginAttempts: nextAttempts,
      loginLockUntil,
    },
  });

  const remainingAttempts = Math.max(LOGIN_MAX_ATTEMPTS - nextAttempts, 0);

  if (nextAttempts >= LOGIN_MAX_ATTEMPTS) {
    throw new AppError(
      `Çok fazla hatalı giriş. Hesap ${LOGIN_FINAL_LOCK_MINUTES} dakika kilitlendi.`,
      429,
      "LOGIN_LOCKED",
      {
        retryAfterSeconds: delaySeconds,
        remainingAttempts: 0,
        failedAttempts: nextAttempts,
        maxAttempts: LOGIN_MAX_ATTEMPTS,
      }
    );
  }

  throw new AppError(
    `E-posta veya şifre hatalı. ${delaySeconds} saniye bekleyip tekrar deneyin. Kalan hak: ${remainingAttempts}.`,
    401,
    "INVALID_CREDENTIALS",
    {
      retryAfterSeconds: delaySeconds,
      remainingAttempts,
      failedAttempts: nextAttempts,
      maxAttempts: LOGIN_MAX_ATTEMPTS,
    }
  );
}

function throwIfLoginLocked(user) {
  const remaining = getRemainingLockSeconds(user);
  if (remaining <= 0) {
    return;
  }

  throw new AppError(
    `Çok fazla hatalı giriş denemesi. ${remaining} saniye sonra tekrar deneyin.`,
    429,
    "LOGIN_LOCKED",
    {
      retryAfterSeconds: remaining,
      remainingAttempts: Math.max(
        LOGIN_MAX_ATTEMPTS - Number(user.failedLoginAttempts || 0),
        0
      ),
      failedAttempts: Number(user.failedLoginAttempts || 0),
      maxAttempts: LOGIN_MAX_ATTEMPTS,
    }
  );
}

async function issueSession(user, meta = {}) {
  const accessToken = signAccessToken(user);
  const refresh = await createRefreshToken(user._id, extractRequestMeta(meta));

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

async function sendVerificationForUser(user) {
  const { code, expiresInMinutes } = await createEmailVerificationCode(user._id);
  await sendEmailVerificationCode({
    to: user.email,
    code,
    expiresInMinutes,
  });
  return { expiresInMinutes };
}

async function register(payload) {
  const created = await createUser({
    ...payload,
    emailVerified: false,
  });
  const userDoc = await findUserByEmail(created.email);

  if (!userDoc) {
    throw new AppError("Kayıt sonrası kullanıcı okunamadı.", 500, "USER_CREATE_FAILED");
  }

  const { expiresInMinutes } = await sendVerificationForUser(userDoc);

  return {
    requiresEmailVerification: true,
    email: userDoc.email,
    expiresInMinutes,
    message:
      "Hesap oluşturuldu. E-posta adresinize gönderilen doğrulama kodunu girin.",
  };
}

async function verifyEmail(email, code) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCode = String(code || "").trim();

  if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
    throw new AppError(
      "Geçerli bir e-posta ve 6 haneli kod girin.",
      400,
      "VALIDATION_ERROR"
    );
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user || user.isActive === false) {
    throw new AppError("Geçersiz doğrulama kodu.", 400, "INVALID_VERIFICATION_CODE");
  }

  if (user.emailVerified === true) {
    return {
      verified: true,
      email: user.email,
      message: "E-posta zaten doğrulanmış. Giriş yapabilirsiniz.",
    };
  }

  const record = await findActiveVerificationRecord(user._id);
  if (!record) {
    throw new AppError(
      "Doğrulama kodunun süresi dolmuş. Yeni kod isteyin.",
      400,
      "VERIFICATION_CODE_EXPIRED"
    );
  }

  if (Number(record.attemptCount || 0) >= VERIFY_CODE_MAX_ATTEMPTS) {
    await markVerificationTokenUsed(record._id);
    throw new AppError(
      "Çok fazla hatalı kod denemesi. Yeni kod isteyin.",
      429,
      "VERIFICATION_CODE_LOCKED"
    );
  }

  if (record.codeHash !== hashToken(normalizedCode)) {
    await incrementVerificationAttempt(record._id);
    throw new AppError("Geçersiz doğrulama kodu.", 400, "INVALID_VERIFICATION_CODE");
  }

  await markVerificationTokenUsed(record._id);
  await User.findByIdAndUpdate(user._id, {
    $set: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      loginLockUntil: null,
    },
  });

  return {
    verified: true,
    email: user.email,
    message: "E-posta doğrulandı. Şimdi giriş yapabilirsiniz.",
  };
}

async function resendVerificationCode(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("E-posta zorunludur.", 400, "VALIDATION_ERROR");
  }

  const user = await findUserByEmail(normalizedEmail);

  if (!user || user.isActive === false) {
    return {
      accepted: true,
      email: normalizedEmail,
      expiresInMinutes: getEmailVerifyExpiresMinutes(),
      message: "Eğer bu e-posta kayıtlıysa doğrulama kodu gönderildi.",
    };
  }

  if (user.emailVerified === true) {
    return {
      accepted: true,
      alreadyVerified: true,
      email: user.email,
      message: "E-posta zaten doğrulanmış. Giriş yapabilirsiniz.",
    };
  }

  const { expiresInMinutes } = await sendVerificationForUser(user);

  return {
    accepted: true,
    email: user.email,
    expiresInMinutes,
    message: "Yeni doğrulama kodu e-posta adresinize gönderildi.",
  };
}

async function login(email, password, meta = {}) {
  const user = await findUserByEmail(email);

  if (!user || user.isActive === false) {
    throw new AppError("E-posta veya şifre hatalı.", 401, "INVALID_CREDENTIALS");
  }

  throwIfLoginLocked(user);

  if (
    user.loginLockUntil &&
    new Date(user.loginLockUntil).getTime() <= Date.now() &&
    Number(user.failedLoginAttempts || 0) > 0
  ) {
    if (Number(user.failedLoginAttempts || 0) >= LOGIN_MAX_ATTEMPTS) {
      await clearLoginLock(user._id);
      user.failedLoginAttempts = 0;
      user.loginLockUntil = null;
    }
  }

  if (!user.passwordHash) {
    throw new AppError(
      "Bu hesap için şifre henüz tanımlanmamış.",
      403,
      "PASSWORD_NOT_SET"
    );
  }

  if (user.emailVerified === false) {
    throw new AppError(
      "E-posta adresiniz doğrulanmamış. Lütfen doğrulama kodunu girin.",
      403,
      "EMAIL_NOT_VERIFIED",
      { email: user.email }
    );
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    await applyFailedLogin(user);
  }

  await clearLoginLock(user._id);
  const userWithClient = await ensureClientId(user);
  return issueSession(userWithClient || user, meta);
}

async function refresh(refreshToken, meta = {}) {
  const existing = await findValidRefreshToken(refreshToken);

  if (!existing) {
    throw new AppError(
      "Geçersiz veya süresi dolmuş refresh token.",
      401,
      "REFRESH_TOKEN_INVALID"
    );
  }

  const user = await findActiveUserById(existing.userId);
  if (!user) {
    await revokeRefreshToken(refreshToken);
    throw new AppError("Kullanıcı bulunamadı veya pasif.", 401, "USER_INACTIVE");
  }

  if (user.emailVerified === false) {
    await revokeRefreshToken(refreshToken);
    throw new AppError(
      "E-posta doğrulanmamış. Oturum sonlandırıldı.",
      403,
      "EMAIL_NOT_VERIFIED",
      { email: user.email }
    );
  }

  const rotated = await rotateRefreshToken(existing, extractRequestMeta(meta));
  const accessToken = signAccessToken(user);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: rotated.token,
    refreshTokenExpiresAt: rotated.expiresAt,
  };
}

async function logout(refreshToken) {
  if (!refreshToken) {
    return { revoked: false };
  }

  const revoked = await revokeRefreshToken(refreshToken);
  return { revoked: Boolean(revoked) };
}

async function logoutAll(userId) {
  const count = await revokeAllRefreshTokensForUser(userId);
  return { revokedCount: count };
}

async function getCurrentUser(userId) {
  const user = await findActiveUserById(userId);

  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

async function updateCurrentUserProfile(userId, payload) {
  return updateUserProfile(userId, payload);
}

async function updateCurrentUserPhoto(userId, imageDataUrl) {
  return updateUserProfilePhoto(userId, imageDataUrl);
}

async function deleteCurrentUserPhoto(userId) {
  return deleteUserProfilePhoto(userId);
}

module.exports = {
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
};
