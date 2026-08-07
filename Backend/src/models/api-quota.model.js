const mongoose = require("mongoose");

/**
 * Harici API aylık kullanım sayacı.
 * Yerel sayaç + EMAILVERIFY_MONTHLY_LIMIT (EmailVerify.io).
 */
const apiQuotaSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    /** YYYY-MM (UTC) */
    periodKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    used: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastEmail: {
      type: String,
      default: "",
    },
    lastHttpStatus: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "api_quotas",
  }
);

apiQuotaSchema.index({ service: 1, periodKey: 1 }, { unique: true });

const ApiQuota = mongoose.model("ApiQuota", apiQuotaSchema);

module.exports = ApiQuota;
