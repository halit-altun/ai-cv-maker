const mongoose = require("mongoose");

const mailOpenEventSchema = new mongoose.Schema(
  {
    mailId: {
      type: String,
      required: true,
      index: true,
    },
    ip: String,
    userAgent: String,
    referer: String,
    // Bot detection
    openedInSeconds: Number, // Gönderimden kaç saniye sonra açıldı
    isLikelyBot: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index'ler
mailOpenEventSchema.index({ mailId: 1, createdAt: -1 });

const MailOpenEvent = mongoose.model("MailOpenEvent", mailOpenEventSchema);

module.exports = MailOpenEvent;
