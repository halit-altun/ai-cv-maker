const { AppError } = require("./app-error");

const MIN_PASSWORD_LENGTH = 8;

function assertValidPassword(password) {
  const value = String(password || "");

  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`,
      400,
      "PASSWORD_TOO_SHORT"
    );
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new AppError(
      "Şifre en az bir harf ve bir rakam içermelidir.",
      400,
      "PASSWORD_TOO_WEAK"
    );
  }

  return value;
}

function assertValidEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!value || !emailRegex.test(value)) {
    throw new AppError("Geçerli bir e-posta adresi girin.", 400, "INVALID_EMAIL");
  }

  return value;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  assertValidPassword,
  assertValidEmail,
};
