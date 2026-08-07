const { comparePassword, hashPassword } = require("../utils/password.utils");
const { assertValidPassword } = require("../utils/password-policy.utils");
const { AppError } = require("../utils/app-error");
const {
  findUserByEmail,
  findActiveUserById,
  updateUserPasswordHash,
} = require("./user.service");
const { revokeAllRefreshTokensForUser } = require("./refresh-token.service");
const {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} = require("./password-reset.service");
const { sendPasswordResetEmail } = require("./email.service");

function buildPasswordResetUrl(token) {
  const baseUrl = String(process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const path = process.env.PASSWORD_RESET_PATH || "/reset-password";
  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await findActiveUserById(userId);

  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  if (!user.passwordHash) {
    throw new AppError(
      "Bu hesap için şifre henüz tanımlanmamış.",
      403,
      "PASSWORD_NOT_SET"
    );
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError("Mevcut şifre hatalı.", 401, "INVALID_CURRENT_PASSWORD");
  }

  const validatedNewPassword = assertValidPassword(newPassword);

  if (currentPassword === validatedNewPassword) {
    throw new AppError(
      "Yeni şifre mevcut şifre ile aynı olamaz.",
      400,
      "PASSWORD_UNCHANGED"
    );
  }

  const passwordHash = await hashPassword(validatedNewPassword);
  await updateUserPasswordHash(userId, passwordHash);
  await revokeAllRefreshTokensForUser(userId);

  return { changed: true };
}

async function requestPasswordReset(email) {
  const user = await findUserByEmail(email);

  if (!user || user.isActive === false) {
    return { accepted: true };
  }

  const reset = await createPasswordResetToken(user._id);
  const resetUrl = buildPasswordResetUrl(reset.token);

  await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
    expiresInMinutes: reset.expiresInMinutes,
  });

  return { accepted: true };
}

async function resetPassword(token, newPassword) {
  const record = await findValidPasswordResetToken(token);

  if (!record) {
    throw new AppError(
      "Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.",
      400,
      "RESET_TOKEN_INVALID"
    );
  }

  const user = await findActiveUserById(record.userId);
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı veya pasif.", 404, "USER_NOT_FOUND");
  }

  const validatedNewPassword = assertValidPassword(newPassword);
  const passwordHash = await hashPassword(validatedNewPassword);

  await updateUserPasswordHash(user._id, passwordHash);
  await markPasswordResetTokenUsed(record.tokenHash);
  await revokeAllRefreshTokensForUser(user._id);

  return { reset: true };
}

module.exports = {
  changePassword,
  requestPasswordReset,
  resetPassword,
  buildPasswordResetUrl,
};
