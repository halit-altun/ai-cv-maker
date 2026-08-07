const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, default: null },
    fullName: { type: String, trim: true, default: "" },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    portfolioUrl: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    /** Company Based: analiz sonrası cold mail'leri otomatik gönder */
    autoSendOutreachAfterAnalysis: { type: Boolean, default: false },
    preferredAiProvider: {
      type: String,
      enum: ["gemini-free", "gemini-pro", "openai"],
      default: "gemini-free",
    },
    gmailSendIntervalMinMinutes: {
      type: Number,
      default: 0, // legacy / türetilmiş (floor(seconds/60))
      min: 0,
      max: 1440,
    },
    gmailSendIntervalMaxMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 1440,
    },
    /** Kaynak değer: mail kuyruk aralığı toplam saniye (0 = sınırsız) */
    gmailSendIntervalMinSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400, // 24 saat
    },
    gmailSendIntervalMaxSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400,
    },
    enableMailTracking: {
      type: Boolean,
      default: true, // Varsayılan olarak açık
    },
    /** Cloudinary profil fotoğrafı (hesap başına tek) */
    profileImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    profileImagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    loginLockUntil: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
