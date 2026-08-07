const mongoose = require("mongoose");

/**
 * SPF / DKIM / DMARC / MX DNS kontrol sonucu — günde bir kez sorgulanır.
 */
const mailInfraCacheSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    checkedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "mail_infra_cache",
  }
);

const MailInfraCache = mongoose.model("MailInfraCache", mailInfraCacheSchema);

module.exports = MailInfraCache;
