class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function isAppError(error) {
  return error instanceof AppError || Boolean(error?.statusCode);
}

module.exports = {
  AppError,
  isAppError,
};
