const mongoose = require("mongoose");

const JOB_STATUSES = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
];

const ITEM_STATUSES = [
  "pending",
  "fetching",
  "analyzing",
  "sending",
  "completed",
  "failed",
  "skipped",
  "cancelled",
];

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
    openedCount: { type: Number, default: 0 },
    firstOpenedAt: { type: Date, default: null },
    lastOpenedAt: { type: Date, default: null },
  },
  { _id: false }
);

const jobItemSchema = new mongoose.Schema(
  {
    sourceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TodoApplicationItem",
      default: null,
    },
    companyUrl: { type: String, required: true, trim: true },
    pageType: { type: String, default: "careers" },
    pageTypeOther: { type: String, default: "" },
    emailDomainInput: { type: String, required: true, trim: true, lowercase: true },
    companyName: { type: String, default: "" },
    status: {
      type: String,
      enum: ITEM_STATUSES,
      default: "pending",
      index: true,
    },
    step: { type: String, default: "queued" },
    pageTextLength: { type: Number, default: 0 },
    detectedLanguage: {
      type: String,
      enum: ["turkish", "english", "other", ""],
      default: "",
    },
    coldEmailSubject: { type: String, default: "" },
    coldEmailBody: { type: String, default: "" },
    /** LinkedIn soğuk mesaj (opsiyonel AI üretimi) */
    linkedinMessage: { type: String, default: "" },
    /** AI’nin firmaya göre ne uyarladığı kısa özeti */
    adaptationNotes: { type: String, default: "" },
    /** Gönderimde kullanılan CV dosya adı (proje CV snapshot) */
    cvFileName: { type: String, default: "" },
    candidateRecipients: { type: [String], default: [] },
    selectedRecipients: { type: [String], default: [] },
    recipientResults: { type: [recipientResultSchema], default: [] },
    outreachLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachLog",
      default: null,
    },
    mailIds: { type: [String], default: [] },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    queuedCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    uniqueOpenedRecipients: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
    errorCode: { type: String, default: "" },
    verification: { type: mongoose.Schema.Types.Mixed, default: null },
    /** SMTP/kuyruk gönderimi başladı — crash sonrası çift mail engeli */
    mailDispatchStartedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    /**
     * full → fetch + AI + gönderim (bulk)
     * send_only → analiz tarayıcıda bitti; yalnızca mail kuyruğa
     */
    pipeline: {
      type: String,
      enum: ["full", "send_only"],
      default: "full",
      index: true,
    },
    source: {
      type: String,
      enum: ["bulk", "company-based"],
      default: "bulk",
    },
    /** Sekmeler farklı proje seçebilir — job.projectId fallback */
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachProject",
      default: null,
    },
    forceResend: { type: Boolean, default: false },
    selectedCategories: { type: [String], default: [] },
    replyTo: { type: String, default: "" },
    pdfAttachment: {
      filename: { type: String, default: "" },
      contentBase64: { type: String, default: "" },
      contentType: { type: String, default: "application/pdf" },
    },
    reanalyzeContext: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Company-based analiz özeti (KW, CV farkları, itibar skoru) */
    analysisSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true }
);

/**
 * To Do / Toplu başvuru arka plan işi.
 * Sayfa kapansa da processor devam eder.
 */
const todoApplicationJobSchema = new mongoose.Schema(
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
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachProject",
      required: true,
      index: true,
    },
    /**
     * analyze_and_send → To Do (mail dahil)
     * analyze_only → Toplu başvuru (mail yok)
     */
    mode: {
      type: String,
      enum: ["analyze_and_send", "analyze_only"],
      default: "analyze_and_send",
      index: true,
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "pending",
      index: true,
    },
    /** Job başlatılırken ayarların anlık kopyası */
    settings: {
      sendMail: { type: Boolean, default: true },
      selectedEmailPrefixCategories: { type: [String], default: ["turkey-hiring"] },
      customEmailLocalParts: { type: [String], default: [] },
      includePrimaryEmailInSend: { type: Boolean, default: true },
      skipPrimaryEmailVerification: { type: Boolean, default: false },
      includeEnteredMainDomainInSend: { type: Boolean, default: false },
      forceResend: { type: Boolean, default: false },
      outreachEmailLanguageMode: {
        type: String,
        enum: ["auto", "turkish", "english"],
        default: "auto",
      },
      targetPosition: { type: String, default: "" },
      cvLanguage: {
        type: String,
        enum: ["turkish", "english"],
        default: "turkish",
      },
      aiSettings: {
        about: { type: Boolean, default: true },
        workExperience: { type: Boolean, default: true },
        skills: { type: Boolean, default: true },
      },
      cvSectionLengthMode: {
        type: String,
        enum: ["fit_range", "keywords_only"],
        default: "fit_range",
      },
      cvAdaptationSource: {
        type: String,
        enum: ["company", "text"],
        default: "company",
      },
      shouldGenerateCoverLetter: { type: Boolean, default: false },
      shouldGenerateLinkedInMessage: { type: Boolean, default: false },
      includeCvPhoto: { type: Boolean, default: false },
      profileImageUrl: { type: String, default: "" },
      outreachCvAttachmentSource: {
        type: String,
        enum: ["optimized", "original"],
        default: "original",
      },
      cvId: { type: String, default: null },
      cvTitle: { type: String, default: "" },
      cvFileName: { type: String, default: "" },
      replyTo: { type: String, default: "" },
      /** Tek CV eki — tüm firmalara aynı ek (base64) */
      pdfAttachment: {
        filename: { type: String, default: "" },
        contentBase64: { type: String, default: "" },
        contentType: { type: String, default: "application/pdf" },
      },
      candidateFullName: { type: String, default: "" },
      candidateTitle: { type: String, default: "" },
      linkedinUrl: { type: String, default: "" },
      portfolioUrl: { type: String, default: "" },
      websiteUrl: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    items: { type: [jobItemSchema], default: [] },
    progress: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      running: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      mailsSent: { type: Number, default: 0 },
      mailsFailed: { type: Number, default: 0 },
      mailsQueued: { type: Number, default: 0 },
      mailsOpened: { type: Number, default: 0 },
      uniqueOpenedRecipients: { type: Number, default: 0 },
    },
    currentItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    /**
     * Duraklat: mevcut firma bitsin, sıradakine geçilmesin.
     * true iken status paused olsa bile in-progress item tamamlanır.
     */
    pauseAfterCurrent: {
      type: Boolean,
      default: false,
    },
    lastError: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "todo_application_jobs",
  }
);

todoApplicationJobSchema.index({ clientId: 1, projectId: 1, createdAt: -1 });
todoApplicationJobSchema.index({ status: 1, createdAt: 1 });
todoApplicationJobSchema.index({ userId: 1, status: 1, createdAt: -1 });

const TodoApplicationJob = mongoose.model(
  "TodoApplicationJob",
  todoApplicationJobSchema
);

module.exports = TodoApplicationJob;
module.exports.JOB_STATUSES = JOB_STATUSES;
module.exports.ITEM_STATUSES = ITEM_STATUSES;
