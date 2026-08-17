const mongoose = require("mongoose");

const mailTrackingSchema = new mongoose.Schema(
  {
    mailId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    company: String,
    jobTitle: String,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachProject",
      index: true,
      default: null,
    },
    projectName: String,
    status: {
      type: String,
      enum: ["SENT", "DELIVERED", "OPENED", "FAILED"],
      default: "SENT",
      index: true,
    },
    openedCount: {
      type: Number,
      default: 0,
    },
    /**
     * Gönderimden en az 5 sn sonraki açılış sayısı.
     * İlk 5 sn içindeki pixel tetikleri (proxy/önizleme) dahil edilmez.
     */
    bilateralOpenCount: {
      type: Number,
      default: 0,
    },
    firstOpenedAt: Date,
    lastOpenedAt: Date,
    isLikelyBot: {
      type: Boolean,
      default: false,
    },
    /**
     * Kullanıcı bildirimi: mail gelen kutusu mu spam mi?
     * Bu, spam risk skorunda en güçlü yerel outcome sinyalidir.
     */
    deliveryOutcome: {
      type: String,
      enum: ["unknown", "inbox", "spam"],
      default: "unknown",
      index: true,
    },
    deliveryOutcomeAt: {
      type: Date,
      default: null,
    },
    // Metadata
    subject: String,
    /** Gönderim anı LinkedIn snapshot (Mail Takip — OutreachLog bağımsız) */
    linkedinMessageText: { type: String, default: "" },
    linkedinInfoContactMessageText: { type: String, default: "" },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    // Outreach log reference
    outreachLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachLog",
    },
  },
  {
    timestamps: true,
  }
);

// Index'ler
mailTrackingSchema.index({ userId: 1, status: 1 });
mailTrackingSchema.index({ userId: 1, createdAt: -1 });
mailTrackingSchema.index({ mailId: 1, userId: 1 });

const MailTracking = mongoose.model("MailTracking", mailTrackingSchema);

module.exports = MailTracking;
