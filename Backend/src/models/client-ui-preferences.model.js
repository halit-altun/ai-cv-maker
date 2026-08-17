const mongoose = require("mongoose");

/**
 * Client bazlı UI tercihleri (toplu başvuru + company-based).
 * Sayfa yenilense / tekrar açılsa aynı seçenekler yüklenir.
 */
const clientUiPreferencesSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetPosition: { type: String, default: "" },
    cvLanguage: {
      type: String,
      enum: ["turkish", "english"],
      default: "turkish",
    },
    outreachEmailLanguageMode: {
      type: String,
      enum: ["auto", "turkish", "english"],
      default: "auto",
    },
    aiSettings: {
      about: { type: Boolean, default: true },
      workExperience: { type: Boolean, default: false },
      skills: { type: Boolean, default: false },
    },
    selectedEmailPrefixCategories: {
      type: [String],
      default: () => ["turkey-hiring"],
    },
    customEmailLocalPartsText: { type: String, default: "" },
    includePrimaryEmailInSend: { type: Boolean, default: true },
    skipPrimaryEmailVerification: { type: Boolean, default: false },
    includeEnteredMainDomainInSend: { type: Boolean, default: false },
    forceResend: { type: Boolean, default: false },
    bulkSendHistoryFilter: {
      type: String,
      enum: ["all", "sent", "unsent"],
      default: "all",
    },
    shouldGenerateCoverLetter: { type: Boolean, default: true },
    coverLetterSource: {
      type: String,
      enum: ["company", "text"],
      default: "company",
    },
    shouldGenerateLinkedInMessage: { type: Boolean, default: false },
    linkedinMessageSource: {
      type: String,
      enum: ["company", "text"],
      default: "company",
    },
    cvAdaptationSource: {
      type: String,
      enum: ["company", "text"],
      default: "company",
    },
    includeCvPhoto: { type: Boolean, default: false },
    shouldSendCompanyEmail: { type: Boolean, default: false },
    outreachCvAttachmentSource: {
      type: String,
      enum: ["optimized", "original"],
      default: "optimized",
    },
    manualMustMentionTopicsText: { type: String, default: "" },
    manualMustNotMentionTopicsText: { type: String, default: "" },
    coverLetterRecipientName: { type: String, default: "" },
    coverLetterCompanyName: { type: String, default: "" },
    /** Son seçilen şirket sayfa tipi (homepage, careers, …) */
    lastCompanyPageType: {
      type: String,
      enum: [
        "homepage",
        "careers",
        "contact",
        "about",
        "blog",
        "products",
        "team",
        "other",
      ],
      default: "homepage",
    },
    lastCompanyPageTypeOther: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "client_ui_preferences",
  }
);

const ClientUiPreferences = mongoose.model(
  "ClientUiPreferences",
  clientUiPreferencesSchema
);

module.exports = ClientUiPreferences;
