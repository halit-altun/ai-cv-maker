const mongoose = require("mongoose");

const DB_UNAVAILABLE_ERROR_NAMES = new Set([
  "MongooseServerSelectionError",
  "MongoServerSelectionError",
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoTimeoutError",
  "MongoNotConnectedError",
]);

/** Atlas/DNS kesintisi gibi bağlantı kaynaklı hataları ayırt eder (uygulama hatası değil). */
function isDatabaseUnavailableError(error) {
  if (!error) return false;
  if (DB_UNAVAILABLE_ERROR_NAMES.has(error.name)) return true;

  const message = String(error.message || "");
  return /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ReplicaSetNoPrimary/i.test(message);
}

/** 1 = connected; mongoose readyState. */
function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  isDatabaseUnavailableError,
  isDatabaseConnected,
};
