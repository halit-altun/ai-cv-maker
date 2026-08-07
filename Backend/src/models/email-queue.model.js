const mongoose = require("mongoose");

const emailQueueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      index: true,
    },
    priority: {
      type: Number,
      default: 0, // Yüksek sayı = yüksek öncelik
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    // Mail içeriği
    to: [String],
    subject: String,
    bodyText: String, // Plain text
    bodyHtml: String, // HTML with tracking pixel
    fromName: String,
    replyTo: String,
    attachments: [
      {
        filename: String,
        contentBase64: String,
        contentType: String,
      },
    ],
    // Outreach log bilgisi
    companyName: String,
    domain: String,
    cvId: String,
    cvTitle: String,
    selectedCategories: [String],
    // Retry bilgisi
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastError: String,
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index'ler
emailQueueSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
emailQueueSchema.index({ status: 1, scheduledAt: 1 });

const EmailQueue = mongoose.model("EmailQueue", emailQueueSchema);

module.exports = EmailQueue;
