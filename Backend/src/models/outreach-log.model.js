const mongoose = require("mongoose");

const recipientResultSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["sent", "logged", "failed", "skipped", "invalid", "queued"],
      required: true,
    },
    errorMessage: { type: String, default: "" },
    verifyProvider: { type: String, default: "" },
    verifyResult: { type: String, default: "" },
    mailId: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * Client bazlı şirket outreach logları.
 * Hangi firma/domain, hangi CV, hangi şablon, hangi alıcılar, ne zaman.
 */
const outreachLogSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Opsiyonel proje (DUBAI vb.) — yoksa projesiz / mevcut akış */
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachProject",
      default: null,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    /** Genel durum */
    status: {
      type: String,
      enum: ["success", "partial", "failed", "ai_error", "verify_failed", "analysis_only"],
      required: true,
      index: true,
    },
    subject: { type: String, default: "" },
    /** Mail şablonu gövdesi (kapak mektubu / LinkedIn / standart cold mail) */
    bodyText: { type: String, default: "" },
    /** info@ / contact@ için yönlendirmeli cold mail gövdesi (varsa) */
    infoContactBodyText: { type: String, default: "" },
    templateType: {
      type: String,
      enum: ["cover_letter", "linkedin", "custom", "cold_email", "none"],
      default: "cover_letter",
    },
    cvId: { type: String, default: null },
    cvTitle: { type: String, default: "" },
    cvFileName: { type: String, default: "" },
    /** Gönderim anındaki CV PDF snapshot (Mail Takip indirme) */
    pdfAttachment: {
      filename: { type: String, default: "" },
      contentBase64: { type: String, default: "" },
      contentType: { type: String, default: "application/pdf" },
    },
    selectedCategories: { type: [String], default: [] },
    recipients: { type: [recipientResultSchema], default: [] },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    loggedCount: { type: Number, default: 0 },
    totalRecipients: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
    targetPosition: { type: String, default: "" },
    replyTo: { type: String, default: "" },
    /** Doğrulama özeti (MX / Reacher / EmailVerify) */
    verification: {
      enabled: { type: Boolean, default: false },
      mxOk: { type: Boolean, default: false },
      provider: { type: String, default: "" },
      selectedEmail: { type: String, default: "" },
      selectedEmails: { type: [String], default: [] },
      checks: { type: Array, default: [] },
      warning: { type: String, default: "" },
    },
    sentAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: "outreach_logs",
  }
);

outreachLogSchema.index({ clientId: 1, domain: 1, sentAt: -1 });
outreachLogSchema.index({ clientId: 1, companyName: 1, sentAt: -1 });
outreachLogSchema.index({ clientId: 1, sentAt: -1 });
outreachLogSchema.index({ clientId: 1, projectId: 1, sentAt: -1 });

const OutreachLog = mongoose.model("OutreachLog", outreachLogSchema);

module.exports = OutreachLog;
