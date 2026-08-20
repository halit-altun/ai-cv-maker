const TodoApplicationItem = require("../models/todo-application-item.model");
const TodoApplicationJob = require("../models/todo-application-job.model");
const TodoProjectSettings = require("../models/todo-project-settings.model");
const MailTracking = require("../models/mail-tracking.model");
const OutreachLog = require("../models/outreach-log.model");
const EmailQueue = require("../models/email-queue.model");
const User = require("../models/user.model");
const { AppError } = require("../utils/app-error");
const { isValidPdfBuffer } = require("../utils/email-attachment.utils");
const {
  isInfoOrContactEmail,
  wrapColdEmailForInfoContactInbox,
} = require("../utils/cold-email-generic-inbox");
const { resolveCompanyDisplayName } = require("../utils/company-display-name");
const { getProjectOrThrow } = require("./outreach-project.service");
const {
  pickNextPendingJobItem,
  pendingSendOnlyJobFilter,
  enqueueSendOnlyLiveJobFilter,
  enqueueSendOnlyPausedJobFilter,
  resumePausedJobOnEnqueue,
} = require("../utils/todo-job-dispatch");
const {
  decideSendingRecovery,
  shouldReopenAssumedSentItem,
  reopenAssumedSentItem,
} = require("../utils/todo-send-recovery");
const { fetchPageText } = require("./todo-page-fetch.service");
const {
  buildRecipientEmails,
  normalizeEmailDomainInput,
  resolveTrustedSendEmail,
} = require("./todo-email-prefixes");
const {
  sendCompanyOutreachEmails,
  createAnalysisOnlyLog,
  createAiErrorLog,
} = require("./outreach.service");
const { resolveMailLanguage } = require("./todo-cold-email.service");
const {
  runFullOptimizationBundle,
  extractPdfTextFromBase64,
  renderOptimizedCvPdfViaFrontend,
} = require("./company-based");
const {
  isPersistOutreachHistoryEnabled,
} = require("../utils/persist-outreach-history");
const { parseCvSectionLengthMode } = require("../utils/cv-section-length");
const { getUserIntervalSeconds } = require("./email-queue.service");
const { logIntervalVerify, formatOutreachDispatchSummary } = require("../utils/outreach-dispatch-summary");

let processingLock = false;

/** index.js job processor interval'ı ile aynı — kullanıcıya beklenen süreyi söylemek için. */
const TODO_PROCESSOR_TICK_SECONDS = 20;

/**
 * Kaydetme tercihi kapalıysa bitmiş bulk job kaydını sil (geçmiş oluşmasın).
 */
async function maybeDeleteEphemeralTodoJob(job) {
  if (!job?._id) return false;
  if (!["completed", "failed", "cancelled"].includes(job.status)) return false;
  const persist = await isPersistOutreachHistoryEnabled(job.userId);
  if (persist) return false;
  await TodoApplicationJob.deleteOne({ _id: job._id });
  console.log(
    `[TODO_JOB] Kayıt kapalı — ephemeral job silindi: ${job._id} (${job.status})`
  );
  return true;
}

function itemAlreadyMailed(item) {
  return (
    Boolean(item?.outreachLogId) ||
    (Array.isArray(item?.mailIds) && item.mailIds.length > 0) ||
    Number(item?.sentCount || 0) > 0 ||
    Number(item?.queuedCount || 0) > 0
  );
}

function resolveItemProjectId(job, item) {
  return item?.projectId || job?.projectId || null;
}

function mergeCompanySendBody(body = {}) {
  const ctx =
    body.reanalyzeContext && typeof body.reanalyzeContext === "object"
      ? body.reanalyzeContext
      : {};
  return {
    ...body,
    skipPrimaryEmailVerification:
      body.skipPrimaryEmailVerification ?? ctx.skipPrimaryEmailVerification,
    includePrimaryEmailInSend:
      body.includePrimaryEmailInSend ?? ctx.includePrimaryEmailInSend,
    includeEnteredMainDomainInSend:
      body.includeEnteredMainDomainInSend ?? ctx.includeEnteredMainDomainInSend,
    selectedEmailPrefixCategories:
      body.selectedEmailPrefixCategories ||
      body.selectedCategories ||
      ctx.selectedCategories,
    customEmailLocalParts: body.customEmailLocalParts || ctx.customEmailLocalParts,
    rawDomainInput: body.rawDomainInput || ctx.rawDomainInput,
    trustedEmail: body.trustedEmail || ctx.trustedEmail,
  };
}

/** Company-based HTTP ile aynı gönderim tercihleri (item > settings). */
function resolveItemSendPrefs(item, settings = {}) {
  const ctx =
    item?.reanalyzeContext && typeof item.reanalyzeContext === "object"
      ? item.reanalyzeContext
      : {};
  const skipPrimaryEmailVerification = Boolean(
    ctx.skipPrimaryEmailVerification ?? settings.skipPrimaryEmailVerification
  );
  const includePrimaryEmailInSend =
    ctx.includePrimaryEmailInSend !== undefined
      ? Boolean(ctx.includePrimaryEmailInSend)
      : settings.includePrimaryEmailInSend !== false;
  const includeEnteredMainDomainInSend = Boolean(
    ctx.includeEnteredMainDomainInSend ?? settings.includeEnteredMainDomainInSend
  );
  const rawDomainInput = String(
    ctx.rawDomainInput || item?.emailDomainInput || ""
  );
  const domain = normalizeEmailDomainInput(
    item?.emailDomainInput || ctx.domain || rawDomainInput
  );
  return {
    skipPrimaryEmailVerification,
    includePrimaryEmailInSend,
    includeEnteredMainDomainInSend,
    rawDomainInput,
    domain,
    trustedEmail: ctx.trustedEmail
      ? String(ctx.trustedEmail).trim()
      : resolveTrustedSendEmail({
          rawDomainInput,
          domain,
          includeEnteredMainDomainInSend,
          includePrimaryEmailInSend,
          skipPrimaryEmailVerification,
        }),
  };
}

function resolveItemPdf(item, settings = {}) {
  if (item?.pdfAttachment?.contentBase64) {
    return {
      filename: item.pdfAttachment.filename || "CV.pdf",
      contentBase64: item.pdfAttachment.contentBase64,
      contentType: item.pdfAttachment.contentType || "application/pdf",
    };
  }
  if (settings.pdfAttachment?.contentBase64) {
    return {
      filename: settings.pdfAttachment.filename || "CV.pdf",
      contentBase64: settings.pdfAttachment.contentBase64,
      contentType: settings.pdfAttachment.contentType || "application/pdf",
    };
  }
  return null;
}

function buildTodoReanalyzeContext(job, item, settings = {}) {
  const itemProjectId = resolveItemProjectId(job, item);
  if (item?.reanalyzeContext && typeof item.reanalyzeContext === "object") {
    return {
      ...item.reanalyzeContext,
      projectId: item.reanalyzeContext.projectId || itemProjectId || null,
    };
  }
  return {
    companyUrl: item.companyUrl || "",
    rawDomainInput: item.emailDomainInput || "",
    pageType: item.pageType || "careers",
    pageTypeOther: item.pageTypeOther || "",
    cvLanguage: settings.cvLanguage || "turkish",
    outreachEmailLanguageMode: settings.outreachEmailLanguageMode || "auto",
    selectedCategories: item.selectedCategories?.length
      ? item.selectedCategories
      : settings.selectedEmailPrefixCategories || [],
    customEmailLocalParts: settings.customEmailLocalParts || [],
    includePrimaryEmailInSend: settings.includePrimaryEmailInSend !== false,
    skipPrimaryEmailVerification: Boolean(settings.skipPrimaryEmailVerification),
    includeEnteredMainDomainInSend: Boolean(settings.includeEnteredMainDomainInSend),
    shouldSendCompanyEmail: settings.sendMail !== false,
    shouldGenerateCoverLetter: Boolean(settings.shouldGenerateCoverLetter),
    shouldGenerateLinkedInMessage: Boolean(settings.shouldGenerateLinkedInMessage),
    coverLetterSource: settings.coverLetterSource || "company",
    linkedinMessageSource: settings.linkedinMessageSource || "company",
    cvAdaptationSource: settings.cvAdaptationSource || "company",
    outreachCvAttachmentSource: settings.outreachCvAttachmentSource || "optimized",
    includeCvPhoto: Boolean(settings.includeCvPhoto),
    aiSettings: settings.aiSettings || null,
    cvSectionLengthMode: parseCvSectionLengthMode(
      settings.cvSectionLengthMode,
      "keywords_only"
    ),
    companyName: item.companyName || "",
    targetPosition: settings.targetPosition || "",
    projectId: itemProjectId || null,
    linkedinMessageSnapshot: String(item.linkedinMessage || "").trim(),
  };
}

/**
 * Yarıda kalan "sending" item: yalnızca OutreachLog / EmailQueue kanıtı varsa
 * gönderilmiş say. mailDispatchStartedAt tek başına kanıt değildir
 * (doğrulama bitmeden yazılır; restart/ikinci worker maili yutuyordu).
 */
async function findSendEvidence(job, item) {
  const since = item.mailDispatchStartedAt || item.startedAt
    ? new Date(item.mailDispatchStartedAt || item.startedAt)
    : new Date(Date.now() - 2 * 60 * 60 * 1000);

  const byTodo = await EmailQueue.findOne({
    userId: job.userId,
    "metadata.todoItemId": String(item._id),
    status: { $in: ["pending", "processing", "sent"] },
  })
    .sort({ createdAt: -1 })
    .lean();
  if (byTodo) return { queueDoc: byTodo, logDoc: null };

  const domain = normalizeEmailDomainInput(item.emailDomainInput);
  let logDoc = null;
  if (domain) {
    logDoc = await OutreachLog.findOne({
      clientId: job.clientId,
      domain,
      status: { $in: ["success", "partial"] },
      sentAt: { $gte: since },
      $or: [
        { sentCount: { $gt: 0 } },
        { "recipients.status": { $in: ["sent", "logged", "queued"] } },
      ],
    })
      .sort({ sentAt: -1 })
      .lean();
  }

  const recentQueueQuery = {
    userId: job.userId,
    status: { $in: ["pending", "processing", "sent"] },
    createdAt: { $gte: since },
  };
  const queueOr = [
    domain ? { domain } : null,
    item.companyName ? { companyName: item.companyName } : null,
  ].filter(Boolean);
  if (queueOr.length) recentQueueQuery.$or = queueOr;
  const queueDoc = await EmailQueue.findOne(recentQueueQuery)
    .sort({ createdAt: -1 })
    .lean();

  return { queueDoc, logDoc };
}

function applyEvidenceToItem(item, { queueDoc, logDoc }) {
  if (logDoc) {
    item.outreachLogId = logDoc._id;
    item.sentCount = Number(logDoc.sentCount || 0);
    item.failedCount = Number(logDoc.failedCount || 0);
    item.queuedCount = (logDoc.recipients || []).filter(
      (r) => r.status === "queued"
    ).length;
    item.mailIds = [
      ...new Set((logDoc.recipients || []).map((r) => r.mailId).filter(Boolean)),
    ];
    item.status = "completed";
    item.step = "sent_recovered";
  } else if (queueDoc) {
    item.status = "completed";
    item.step = "sent_recovered_queue";
    item.queuedCount = queueDoc.status === "sent" ? 0 : 1;
    item.sentCount = queueDoc.status === "sent" ? 1 : 0;
  }
  item.completedAt = new Date();
  item.errorMessage = "";
  item.errorCode = "";
}

async function recoverOrBlockResend(job, item) {
  const evidence = await findSendEvidence(job, item);
  const decision = decideSendingRecovery({
    item,
    queueDoc: evidence.queueDoc,
    logDoc: evidence.logDoc,
  });

  if (decision.action === "wait") {
    console.log(
      `[TODO_JOB] Sending item hâlâ canlı, dokunulmadı: ${item._id}`
    );
    return { recovered: true, waited: true };
  }

  if (decision.action === "recover_from_evidence") {
    applyEvidenceToItem(item, evidence);
    console.log(
      `[TODO_JOB] Sending item kanıttan recover edildi: ${item._id} step=${item.step}`
    );
    return { recovered: true };
  }

  return { recovered: false, resume: decision.action === "resume_send" };
}

async function reopenFalselyAssumedSendOnlyItems() {
  const jobs = await TodoApplicationJob.find({
    "items.step": "sent_assumed_after_interrupt",
  });
  let reopened = 0;
  for (const job of jobs) {
    let changed = false;
    for (const item of job.items || []) {
      if (!shouldReopenAssumedSentItem(item)) {
        continue;
      }
      reopenAssumedSentItem(item);
      changed = true;
      reopened += 1;
    }
    if (!changed) continue;
    job.status = ["cancelled"].includes(job.status) ? job.status : "pending";
    job.completedAt = undefined;
    job.progress = computeProgress(job.items);
    await job.save();
    console.log(
      `[TODO_JOB] Yanlış “gönderildi varsayıldı” kayıtları yeniden kuyruğa alındı: job=${job._id}`
    );
  }
  return { reopened };
}

function mapItem(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    projectId: String(doc.projectId),
    companyUrl: doc.companyUrl || "",
    pageType: doc.pageType || "careers",
    pageTypeOther: doc.pageTypeOther || "",
    emailDomainInput: doc.emailDomainInput || "",
    companyName: doc.companyName || "",
    notes: doc.notes || "",
    sortOrder: Number(doc.sortOrder || 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function computeProgress(items = []) {
  const progress = {
    total: items.length,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    companiesMailed: 0,
    mailsSent: 0,
    mailsFailed: 0,
    mailsQueued: 0,
    mailsOpened: 0,
    uniqueOpenedRecipients: 0,
  };

  for (const item of items) {
    const status = item.status;
    if (status === "pending") progress.pending += 1;
    else if (["fetching", "analyzing", "sending"].includes(status)) {
      progress.running += 1;
    } else if (status === "completed") progress.completed += 1;
    else if (status === "failed") progress.failed += 1;
    else if (status === "skipped") progress.skipped += 1;
    else if (status === "cancelled") progress.cancelled += 1;

    const sent = Number(item.sentCount || 0);
    const queued = Number(item.queuedCount || 0);
    progress.mailsSent += sent;
    progress.mailsFailed += Number(item.failedCount || 0);
    progress.mailsQueued += queued;
    progress.mailsOpened += Number(item.openedCount || 0);
    progress.uniqueOpenedRecipients += Number(item.uniqueOpenedRecipients || 0);
    if (sent > 0 || queued > 0) progress.companiesMailed += 1;
  }

  return progress;
}

function mapJob(doc, { includePdf = false } = {}) {
  if (!doc) return null;
  const settings = doc.settings ? { ...doc.settings } : {};
  if (!includePdf && settings.pdfAttachment) {
    settings.pdfAttachment = {
      filename: settings.pdfAttachment.filename || "",
      contentType: settings.pdfAttachment.contentType || "application/pdf",
      hasContent: Boolean(settings.pdfAttachment.contentBase64),
      contentBase64: undefined,
    };
  }
  if (settings.cvText) {
    settings.cvText = undefined;
    settings.hasCvText = true;
  }

  return {
    id: String(doc._id),
    projectId: String(doc.projectId),
    mode: doc.mode,
    status: doc.status,
    settings,
    items: (doc.items || []).map((item) => ({
      id: String(item._id),
      sourceItemId: item.sourceItemId ? String(item.sourceItemId) : null,
      pipeline: item.pipeline || "full",
      source: item.source || "bulk",
      projectId: item.projectId ? String(item.projectId) : String(doc.projectId),
      companyUrl: item.companyUrl,
      pageType: item.pageType,
      pageTypeOther: item.pageTypeOther || "",
      emailDomainInput: item.emailDomainInput,
      companyName: item.companyName || "",
      status: item.status,
      step: item.step,
      pageTextLength: item.pageTextLength || 0,
      detectedLanguage: item.detectedLanguage || "",
      coldEmailSubject: item.coldEmailSubject || "",
      coldEmailBody: item.coldEmailBody || "",
      linkedinMessage: item.linkedinMessage || "",
      adaptationNotes: item.adaptationNotes || "",
      cvFileName: item.cvFileName || "",
      hasPdf: Boolean(item.pdfAttachment?.contentBase64),
      candidateRecipients: item.candidateRecipients || [],
      selectedRecipients: item.selectedRecipients || [],
      recipientResults: item.recipientResults || [],
      outreachLogId: item.outreachLogId ? String(item.outreachLogId) : null,
      mailIds: item.mailIds || [],
      sentCount: item.sentCount || 0,
      failedCount: item.failedCount || 0,
      queuedCount: item.queuedCount || 0,
      openedCount: item.openedCount || 0,
      uniqueOpenedRecipients: item.uniqueOpenedRecipients || 0,
      errorMessage: item.errorMessage || "",
      errorCode: item.errorCode || "",
      verification: item.verification || null,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      analysisSnapshot: item.analysisSnapshot || null,
    })),
    progress: doc.progress || computeProgress(doc.items || []),
    currentItemId: doc.currentItemId ? String(doc.currentItemId) : null,
    pauseAfterCurrent: Boolean(doc.pauseAfterCurrent),
    lastError: doc.lastError || "",
    startedAt: doc.startedAt,
    pausedAt: doc.pausedAt,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function normalizeIncomingItem(raw) {
  const companyUrl = String(raw?.companyUrl || raw?.url || "").trim();
  const emailDomainInput = String(
    raw?.emailDomainInput || raw?.domain || raw?.emailDomain || ""
  )
    .trim()
    .toLowerCase();

  if (!companyUrl) {
    throw new AppError("Şirket URL zorunlu.", 400, "COMPANY_URL_REQUIRED");
  }
  if (!emailDomainInput) {
    throw new AppError("Ana domain / e-posta zorunlu.", 400, "DOMAIN_REQUIRED");
  }
  if (!normalizeEmailDomainInput(emailDomainInput)) {
    throw new AppError("Geçersiz ana domain.", 400, "DOMAIN_INVALID");
  }

  return {
    companyUrl,
    pageType: String(raw?.pageType || "careers").trim() || "careers",
    pageTypeOther: String(raw?.pageTypeOther || "").trim(),
    emailDomainInput,
    companyName: String(raw?.companyName || "").trim(),
    notes: String(raw?.notes || "").trim(),
    sortOrder: Number.isFinite(Number(raw?.sortOrder))
      ? Number(raw.sortOrder)
      : 0,
  };
}

async function listTodoItems(clientId, projectId) {
  await getProjectOrThrow(clientId, projectId);
  const items = await TodoApplicationItem.find({
    clientId,
    projectId,
    archived: { $ne: true },
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  return items.map(mapItem);
}

async function createTodoItems(clientId, userId, projectId, rawItems) {
  await getProjectOrThrow(clientId, projectId);
  const list = Array.isArray(rawItems) ? rawItems : [rawItems];
  if (!list.length) {
    throw new AppError("En az bir firma satırı gerekli.", 400, "ITEMS_REQUIRED");
  }
  if (list.length > 200) {
    throw new AppError("Tek seferde en fazla 200 satır eklenebilir.", 400, "ITEMS_LIMIT");
  }

  const docs = list.map((raw, index) => {
    const normalized = normalizeIncomingItem(raw);
    return {
      clientId,
      userId,
      projectId,
      ...normalized,
      sortOrder: normalized.sortOrder || index,
    };
  });

  const created = await TodoApplicationItem.insertMany(docs);
  return created.map(mapItem);
}

async function updateTodoItem(clientId, itemId, patch = {}) {
  const item = await TodoApplicationItem.findOne({
    _id: itemId,
    clientId,
    archived: { $ne: true },
  });
  if (!item) {
    throw new AppError("Kayıt bulunamadı.", 404, "TODO_ITEM_NOT_FOUND");
  }

  if (patch.companyUrl !== undefined) {
    const url = String(patch.companyUrl || "").trim();
    if (!url) throw new AppError("Şirket URL zorunlu.", 400, "COMPANY_URL_REQUIRED");
    item.companyUrl = url;
  }
  if (patch.emailDomainInput !== undefined || patch.domain !== undefined) {
    const domainInput = String(
      patch.emailDomainInput ?? patch.domain ?? ""
    )
      .trim()
      .toLowerCase();
    if (!normalizeEmailDomainInput(domainInput)) {
      throw new AppError("Geçersiz ana domain.", 400, "DOMAIN_INVALID");
    }
    item.emailDomainInput = domainInput;
  }
  if (patch.pageType !== undefined) item.pageType = String(patch.pageType || "careers");
  if (patch.pageTypeOther !== undefined) {
    item.pageTypeOther = String(patch.pageTypeOther || "").trim();
  }
  if (patch.companyName !== undefined) {
    item.companyName = String(patch.companyName || "").trim();
  }
  if (patch.notes !== undefined) item.notes = String(patch.notes || "").trim();
  if (patch.sortOrder !== undefined && Number.isFinite(Number(patch.sortOrder))) {
    item.sortOrder = Number(patch.sortOrder);
  }

  await item.save();
  return mapItem(item);
}

async function deleteTodoItem(clientId, itemId) {
  const item = await TodoApplicationItem.findOne({ _id: itemId, clientId });
  if (!item) {
    throw new AppError("Kayıt bulunamadı.", 404, "TODO_ITEM_NOT_FOUND");
  }
  item.archived = true;
  await item.save();
  return { ok: true, id: String(item._id) };
}

async function deleteTodoItemsBulk(clientId, projectId, itemIds) {
  await getProjectOrThrow(clientId, projectId);
  const ids = Array.isArray(itemIds) ? itemIds.filter(Boolean) : [];
  if (!ids.length) {
    throw new AppError("Silinecek kayıt seçilmedi.", 400, "ITEMS_REQUIRED");
  }
  const result = await TodoApplicationItem.updateMany(
    { clientId, projectId, _id: { $in: ids } },
    { $set: { archived: true } }
  );
  return { ok: true, modifiedCount: result.modifiedCount || 0 };
}

function mapCvMeta(settingsDoc) {
  if (!settingsDoc) {
    return {
      hasCv: false,
      cvFileName: "",
      cvTitle: "",
      uploadedAt: null,
      contentType: "",
      bulkSendHistoryFilter: "all",
    };
  }
  const hasCv = Boolean(settingsDoc.pdfAttachment?.contentBase64);
  const filter = String(settingsDoc.bulkSendHistoryFilter || "all");
  return {
    hasCv,
    cvFileName: settingsDoc.cvFileName || settingsDoc.pdfAttachment?.filename || "",
    cvTitle: settingsDoc.cvTitle || "",
    uploadedAt: settingsDoc.uploadedAt || null,
    contentType: settingsDoc.pdfAttachment?.contentType || "application/pdf",
    bulkSendHistoryFilter: ["all", "sent", "unsent"].includes(filter)
      ? filter
      : "all",
  };
}

async function getTodoProjectSettings(clientId, projectId) {
  await getProjectOrThrow(clientId, projectId);
  const doc = await TodoProjectSettings.findOne({ clientId, projectId }).lean();
  return mapCvMeta(doc);
}

async function updateTodoProjectPrefs(clientId, userId, projectId, patch = {}) {
  await getProjectOrThrow(clientId, projectId);

  const updates = {};
  if (patch.bulkSendHistoryFilter !== undefined) {
    const filter = String(patch.bulkSendHistoryFilter || "all");
    if (!["all", "sent", "unsent"].includes(filter)) {
      throw new AppError(
        "Geçersiz gönderim filtresi. all | sent | unsent olmalı.",
        400,
        "BULK_SEND_FILTER_INVALID"
      );
    }
    updates.bulkSendHistoryFilter = filter;
  }

  if (!Object.keys(updates).length) {
    return getTodoProjectSettings(clientId, projectId);
  }

  const doc = await TodoProjectSettings.findOneAndUpdate(
    { clientId, projectId },
    {
      $set: {
        ...updates,
        clientId,
        userId,
        projectId,
      },
      $setOnInsert: {
        cvFileName: "",
        cvTitle: "",
        pdfAttachment: {
          filename: "",
          contentBase64: "",
          contentType: "application/pdf",
        },
        uploadedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return mapCvMeta(doc);
}

async function upsertTodoProjectCv(clientId, userId, projectId, payload = {}) {
  await getProjectOrThrow(clientId, projectId);

  const contentBase64 = String(payload.contentBase64 || "")
    .replace(/^data:[^;]+;base64,/, "")
    .trim();
  if (!contentBase64) {
    throw new AppError("CV PDF içeriği zorunlu.", 400, "CV_REQUIRED");
  }
  if (contentBase64.length > 11_000_000) {
    throw new AppError("CV eki çok büyük (max ~8MB).", 400, "ATTACHMENT_TOO_LARGE");
  }

  const pdfBuf = Buffer.from(contentBase64, "base64");
  if (!isValidPdfBuffer(pdfBuf)) {
    throw new AppError(
      "Yüklenen dosya geçerli bir PDF değil.",
      400,
      "INVALID_PDF_ATTACHMENT"
    );
  }

  let filename = String(payload.filename || payload.cvFileName || "CV.pdf").trim() || "CV.pdf";
  if (!filename.toLowerCase().endsWith(".pdf")) {
    filename = `${filename}.pdf`;
  }

  const update = {
    clientId,
    userId,
    projectId,
    cvFileName: filename,
    cvTitle: String(payload.cvTitle || filename).trim(),
    pdfAttachment: {
      filename,
      contentBase64,
      contentType: String(payload.contentType || "application/pdf"),
    },
    uploadedAt: new Date(),
  };

  const doc = await TodoProjectSettings.findOneAndUpdate(
    { clientId, projectId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return mapCvMeta(doc);
}

async function clearTodoProjectCv(clientId, projectId) {
  await getProjectOrThrow(clientId, projectId);
  await TodoProjectSettings.findOneAndUpdate(
    { clientId, projectId },
    {
      $set: {
        cvFileName: "",
        cvTitle: "",
        uploadedAt: null,
        pdfAttachment: {
          filename: "",
          contentBase64: "",
          contentType: "application/pdf",
        },
      },
    },
    { upsert: true }
  );
  return mapCvMeta(null);
}

async function getTodoProjectCvAttachment(clientId, projectId) {
  const doc = await TodoProjectSettings.findOne({ clientId, projectId }).lean();
  if (!doc?.pdfAttachment?.contentBase64) return null;
  return {
    filename: doc.pdfAttachment.filename || doc.cvFileName || "CV.pdf",
    contentBase64: doc.pdfAttachment.contentBase64,
    contentType: doc.pdfAttachment.contentType || "application/pdf",
    cvFileName: doc.cvFileName || doc.pdfAttachment.filename || "CV.pdf",
    cvTitle: doc.cvTitle || "",
  };
}

function resolveSenderName(user) {
  const first = String(user?.firstName || "").trim();
  const last = String(user?.lastName || "").trim();
  if (!first || !last) return null;
  return `${first} ${last}`;
}

function buildSettingsSnapshot(body = {}, user = {}) {
  const pdf = body.pdfAttachment || null;
  const sendMail =
    body.sendMail !== undefined
      ? Boolean(body.sendMail)
      : body.mode !== "analyze_only";

  return {
    sendMail,
    selectedEmailPrefixCategories: Array.isArray(body.selectedEmailPrefixCategories)
      ? body.selectedEmailPrefixCategories
      : ["turkey-hiring"],
    customEmailLocalParts: Array.isArray(body.customEmailLocalParts)
      ? body.customEmailLocalParts
      : String(body.customEmailLocalPartsText || "")
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
    includePrimaryEmailInSend: body.includePrimaryEmailInSend !== false,
    skipPrimaryEmailVerification: Boolean(body.skipPrimaryEmailVerification),
    includeEnteredMainDomainInSend: Boolean(body.includeEnteredMainDomainInSend),
    forceResend: Boolean(body.forceResend),
    outreachEmailLanguageMode: ["auto", "turkish", "english"].includes(
      body.outreachEmailLanguageMode
    )
      ? body.outreachEmailLanguageMode
      : "auto",
    targetPosition: String(body.targetPosition || "").trim(),
    cvLanguage: body.cvLanguage === "english" ? "english" : "turkish",
    aiSettings: {
      about: body.aiSettings?.about !== false,
      workExperience: body.aiSettings?.workExperience !== false,
      skills: body.aiSettings?.skills !== false,
    },
    cvSectionLengthMode: parseCvSectionLengthMode(body.cvSectionLengthMode),
    cvAdaptationSource:
      body.cvAdaptationSource === "text" ? "text" : "company",
    shouldGenerateCoverLetter: Boolean(body.shouldGenerateCoverLetter),
    shouldGenerateLinkedInMessage: Boolean(body.shouldGenerateLinkedInMessage),
    includeCvPhoto: Boolean(body.includeCvPhoto),
    profileImageUrl: String(
      body.profileImageUrl || user.profileImageUrl || ""
    ).trim(),
    outreachCvAttachmentSource:
      body.outreachCvAttachmentSource === "original" ? "original" : "optimized",
    cvId: body.cvId || null,
    cvTitle: String(body.cvTitle || "").trim(),
    cvFileName: String(body.cvFileName || "").trim(),
    replyTo: String(body.replyTo || user.email || "").trim(),
    pdfAttachment:
      pdf && pdf.contentBase64
        ? {
            filename: String(pdf.filename || "CV.pdf"),
            contentBase64: String(pdf.contentBase64),
            contentType: String(pdf.contentType || "application/pdf"),
          }
        : { filename: "", contentBase64: "", contentType: "application/pdf" },
    candidateFullName: resolveSenderName(user) || String(body.candidateFullName || "").trim(),
    candidateTitle: String(body.candidateTitle || user.title || "").trim(),
    linkedinUrl: String(body.linkedinUrl || user.linkedinUrl || "").trim(),
    portfolioUrl: String(body.portfolioUrl || user.portfolioUrl || "").trim(),
    websiteUrl: String(body.websiteUrl || "").trim(),
    phone: String(body.phone || user.phone || "").trim(),
  };
}

async function startTodoJob(clientId, userId, body = {}) {
  const projectId = body.projectId;
  if (!projectId) {
    throw new AppError("Proje seçimi zorunlu.", 400, "PROJECT_REQUIRED");
  }
  await getProjectOrThrow(clientId, projectId);

  const mode =
    body.mode === "analyze_only" ? "analyze_only" : "analyze_and_send";

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  if (mode === "analyze_and_send" && !resolveSenderName(user)) {
    throw new AppError(
      "Mail gönderimi için profilinizde ad ve soyad zorunludur.",
      400,
      "SENDER_NAME_REQUIRED"
    );
  }

  const activeJob = await TodoApplicationJob.findOne({
    clientId,
    userId,
    status: { $in: ["pending", "running", "paused"] },
  }).select("_id status");

  if (activeJob) {
    throw new AppError(
      "Zaten devam eden bir To Do işi var. Önce onu tamamlayın, duraklatın veya iptal edin.",
      409,
      "TODO_JOB_ALREADY_ACTIVE",
      { jobId: String(activeJob._id), status: activeJob.status }
    );
  }

  let sourceItems = [];
  if (Array.isArray(body.itemIds) && body.itemIds.length) {
    sourceItems = await TodoApplicationItem.find({
      clientId,
      projectId,
      _id: { $in: body.itemIds },
      archived: { $ne: true },
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
  } else if (Array.isArray(body.items) && body.items.length) {
    // Inline items (nadiren) — önce kaydetmeden snapshot
    sourceItems = body.items.map((raw) => ({
      _id: null,
      ...normalizeIncomingItem(raw),
    }));
  } else {
    sourceItems = await TodoApplicationItem.find({
      clientId,
      projectId,
      archived: { $ne: true },
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
  }

  if (!sourceItems.length) {
    throw new AppError(
      "İşlem için en az bir firma satırı gerekli.",
      400,
      "ITEMS_REQUIRED"
    );
  }

  // Proje CV'si yoksa body'den, yoksa proje ayarlarından al
  let bodyWithCv = { ...body, mode, sendMail: mode === "analyze_and_send" };
  if (!bodyWithCv.pdfAttachment?.contentBase64) {
    const projectCv = await getTodoProjectCvAttachment(clientId, projectId);
    if (projectCv) {
      bodyWithCv = {
        ...bodyWithCv,
        pdfAttachment: {
          filename: projectCv.filename,
          contentBase64: projectCv.contentBase64,
          contentType: projectCv.contentType,
        },
        cvFileName: bodyWithCv.cvFileName || projectCv.cvFileName,
        cvTitle: bodyWithCv.cvTitle || projectCv.cvTitle || projectCv.cvFileName,
      };
    }
  }

  if (mode === "analyze_and_send" && !bodyWithCv.pdfAttachment?.contentBase64) {
    throw new AppError(
      "Bu proje için To Do detayında CV yüklenmeli. Bulk, proje CV’si üzerinden gönderir.",
      400,
      "PROJECT_CV_REQUIRED"
    );
  }

  const settings = buildSettingsSnapshot(bodyWithCv, user);

  // Company-based ile aynı: CV metnini bir kez çıkar (her firma için yeniden parse etme)
  if (settings.pdfAttachment?.contentBase64) {
    try {
      settings.cvText = await extractPdfTextFromBase64(
        settings.pdfAttachment.contentBase64
      );
    } catch (err) {
      throw new AppError(
        err instanceof Error
          ? `CV PDF okunamadı: ${err.message}`
          : "CV PDF okunamadı.",
        400,
        "CV_TEXT_EXTRACT_FAILED"
      );
    }
    if (!String(settings.cvText || "").trim()) {
      throw new AppError(
        "CV PDF’den metin çıkarılamadı.",
        400,
        "CV_TEXT_EMPTY"
      );
    }
  }

  const jobItems = sourceItems.map((item) => ({
    sourceItemId: item._id || null,
    companyUrl: item.companyUrl,
    pageType: item.pageType || "careers",
    pageTypeOther: item.pageTypeOther || "",
    emailDomainInput: item.emailDomainInput,
    companyName: item.companyName || "",
    status: "pending",
    step: "queued",
  }));

  const job = await TodoApplicationJob.create({
    clientId,
    userId,
    projectId,
    mode,
    status: "pending",
    settings,
    items: jobItems,
    progress: computeProgress(jobItems),
  });

  return mapJob(job);
}

async function listTodoJobs(clientId, { projectId, limit = 20 } = {}) {
  const query = { clientId };
  if (projectId) query.projectId = projectId;
  const jobs = await TodoApplicationJob.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 20)))
    .select("-settings.pdfAttachment.contentBase64")
    .lean();
  return jobs.map((j) => mapJob(j));
}

async function getTodoJob(clientId, jobId, { refreshTracking = true } = {}) {
  const job = await TodoApplicationJob.findOne({ _id: jobId, clientId });
  if (!job) {
    throw new AppError("İş bulunamadı.", 404, "TODO_JOB_NOT_FOUND");
  }

  if (refreshTracking) {
    await refreshJobMailTracking(job);
  }

  return mapJob(job);
}

async function refreshJobMailTracking(job) {
  const mailIds = [];
  for (const item of job.items || []) {
    for (const id of item.mailIds || []) {
      if (id) mailIds.push(id);
    }
  }
  if (!mailIds.length) return job;

  const trackings = await MailTracking.find({ mailId: { $in: mailIds } })
    .select("mailId openedCount firstOpenedAt lastOpenedAt status recipient")
    .lean();
  const byMailId = new Map(trackings.map((t) => [t.mailId, t]));

  let changed = false;
  for (const item of job.items || []) {
    let openedCount = 0;
    let uniqueOpened = 0;

    const nextResults = (item.recipientResults || []).map((r) => {
      const plain = r.toObject ? r.toObject() : { ...r };
      const tracking = plain.mailId ? byMailId.get(plain.mailId) : null;
      if (!tracking) return plain;
      return {
        ...plain,
        openedCount: tracking.openedCount || 0,
        firstOpenedAt: tracking.firstOpenedAt || null,
        lastOpenedAt: tracking.lastOpenedAt || null,
      };
    });

    for (const mailId of item.mailIds || []) {
      const tracking = byMailId.get(mailId);
      if (tracking && Number(tracking.openedCount || 0) > 0) {
        openedCount += Number(tracking.openedCount || 0);
        uniqueOpened += 1;
      }
    }

    const prevOpened = Number(item.openedCount || 0);
    const prevUnique = Number(item.uniqueOpenedRecipients || 0);
    item.recipientResults = nextResults;
    item.openedCount = openedCount;
    item.uniqueOpenedRecipients = uniqueOpened;
    if (prevOpened !== openedCount || prevUnique !== uniqueOpened) {
      changed = true;
    }
  }

  if (changed) {
    job.progress = computeProgress(job.items);
    await job.save();
  }

  return job;
}

async function setTodoJobStatus(clientId, jobId, nextStatus) {
  const job = await TodoApplicationJob.findOne({ _id: jobId, clientId });
  if (!job) {
    throw new AppError("İş bulunamadı.", 404, "TODO_JOB_NOT_FOUND");
  }

  if (nextStatus === "paused") {
    if (!["pending", "running"].includes(job.status)) {
      throw new AppError("Bu iş duraklatılamaz.", 400, "TODO_JOB_INVALID_STATE");
    }
    const hasInProgress = (job.items || []).some((i) =>
      ["fetching", "analyzing", "sending"].includes(i.status)
    );
    // Duraklat: mevcut firma bitsin, sıradakine geçilmesin
    job.pauseAfterCurrent = true;
    job.status = "paused";
    job.pausedAt = new Date();
    if (!hasInProgress) {
      job.pauseAfterCurrent = false;
    }
  } else if (nextStatus === "running") {
    if (!["paused", "pending"].includes(job.status)) {
      throw new AppError("Bu iş devam ettirilemez.", 400, "TODO_JOB_INVALID_STATE");
    }
    job.status = "running";
    job.pauseAfterCurrent = false;
    job.pausedAt = null;
    if (!job.startedAt) job.startedAt = new Date();
  } else if (nextStatus === "cancelled") {
    if (["completed", "cancelled"].includes(job.status)) {
      throw new AppError("Bu iş iptal edilemez.", 400, "TODO_JOB_INVALID_STATE");
    }
    job.status = "cancelled";
    job.pauseAfterCurrent = false;
    job.completedAt = new Date();
    for (const item of job.items) {
      // Sadece sıradakiler kaldırılır; in-progress varsa iptal edilir
      if (["pending", "fetching", "analyzing", "sending"].includes(item.status)) {
        item.status = "cancelled";
        item.step = "cancelled";
        item.completedAt = new Date();
      }
    }
    job.progress = computeProgress(job.items);
    job.currentItemId = null;
  } else {
    throw new AppError("Geçersiz durum.", 400, "TODO_JOB_INVALID_STATE");
  }

  await job.save();
  return mapJob(job);
}

/**
 * Analiz tamam, gönderim yarıda: fetch/AI tekrarlamadan yalnızca mail gönder.
 */
async function resumeSendOnlyForItem(job, item, settings, user) {
  const selected = Array.isArray(item.selectedRecipients)
    ? item.selectedRecipients
    : [];

  item.status = "sending";
  item.step = "sending_mail";
  job.currentItemId = item._id;
  job.progress = computeProgress(job.items);
  await job.save();

  const senderName = resolveSenderName(user);
  const pdf = resolveItemPdf(item, settings);
  const categories =
    Array.isArray(item.selectedCategories) && item.selectedCategories.length
      ? item.selectedCategories
      : settings.selectedEmailPrefixCategories;
  const itemProjectId = resolveItemProjectId(job, item);

  const prefs = resolveItemSendPrefs(item, settings);
  const domain = prefs.domain;
  const trustedEmail = prefs.trustedEmail;

  item.mailDispatchStartedAt = new Date();
  await job.save();

  const sendResult = await sendCompanyOutreachEmails({
    recipients: selected,
    subject: item.coldEmailSubject,
    bodyText: item.coldEmailBody,
    replyTo: item.replyTo || settings.replyTo || user.email,
    senderName,
    companyName: item.companyName,
    domain,
    clientId: job.clientId,
    userId: job.userId,
    cvId: settings.cvId,
    cvTitle: settings.cvTitle,
    cvFileName: item.cvFileName || settings.cvFileName,
    selectedCategories: categories,
    templateType: "cold_email",
    targetPosition: settings.targetPosition,
    forceResend: Boolean(item.forceResend || settings.forceResend),
    pdfAttachment: pdf,
    skipVerification: false,
    rawDomainInput: prefs.rawDomainInput,
    trustedEmail,
    projectId: itemProjectId,
    linkedinMessageText: String(item.linkedinMessage || "").trim() || undefined,
    companyUrl: item.companyUrl,
    reanalyzeContext: buildTodoReanalyzeContext(job, item, settings),
    todoJobId: String(job._id),
    todoItemId: String(item._id),
    analysisSnapshot: item.analysisSnapshot || undefined,
  });

  logIntervalVerify({
    jobId: String(job._id),
    itemId: String(item._id),
    companyName: item.companyName,
    sendResult,
  });

  item.outreachLogId = sendResult.logId || null;
  item.verification = sendResult.verification || null;
  item.sentCount = Number(sendResult.sentCount || 0);
  item.failedCount = Number(sendResult.failedCount || 0);
  item.queuedCount = (sendResult.results || []).filter(
    (r) => r.status === "queued"
  ).length;

  const mailIds = Array.isArray(sendResult.mailIds)
    ? sendResult.mailIds.filter(Boolean)
    : (sendResult.results || []).map((r) => r.mailId).filter(Boolean);

  item.mailIds = [...new Set(mailIds)];
  item.recipientResults = (sendResult.results || []).map((r) => ({
    email: r.email,
    status: r.status,
    errorMessage: r.errorMessage || "",
    verifyProvider: r.verifyProvider || "",
    verifyResult: r.verifyResult || "",
    mailId: r.mailId || "",
    openedCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
  }));
  item.selectedRecipients = sendResult.selectedRecipients || selected;

  if (sendResult.status === "failed") {
    item.status = "failed";
    item.step = "send_failed";
    item.errorMessage = sendResult.errorMessage || "Mail gönderimi başarısız.";
    item.errorCode = "SEND_FAILED";
  } else {
    item.status = "completed";
    item.step = "sent";
  }
  item.completedAt = new Date();
  return sendResult;
}

async function processSingleJobItem(job, item) {
  const settings = job.settings || {};
  const user = await User.findById(job.userId).lean();
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  // Çift mail: item zaten gönderilmişse pipeline'ı baştan çalıştırma
  if (itemAlreadyMailed(item)) {
    item.status = "completed";
    item.step = item.step === "send_failed" ? "send_failed" : "sent";
    item.completedAt = item.completedAt || new Date();
    job.progress = computeProgress(job.items);
    job.currentItemId = null;
    await job.save();
    console.log(
      `[TODO_JOB] Item zaten gönderilmiş, atlandı: ${item._id} (log=${item.outreachLogId || "-"})`
    );
    return;
  }

  // "sending" iken crash/restart: tam pipeline yeniden mail atar → önce recover
  if (item.status === "sending") {
    const recovery = await recoverOrBlockResend(job, item);
    if (recovery.waited) {
      return;
    }
    if (recovery.recovered) {
      job.progress = computeProgress(job.items);
      job.currentItemId = null;
      await job.save();
      console.log(
        `[TODO_JOB] Sending item recover edildi (çift mail önlendi): ${item._id} step=${item.step}`
      );
      return;
    }
    // Log/kuyruk yok ama cold mail hazırsa yalnızca gönderimi dene (fetch+AI tekrar yok)
    if (
      String(item.coldEmailBody || "").trim() &&
      Array.isArray(item.selectedRecipients) &&
      item.selectedRecipients.length > 0
    ) {
      console.log(
        `[TODO_JOB] Sending resume (send-only): ${item._id}`
      );
      await resumeSendOnlyForItem(job, item, settings, user);
      return;
    }
    item.status = "failed";
    item.step = "failed";
    item.errorMessage =
      "Gönderim yarıda kaldı; çift mail riski nedeniyle otomatik yeniden başlatılmadı.";
    item.errorCode = "SEND_INTERRUPTED";
    item.completedAt = new Date();
    job.progress = computeProgress(job.items);
    await job.save();
    return;
  }

  if (item.pipeline === "send_only") {
    if (
      !String(item.coldEmailBody || "").trim() ||
      !Array.isArray(item.selectedRecipients) ||
      item.selectedRecipients.length === 0
    ) {
      item.status = "failed";
      item.step = "failed";
      item.errorMessage = "Gönderim kuyruğu öğesinde alıcı veya cold mail eksik.";
      item.errorCode = "SEND_ONLY_INCOMPLETE";
      item.completedAt = new Date();
      job.progress = computeProgress(job.items);
      await job.save();
      return;
    }
    console.log(`[TODO_JOB] send_only item: ${item._id}`);
    await resumeSendOnlyForItem(job, item, settings, user);
    return;
  }

  item.status = "fetching";
  item.step = "fetching_page";
  item.startedAt = item.startedAt || new Date();
  item.errorMessage = "";
  item.errorCode = "";
  item.cvFileName =
    settings.cvFileName ||
    settings.pdfAttachment?.filename ||
    item.cvFileName ||
    "";
  job.currentItemId = item._id;
  // Duraklatılmış işte mevcut firmayı bitirirken status'u running'e zorlama
  if (job.status === "pending") {
    job.status = "running";
  }
  if (!job.startedAt) job.startedAt = new Date();
  job.progress = computeProgress(job.items);
  await job.save();

  const fetchResult = await fetchPageText(item.companyUrl);
  if (!fetchResult.ok || !fetchResult.text) {
    throw Object.assign(new Error(fetchResult.message || "Sayfa alınamadı"), {
      code: "PAGE_FETCH_FAILED",
    });
  }

  item.pageTextLength = fetchResult.length || 0;
  item.detectedLanguage = fetchResult.detectedLanguage || "";
  item.step = "analyzing";
  item.status = "analyzing";
  job.progress = computeProgress(job.items);
  await job.save();

  const language = resolveMailLanguage({
    mode: settings.outreachEmailLanguageMode || "auto",
    pageLanguage: item.detectedLanguage,
    fallback: settings.cvLanguage || "turkish",
  });

  let cvText = String(settings.cvText || "").trim();
  if (!cvText && settings.pdfAttachment?.contentBase64) {
    cvText = await extractPdfTextFromBase64(settings.pdfAttachment.contentBase64);
    settings.cvText = cvText;
    job.settings.cvText = cvText;
  }
  if (!cvText) {
    throw Object.assign(new Error("CV metni yok — proje CV’si gerekli."), {
      code: "CV_TEXT_REQUIRED",
    });
  }

  const pageTypeLabel =
    item.pageType === "other"
      ? String(item.pageTypeOther || "other").trim() || "other"
      : item.pageType || "careers";

  const pageText =
    String(fetchResult.text || "").length > 12000
      ? `${String(fetchResult.text).slice(0, 12000)}\n…[truncated]`
      : String(fetchResult.text || "");

  let bundle;
  try {
    bundle = await runFullOptimizationBundle(
      {
        cvText,
        cvLanguage: settings.cvLanguage === "english" ? "english" : "turkish",
        adaptationSource: "company",
        companyPages: [
          {
            url: item.companyUrl,
            pageType: item.pageType,
            description: pageTypeLabel,
            pageText,
          },
        ],
        targetPosition: settings.targetPosition || "",
        keywordTargetSections: {
          about: settings.aiSettings?.about !== false,
          workExperience: settings.aiSettings?.workExperience !== false,
          skills: settings.aiSettings?.skills !== false,
        },
        cvSectionLengthMode: parseCvSectionLengthMode(
          settings.cvSectionLengthMode,
          "keywords_only"
        ),
        generateCoverLetter: false,
        generateLinkedInMessage: Boolean(settings.shouldGenerateLinkedInMessage),
        generateColdEmail: true,
        coldEmailLanguage: language,
        recipientCompanyName: item.companyName || undefined,
        outreachLinkedinUrl: settings.linkedinUrl || undefined,
        outreachPortfolioUrl: settings.portfolioUrl || undefined,
        outreachWebsiteUrl: settings.websiteUrl || undefined,
        outreachPhone: settings.phone || undefined,
      },
      { provider: user.preferredAiProvider || "gemini-free" }
    );
  } catch (err) {
    await createAiErrorLog({
      clientId: job.clientId,
      userId: job.userId,
      companyName: item.companyName,
      domain: item.emailDomainInput,
      errorMessage: err instanceof Error ? err.message : "AI hatası",
      cvId: settings.cvId,
      cvTitle: settings.cvTitle,
      cvFileName: settings.cvFileName,
      targetPosition: settings.targetPosition,
      projectId: job.projectId,
    }).catch(() => null);
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
      code: "AI_ERROR",
    });
  }

  item.companyName = resolveCompanyDisplayName({
    name: bundle.companyInfo?.name || item.companyName,
    website: bundle.companyInfo?.website || item.companyUrl,
  }) || item.companyName;
  if (bundle.coldEmail) {
    item.coldEmailSubject = bundle.coldEmail.subject;
    item.coldEmailBody = bundle.coldEmail.body;
  } else {
    throw Object.assign(new Error("Cold mail üretilemedi."), {
      code: "COLD_EMAIL_EMPTY",
    });
  }
  item.linkedinMessage = settings.shouldGenerateLinkedInMessage
    ? String(bundle.linkedinMessage || "").trim()
    : "";
  item.adaptationNotes = bundle.adaptationNotes || "";
  item.detectedLanguage =
    bundle.companyInfo?.detectedLanguage || item.detectedLanguage;

  const domain = normalizeEmailDomainInput(item.emailDomainInput);
  const candidates = buildRecipientEmails({
    domain,
    selectedCategoryIds: settings.selectedEmailPrefixCategories || [],
    customLocalParts: settings.customEmailLocalParts || [],
    rawDomainInput: item.emailDomainInput,
    includePrimaryEmail: settings.includePrimaryEmailInSend !== false,
    includeEnteredMainDomain: Boolean(settings.includeEnteredMainDomainInSend),
  });

  item.candidateRecipients = candidates;

  // Exclusive kategorilerde tüm liste; diğerlerinde ilk 3
  const exclusive = ["minimal-three", "main-domain-only", "turkey-hiring"];
  const selectedCats = settings.selectedEmailPrefixCategories || [];
  const selected = selectedCats.some((id) => exclusive.includes(id))
    ? candidates
    : candidates.slice(0, 3);
  item.selectedRecipients = selected;

  // Tüm seçili alıcılar genel kutu (info/contact/hello/sales/support/bilgi/destek/iletisim) ise önizleme gövdesini de sarmala (gönderimde idempotent).
  if (
    item.coldEmailBody &&
    selected.length > 0 &&
    selected.every(isInfoOrContactEmail)
  ) {
    item.coldEmailBody = wrapColdEmailForInfoContactInbox({
      bodyText: item.coldEmailBody,
      companyName: item.companyName,
      language: language === "english" ? "english" : "turkish",
    });
  }

  if (!settings.sendMail || job.mode === "analyze_only") {
    await createAnalysisOnlyLog({
      clientId: job.clientId,
      userId: job.userId,
      companyName: item.companyName,
      domain: item.emailDomainInput,
      cvId: settings.cvId,
      cvTitle: settings.cvTitle,
      cvFileName: settings.cvFileName,
      targetPosition: settings.targetPosition,
      projectId: job.projectId,
      subject: item.coldEmailSubject,
      bodyText: item.coldEmailBody,
      companyUrl: item.companyUrl,
      reanalyzeContext: buildTodoReanalyzeContext(job, item, settings),
    }).catch(() => null);

    item.status = "completed";
    item.step = "analyzed_only";
    item.completedAt = new Date();
    job.progress = computeProgress(job.items);
    job.currentItemId = null;
    await job.save();
    return;
  }

  if (!selected.length) {
    throw Object.assign(new Error("Alıcı e-posta üretilemedi."), {
      code: "RECIPIENTS_EMPTY",
    });
  }

  item.status = "sending";
  item.step = "sending_mail";
  job.progress = computeProgress(job.items);
  await job.save();

  const senderName = resolveSenderName(user);

  // Company-based ile aynı: varsayılan optimize PDF; original seçildiyse proje CV
  let pdf = null;
  const wantOptimized = settings.outreachCvAttachmentSource !== "original";
  if (wantOptimized && bundle.adaptedCvData) {
    try {
      const photoUrl = String(
        settings.profileImageUrl || user.profileImageUrl || ""
      ).trim();
      const includePhoto = Boolean(settings.includeCvPhoto) && Boolean(photoUrl);
      const cvForPdf = {
        ...bundle.adaptedCvData,
        personalInfo: {
          ...(bundle.adaptedCvData.personalInfo || {}),
          photoUrl: includePhoto ? photoUrl : "",
          includePhoto,
          photoSizePt: includePhoto ? 99 : undefined,
        },
      };
      pdf = await renderOptimizedCvPdfViaFrontend(cvForPdf, {
        isEnglish: settings.cvLanguage === "english",
      });
      item.cvFileName = pdf.filename || item.cvFileName;
    } catch (pdfErr) {
      console.error(
        "[TODO_JOB] Optimize PDF render başarısız, orijinal CV kullanılacak:",
        pdfErr
      );
    }
  }
  if (!pdf && settings.pdfAttachment?.contentBase64) {
    pdf = {
      filename: settings.pdfAttachment.filename || "CV.pdf",
      contentBase64: settings.pdfAttachment.contentBase64,
      contentType: settings.pdfAttachment.contentType || "application/pdf",
    };
  }

  const prefs = resolveItemSendPrefs(item, settings);
  const trustedEmail = prefs.trustedEmail;

  item.mailDispatchStartedAt = new Date();
  await job.save();

  const sendResult = await sendCompanyOutreachEmails({
    recipients: selected,
    subject: item.coldEmailSubject,
    bodyText: item.coldEmailBody,
    replyTo: settings.replyTo || user.email,
    senderName,
    companyName: item.companyName,
    domain: prefs.domain || domain,
    clientId: job.clientId,
    userId: job.userId,
    cvId: settings.cvId,
    cvTitle: settings.cvTitle,
    cvFileName: item.cvFileName || settings.cvFileName,
    selectedCategories: settings.selectedEmailPrefixCategories,
    templateType: "cold_email",
    targetPosition: settings.targetPosition,
    forceResend: Boolean(settings.forceResend),
    pdfAttachment: pdf,
    skipVerification: false,
    rawDomainInput: prefs.rawDomainInput,
    trustedEmail,
    projectId: job.projectId,
    linkedinMessageText: String(item.linkedinMessage || "").trim() || undefined,
    companyUrl: item.companyUrl,
    reanalyzeContext: buildTodoReanalyzeContext(job, item, settings),
    todoJobId: String(job._id),
    todoItemId: String(item._id),
    analysisSnapshot: item.analysisSnapshot || undefined,
  });

  item.outreachLogId = sendResult.logId || null;
  item.verification = sendResult.verification || null;
  item.sentCount = Number(sendResult.sentCount || 0);
  item.failedCount = Number(sendResult.failedCount || 0);
  item.queuedCount = (sendResult.results || []).filter((r) => r.status === "queued").length;

  const mailIds = Array.isArray(sendResult.mailIds)
    ? sendResult.mailIds.filter(Boolean)
    : (sendResult.results || []).map((r) => r.mailId).filter(Boolean);

  item.mailIds = [...new Set(mailIds)];
  item.recipientResults = (sendResult.results || []).map((r) => ({
    email: r.email,
    status: r.status,
    errorMessage: r.errorMessage || "",
    verifyProvider: r.verifyProvider || "",
    verifyResult: r.verifyResult || "",
    mailId: r.mailId || "",
    openedCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
  }));
  item.selectedRecipients = sendResult.selectedRecipients || selected;

  if (sendResult.status === "failed") {
    item.status = "failed";
    item.step = "send_failed";
    item.errorMessage = sendResult.errorMessage || "Mail gönderimi başarısız.";
    item.errorCode = "SEND_FAILED";
  } else {
    item.status = "completed";
    item.step = "sent";
  }
  item.completedAt = new Date();
}

async function processNextTodoApplicationItem() {
  // Önce: duraklatılmış ama in-progress firması olan işler (mevcut firmayı bitir)
  let job = await TodoApplicationJob.findOne({
    status: "paused",
    "items.status": { $in: ["fetching", "analyzing", "sending"] },
  }).sort({ createdAt: 1 });

  // Sonra: company-based tekil gönderimler (kullanıcı ekranda bekliyor)
  if (!job) {
    job = await TodoApplicationJob.findOne(pendingSendOnlyJobFilter()).sort({
      updatedAt: -1,
    });
  }

  if (!job) {
    job = await TodoApplicationJob.findOne({
      status: { $in: ["pending", "running"] },
    }).sort({ createdAt: 1 });
  }

  if (!job) return { processed: false };

  if (job.status === "pending") {
    job.status = "running";
    job.startedAt = job.startedAt || new Date();
    await job.save();
  }

  // Önce yarım kalan firmayı bitir; ardından send_only (company-based kuyruk) öncelikli
  let item = pickNextPendingJobItem(
    job.items || [],
    job.status,
    Boolean(job.pauseAfterCurrent)
  );

  if (!item) {
    if (job.status === "paused" || job.pauseAfterCurrent) {
      job.pauseAfterCurrent = false;
      job.status = "paused";
      job.currentItemId = null;
      job.progress = computeProgress(job.items);
      await job.save();
      return { processed: false, jobId: String(job._id), paused: true };
    }
    const hasRunning = (job.items || []).some((i) =>
      ["fetching", "analyzing", "sending"].includes(i.status)
    );
    if (!hasRunning) {
      job.status =
        job.progress?.failed > 0 && job.progress?.completed === 0
          ? "failed"
          : "completed";
      job.completedAt = new Date();
      job.currentItemId = null;
      job.pauseAfterCurrent = false;
      job.progress = computeProgress(job.items);
      await job.save();
      await maybeDeleteEphemeralTodoJob(job);
    }
    return { processed: false, jobId: String(job._id), done: true };
  }

  const wasPaused = job.status === "paused" || job.pauseAfterCurrent;

  try {
    await processSingleJobItem(job, item);
  } catch (error) {
    item.status = "failed";
    item.step = "failed";
    item.errorMessage = error instanceof Error ? error.message : String(error);
    item.errorCode = error.code || "ITEM_FAILED";
    item.completedAt = new Date();
    job.lastError = item.errorMessage;
  }

  // Pause bayrağı işlem sırasında güncellenmiş olabilir
  const pauseState = await TodoApplicationJob.findById(job._id)
    .select("status pauseAfterCurrent")
    .lean();
  const shouldStayPaused =
    wasPaused ||
    pauseState?.status === "paused" ||
    Boolean(pauseState?.pauseAfterCurrent);

  job.progress = computeProgress(job.items);
  job.currentItemId = null;

  const stillPending = (job.items || []).some((i) => i.status === "pending");
  const stillRunning = (job.items || []).some((i) =>
    ["fetching", "analyzing", "sending"].includes(i.status)
  );

  // Pause: mevcut bitti → paused kal, sıradakine geçme
  if (shouldStayPaused) {
    job.pauseAfterCurrent = false;
    if (!stillRunning) {
      job.status = "paused";
    }
  } else if (!stillPending && !stillRunning) {
    const allFailed =
      job.progress.failed > 0 &&
      job.progress.completed === 0 &&
      job.progress.skipped === 0;
    job.status = allFailed ? "failed" : "completed";
    job.completedAt = new Date();
  } else {
    job.status = "running";
    job.pauseAfterCurrent = false;
  }

  await job.save();
  await refreshJobMailTracking(job).catch(() => null);
  const deleted = await maybeDeleteEphemeralTodoJob(job);

  return {
    processed: true,
    jobId: String(job._id),
    itemId: String(item._id),
    itemStatus: item.status,
    jobStatus: deleted ? "deleted_ephemeral" : job.status,
  };
}

/**
 * index.js interval'ından çağrılır — sayfa kapalı olsa da devam eder.
 */
async function processTodoApplicationJobs() {
  if (processingLock) {
    return { skipped: true, reason: "busy" };
  }
  processingLock = true;
  try {
    await reopenFalselyAssumedSendOnlyItems();
    // Bir turda en fazla birkaç item (AI rate limit)
    const results = [];
    for (let i = 0; i < 2; i += 1) {
      const result = await processNextTodoApplicationItem();
      results.push(result);
      if (!result.processed) break;
    }
    return { ok: true, results };
  } finally {
    processingLock = false;
  }
}

async function getProjectTodoSummary(clientId, projectId) {
  await getProjectOrThrow(clientId, projectId);
  const [itemCount, activeJob, latestJobs, cvMeta] = await Promise.all([
    TodoApplicationItem.countDocuments({
      clientId,
      projectId,
      archived: { $ne: true },
    }),
    TodoApplicationJob.findOne({
      clientId,
      projectId,
      status: { $in: ["pending", "running", "paused"] },
    })
      .select("-settings.pdfAttachment.contentBase64")
      .lean(),
    TodoApplicationJob.find({ clientId, projectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("-settings.pdfAttachment.contentBase64")
      .lean(),
    getTodoProjectSettings(clientId, projectId),
  ]);

  return {
    itemCount,
    cv: cvMeta,
    activeJob: activeJob ? mapJob(activeJob) : null,
    recentJobs: latestJobs.map((j) => mapJob(j)),
  };
}

/**
 * Projedeki firmaların en güncel job sonuçları (cold mail, açılma, notlar).
 * Aynı sourceItemId / domain için en son job item kazanır.
 */
async function getProjectCompanyResults(clientId, projectId, { limit = 50 } = {}) {
  await getProjectOrThrow(clientId, projectId);
  const jobs = await TodoApplicationJob.find({ clientId, projectId })
    .sort({ createdAt: -1 })
    .limit(Math.min(30, Math.max(1, Number(limit) || 50)))
    .select("-settings.pdfAttachment.contentBase64")
    .lean();

  const byKey = new Map();
  for (const job of jobs) {
    const mapped = mapJob(job);
    for (const item of mapped.items || []) {
      const key =
        item.sourceItemId ||
        `${String(item.emailDomainInput || "").toLowerCase()}|${String(item.companyUrl || "").toLowerCase()}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          ...item,
          jobId: mapped.id,
          jobStatus: mapped.status,
          jobMode: mapped.mode,
          jobCreatedAt: mapped.createdAt,
        });
      }
    }
  }

  const companies = Array.from(byKey.values());
  const totals = {
    total: companies.length,
    mailed: companies.filter((c) => (c.sentCount || 0) > 0 || (c.queuedCount || 0) > 0).length,
    completed: companies.filter((c) => c.status === "completed").length,
    failed: companies.filter((c) => c.status === "failed").length,
    cancelled: companies.filter((c) => c.status === "cancelled").length,
    pending: companies.filter((c) =>
      ["pending", "fetching", "analyzing", "sending"].includes(c.status)
    ).length,
    opened: companies.filter((c) => (c.uniqueOpenedRecipients || 0) > 0).length,
  };

  return { companies, totals, cv: await getTodoProjectSettings(clientId, projectId) };
}

function buildSendOnlyJobItem(body = {}) {
  const recipients = [
    ...new Set(
      (Array.isArray(body.recipients) ? body.recipients : [])
        .map((r) => String(r || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  const emailDomainInput = String(
    body.emailDomainInput || body.domain || body.rawDomainInput || ""
  )
    .trim()
    .toLowerCase();
  const companyUrl = String(body.companyUrl || body.url || "").trim();
  const domain = normalizeEmailDomainInput(emailDomainInput || companyUrl);
  const pdf = body.pdfAttachment || null;

  return {
    sourceItemId: null,
    pipeline: "send_only",
    source: "company-based",
    projectId: body.projectId || null,
    companyUrl: companyUrl || (domain ? `https://${domain}` : ""),
    pageType:
      String(body.pageType || body.reanalyzeContext?.pageType || "careers").trim() ||
      "careers",
    pageTypeOther: String(
      body.pageTypeOther || body.reanalyzeContext?.pageTypeOther || ""
    ).trim(),
    emailDomainInput: emailDomainInput || domain,
    companyName: String(body.companyName || "").trim(),
    status: "pending",
    step: "queued_send_only",
    coldEmailSubject: String(body.subject || "").trim(),
    coldEmailBody: String(body.bodyText || "").trim(),
    linkedinMessage: String(body.linkedinMessageText || "").trim(),
    cvFileName: String(body.cvFileName || pdf?.filename || "").trim(),
    candidateRecipients: recipients,
    selectedRecipients: recipients,
    forceResend: Boolean(body.forceResend),
    selectedCategories: Array.isArray(body.selectedCategories)
      ? body.selectedCategories
      : [],
    replyTo: String(body.replyTo || "").trim(),
    pdfAttachment:
      pdf && pdf.contentBase64
        ? {
            filename: String(pdf.filename || "CV.pdf"),
            contentBase64: String(pdf.contentBase64),
            contentType: String(pdf.contentType || "application/pdf"),
          }
        : { filename: "", contentBase64: "", contentType: "application/pdf" },
    reanalyzeContext:
      body.reanalyzeContext && typeof body.reanalyzeContext === "object"
        ? {
            ...body.reanalyzeContext,
            trustedEmail:
              body.trustedEmail || body.reanalyzeContext.trustedEmail || "",
          }
        : body.trustedEmail
          ? { trustedEmail: body.trustedEmail }
          : null,
    adaptationNotes: String(body.adaptationNotes || "").trim(),
    analysisSnapshot:
      body.analysisSnapshot && typeof body.analysisSnapshot === "object"
        ? body.analysisSnapshot
        : null,
  };
}

/**
 * Company-based analiz sonrası gönderimi mevcut Todo job kuyruğuna ekler.
 * Yeni processor açılmaz; aktif job varsa append, yoksa yeni job.
 */
async function enqueueCompanySend(clientId, userId, body = {}) {
  body = mergeCompanySendBody(body);
  const projectId = body.projectId;
  if (!projectId) {
    throw new AppError(
      "Aralıklı gönderim kuyruğu için outreach projesi seçmelisiniz.",
      400,
      "PROJECT_REQUIRED"
    );
  }
  await getProjectOrThrow(clientId, projectId);

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }
  if (!resolveSenderName(user)) {
    throw new AppError(
      "Mail gönderimi için profilinizde ad ve soyad zorunludur.",
      400,
      "SENDER_NAME_REQUIRED"
    );
  }

  const item = buildSendOnlyJobItem({ ...body, projectId });
  if (!item.companyUrl) {
    throw new AppError("Şirket URL zorunlu.", 400, "COMPANY_URL_REQUIRED");
  }
  if (!item.emailDomainInput || !normalizeEmailDomainInput(item.emailDomainInput)) {
    throw new AppError("Geçersiz ana domain.", 400, "DOMAIN_INVALID");
  }
  if (!item.selectedRecipients.length) {
    throw new AppError("En az bir alıcı seçmelisiniz.", 400, "RECIPIENTS_REQUIRED");
  }
  if (!item.coldEmailBody) {
    throw new AppError("Cold mail gövdesi zorunludur.", 400, "BODY_REQUIRED");
  }

  const liveFilter = enqueueSendOnlyLiveJobFilter(clientId, userId);
  let job = await TodoApplicationJob.findOneAndUpdate(
    liveFilter,
    { $push: { items: item } },
    { new: true, sort: { createdAt: 1 } }
  );

  if (!job) {
    job = await TodoApplicationJob.findOneAndUpdate(
      enqueueSendOnlyPausedJobFilter(clientId, userId),
      resumePausedJobOnEnqueue(item),
      { new: true, sort: { createdAt: 1 } }
    );
  }

  if (!job) {
    const settings = buildSettingsSnapshot(
      {
        ...body,
        mode: "analyze_and_send",
        sendMail: true,
        selectedEmailPrefixCategories: item.selectedCategories.length
          ? item.selectedCategories
          : body.selectedEmailPrefixCategories,
        pdfAttachment: item.pdfAttachment,
        cvFileName: item.cvFileName,
      },
      user
    );
    try {
      job = await TodoApplicationJob.create({
        clientId,
        userId,
        projectId,
        mode: "analyze_and_send",
        status: "pending",
        settings,
        items: [item],
        progress: computeProgress([item]),
      });
    } catch (err) {
      job = await TodoApplicationJob.findOneAndUpdate(
        liveFilter,
        { $push: { items: item } },
        { new: true, sort: { createdAt: 1 } }
      );
      if (!job) {
        job = await TodoApplicationJob.findOneAndUpdate(
          enqueueSendOnlyPausedJobFilter(clientId, userId),
          resumePausedJobOnEnqueue(item),
          { new: true, sort: { createdAt: 1 } }
        );
      }
      if (!job) throw err;
    }
  }

  job.progress = computeProgress(job.items);
  const lastItem = job.items[job.items.length - 1];
  lastItem.status = "sending";
  lastItem.step = "sending_mail";
  lastItem.mailDispatchStartedAt = new Date();
  job.status = job.status === "cancelled" ? job.status : "running";
  job.currentItemId = lastItem._id;
  job.progress = computeProgress(job.items);
  await job.save();

  let sendResult = null;
  try {
    sendResult = await resumeSendOnlyForItem(job, lastItem, job.settings || {}, user);
  } catch (error) {
    lastItem.status = "failed";
    lastItem.step = "failed";
    lastItem.errorMessage = error instanceof Error ? error.message : String(error);
    lastItem.errorCode = error.code || "ITEM_FAILED";
    lastItem.completedAt = new Date();
    job.lastError = lastItem.errorMessage;
    job.currentItemId = null;
    job.progress = computeProgress(job.items);
    const stillOpen = (job.items || []).some((i) =>
      ["pending", "fetching", "analyzing", "sending"].includes(i.status)
    );
    if (!stillOpen) {
      job.status = "completed";
      job.completedAt = job.completedAt || new Date();
    }
    await job.save();
    throw error;
  }

  job.currentItemId = null;
  job.progress = computeProgress(job.items);
  const stillOpen = (job.items || []).some((i) =>
    ["pending", "fetching", "analyzing", "sending"].includes(i.status)
  );
  if (!stillOpen) {
    job.status = "completed";
    job.completedAt = job.completedAt || new Date();
  } else if (job.status !== "paused") {
    job.status = "running";
  }
  await job.save();

  const diagnostics = await buildEnqueueDiagnostics({
    job,
    user,
    enqueuedItemId: lastItem ? String(lastItem._id) : null,
  });

  const queuedCount = (sendResult?.results || []).filter((r) => r.status === "queued").length;
  const sentCount = Number(sendResult?.sentCount || 0);
  const verifySummary = formatOutreachDispatchSummary({
    results: sendResult?.results,
    verification: sendResult?.verification,
  });

  return {
    jobId: String(job._id),
    itemId: lastItem ? String(lastItem._id) : null,
    jobStatus: job.status,
    queuedRecipientCount: item.selectedRecipients.length,
    queuedCount,
    sentCount,
    sendStatus: sendResult?.status || lastItem.status,
    companyName: item.companyName,
    pauseAfterCurrent: Boolean(job.pauseAfterCurrent),
    jobPaused: job.status === "paused",
    dispatchedImmediately: true,
    verification: sendResult?.verification || null,
    results: sendResult?.results || [],
    selectedRecipients: sendResult?.selectedRecipients || lastItem.selectedRecipients || [],
    logId: sendResult?.logId || lastItem.outreachLogId || null,
    verifySummary: verifySummary.text,
    ...diagnostics,
  };
}

/**
 * Kuyruğa alma sonrası "ne olacak" teşhisi — kullanıcıya net sonuç mesajı verebilmek için.
 * Sessiz kalan tüm durumlar (duraklatılmış iş, önünde bekleyen işler, kayıt kapalı,
 * profil aralığı 0) burada uyarıya dönüşür.
 */
async function buildEnqueueDiagnostics({ job, user, enqueuedItemId }) {
  const { minSeconds, maxSeconds } = await getUserIntervalSeconds(job.userId);
  const persistHistory = user?.persistOutreachHistory !== false;

  const liveJobs = await TodoApplicationJob.find({
    userId: job.userId,
    status: { $in: ["pending", "running", "paused"] },
  })
    .select("status items")
    .lean();

  let aheadCount = 0;
  for (const j of liveJobs) {
    for (const it of Array.isArray(j.items) ? j.items : []) {
      if (String(it._id) === String(enqueuedItemId)) continue;
      if (!["pending", "fetching", "analyzing", "sending"].includes(it.status)) {
        continue;
      }
      // send_only öncelikli işlendiği için bulk (full) itemlar sırada önde sayılmaz
      if (it.pipeline === "send_only") aheadCount += 1;
    }
  }

  const warnings = [];
  if (job.status === "paused" || job.pauseAfterCurrent) {
    warnings.push(
      "Aktif toplu iş duraklatılmış görünüyor; SMTP sırası yine de profil aralığına yazılır."
    );
  }
  if (!persistHistory) {
    warnings.push(
      "Profilde “geçmişi kaydet” kapalı: mail kuyruğa yazılmadan anında gönderilir ve Mail Takip → Aralıklı gönderim listesinde görünmez."
    );
  } else if (minSeconds <= 0 && maxSeconds <= 0) {
    warnings.push(
      "Profil gönderim aralığı 0 (anında). Mail doğrulanır ve beklenmeden SMTP’ye gider; aralık istiyorsanız Profilim’den süre girin."
    );
  }

  return {
    aheadSendOnlyCount: aheadCount,
    intervalMinSeconds: minSeconds,
    intervalMaxSeconds: maxSeconds,
    persistHistory,
    processorTickSeconds: TODO_PROCESSOR_TICK_SECONDS,
    warnings,
  };
}

/**
 * EmailQueue'ya henüz düşmemiş bekleyen job mailleri.
 */
async function listPendingCompanySendItems(
  userId,
  { projectId, company, recipient, status } = {}
) {
  const jobs = await TodoApplicationJob.find({
    userId,
    status: { $in: ["pending", "running", "paused", "failed", "completed"] },
  })
    .select("projectId status items pauseAfterCurrent")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const pending = [];
  for (const job of jobs) {
    const jobItems = Array.isArray(job.items) ? job.items : [];
    for (let i = jobItems.length - 1; i >= 0; i -= 1) {
      const it = jobItems[i];
      const isActive = ["pending", "fetching", "analyzing", "sending"].includes(
        it.status
      );
      const isFailedSend =
        it.status === "failed" &&
        (it.pipeline === "send_only" || it.source === "company-based");
      if (!isActive && !isFailedSend) {
        continue;
      }
      if (isActive && itemAlreadyMailed(it)) continue;
      const failedAt = it.completedAt ? new Date(it.completedAt).getTime() : 0;
      if (isFailedSend && failedAt && Date.now() - failedAt > 7 * 24 * 60 * 60 * 1000) {
        continue;
      }
      const itemProjectId = it.projectId || job.projectId;
      if (projectId && String(itemProjectId) !== String(projectId)) continue;
      const companyName = String(it.companyName || "");
      if (
        company &&
        !companyName.toLowerCase().includes(String(company).toLowerCase())
      ) {
        continue;
      }
      const recipients = Array.isArray(it.selectedRecipients)
        ? it.selectedRecipients
        : [];
      if (
        recipient &&
        !recipients.some((r) =>
          String(r).toLowerCase().includes(String(recipient).toLowerCase())
        )
      ) {
        continue;
      }
      const queueStatus =
        it.status === "failed"
          ? "failed"
          : ["sending", "fetching", "analyzing"].includes(it.status)
            ? "processing"
            : "pending";
      if (status && queueStatus !== status) continue;
      pending.push({
        jobId: String(job._id),
        itemId: String(it._id),
        jobStatus: job.status,
        itemStatus: it.status,
        queueStatus,
        pipeline: it.pipeline || "full",
        source: it.source || "bulk",
        projectId: itemProjectId ? String(itemProjectId) : null,
        companyName,
        companyUrl: it.companyUrl || "",
        recipients,
        recipientCount: recipients.length,
        scheduledAt: null,
        waitingForJob: it.status !== "failed",
        errorMessage: it.errorMessage || "",
        errorCode: it.errorCode || "",
        cvFileName: it.cvFileName || "",
        coldEmailSubject: it.coldEmailSubject || "",
        hasAnalysisSnapshot: Boolean(it.analysisSnapshot),
        lastActionAt: it.completedAt || it.mailDispatchStartedAt || it.startedAt || job.updatedAt || job.createdAt || null,
        createdAt: job.createdAt || null,
        updatedAt: job.updatedAt || it.completedAt || it.startedAt || null,
      });
    }
  }
  return pending;
}

function mapJobItemPublicDetail(job, item) {
  if (!job || !item) return null;
  return {
    jobId: String(job._id),
    itemId: String(item._id),
    jobStatus: job.status,
    itemStatus: item.status,
    pipeline: item.pipeline || "full",
    source: item.source || "bulk",
    projectId: item.projectId
      ? String(item.projectId)
      : job.projectId
        ? String(job.projectId)
        : null,
    companyName: item.companyName || "",
    companyUrl: item.companyUrl || "",
    emailDomainInput: item.emailDomainInput || "",
    cvFileName: item.cvFileName || "",
    selectedRecipients: item.selectedRecipients || [],
    candidateRecipients: item.candidateRecipients || [],
    recipientResults: item.recipientResults || [],
    coldEmailSubject: item.coldEmailSubject || "",
    coldEmailBody: item.coldEmailBody || "",
    linkedinMessage: item.linkedinMessage || "",
    adaptationNotes: item.adaptationNotes || "",
    analysisSnapshot: item.analysisSnapshot || null,
    verification: item.verification || null,
    sentCount: item.sentCount || 0,
    failedCount: item.failedCount || 0,
    queuedCount: item.queuedCount || 0,
    errorMessage: item.errorMessage || "",
    step: item.step || "",
  };
}

async function getTodoJobItemDetail(userId, jobId, itemId) {
  if (!jobId || !itemId) {
    throw new AppError("jobId ve itemId zorunlu.", 400, "ITEM_DETAIL_REQUIRED");
  }
  const job = await TodoApplicationJob.findOne({ _id: jobId, userId }).select(
    "-settings.pdfAttachment.contentBase64 -items.pdfAttachment.contentBase64 -settings.cvText"
  );
  if (!job) {
    throw new AppError("İş bulunamadı.", 404, "TODO_JOB_NOT_FOUND");
  }
  const item = (job.items || []).find((it) => String(it._id) === String(itemId));
  if (!item) {
    throw new AppError("Kuyruk öğesi bulunamadı.", 404, "TODO_JOB_ITEM_NOT_FOUND");
  }
  return mapJobItemPublicDetail(job, item);
}

function domainLooksRelated(a, b) {
  const left = String(a || "").trim().toLowerCase();
  const right = String(b || "").trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function companyLooksRelated(a, b) {
  const left = String(a || "").trim().toLowerCase();
  const right = String(b || "").trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/** Mail kuyruğunda job id yoksa son şirket analiz özetini eşleştirir. */
async function findLatestJobItemWithAnalysis(userId, { companyName, domain } = {}) {
  const company = String(companyName || "").trim();
  const domainRaw = String(domain || "").trim();
  if (!company && !domainRaw) return null;

  const jobs = await TodoApplicationJob.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(40)
    .select(
      "-settings.pdfAttachment.contentBase64 -items.pdfAttachment.contentBase64 -settings.cvText"
    )
    .lean();

  let companyFallback = null;
  for (const job of jobs) {
    for (const it of job.items || []) {
      if (!it.analysisSnapshot) continue;
      if (domainLooksRelated(it.emailDomainInput, domainRaw)) {
        return mapJobItemPublicDetail(job, it);
      }
      if (!companyFallback && companyLooksRelated(it.companyName, company)) {
        companyFallback = mapJobItemPublicDetail(job, it);
      }
    }
  }
  return companyFallback;
}

async function deletePendingOrFailedQueuesForTodoItem(userId, itemId) {
  const docs = await EmailQueue.find({
    userId,
    "metadata.todoItemId": String(itemId),
    status: { $in: ["pending", "failed"] },
  });
  const snapshots = docs.map((doc) => (doc.toObject ? doc.toObject() : doc));
  for (const doc of docs) {
    const mailId = String(doc.metadata?.mailId || "").trim();
    if (mailId) {
      await MailTracking.deleteOne({ mailId, userId });
    }
    await EmailQueue.deleteOne({ _id: doc._id, userId });
  }
  return snapshots;
}

async function cancelOrRemoveCompanySendItem(clientId, userId, jobId, itemId) {
  if (!jobId || !itemId) {
    throw new AppError("jobId ve itemId zorunlu.", 400, "JOB_ITEM_REQUIRED");
  }
  const query = { _id: jobId, userId };
  if (clientId) query.clientId = clientId;
  const job = await TodoApplicationJob.findOne(query);
  if (!job) {
    throw new AppError("İş bulunamadı.", 404, "TODO_JOB_NOT_FOUND");
  }
  const item = job.items.id(itemId);
  if (!item) {
    throw new AppError("Kuyruk öğesi bulunamadı.", 404, "TODO_ITEM_NOT_FOUND");
  }

  const processingSmtp = await EmailQueue.findOne({
    userId,
    "metadata.todoItemId": String(itemId),
    status: "processing",
  });
  if (processingSmtp) {
    throw new AppError(
      "Gönderimi devam eden mail varken bu kayıt iptal edilemez.",
      409,
      "QUEUE_IN_FLIGHT"
    );
  }

  let removedQueueDocs = [];
  if (item.status === "failed") {
    removedQueueDocs = await deletePendingOrFailedQueuesForTodoItem(userId, itemId);
    item.deleteOne();
  } else if (["pending", "fetching", "analyzing", "sending"].includes(item.status)) {
    removedQueueDocs = await deletePendingOrFailedQueuesForTodoItem(userId, itemId);
    const sentLeft = await EmailQueue.countDocuments({
      userId,
      "metadata.todoItemId": String(itemId),
      status: "sent",
    });
    if (sentLeft > 0) {
      item.status = "completed";
      item.step = "completed";
      item.queuedCount = 0;
    } else {
      item.status = "cancelled";
      item.step = "cancelled";
    }
    item.completedAt = new Date();
  } else {
    throw new AppError(
      "Yalnızca sıradaki veya başarısız kayıtlar iptal edilebilir.",
      400,
      "NOT_CANCELLABLE"
    );
  }

  job.progress = computeProgress(job.items);
  const stillOpen = (job.items || []).some((i) =>
    ["pending", "fetching", "analyzing", "sending"].includes(i.status)
  );
  if (!stillOpen && ["pending", "running", "failed", "completed"].includes(job.status)) {
    job.status = "completed";
    job.completedAt = job.completedAt || new Date();
  }
  await job.save();
  let rescheduled = 0;
  const pendingRemoved = removedQueueDocs.filter((d) => String(d.status) === "pending");
  if (pendingRemoved.length) {
    const { compactPendingAfterRemovedSlots } = require("./email-queue.service");
    const compact = await compactPendingAfterRemovedSlots(userId, pendingRemoved);
    rescheduled = Number(compact.rescheduled || 0);
  }
  return {
    ok: true,
    jobId: String(job._id),
    itemId: String(itemId),
    rescheduled,
  };
}

async function removeFailedCompanySendItem(clientId, userId, jobId, itemId) {
  return cancelOrRemoveCompanySendItem(clientId, userId, jobId, itemId);
}

module.exports = {
  listTodoItems,
  createTodoItems,
  updateTodoItem,
  deleteTodoItem,
  deleteTodoItemsBulk,
  startTodoJob,
  enqueueCompanySend,
  listPendingCompanySendItems,
  getTodoJobItemDetail,
  findLatestJobItemWithAnalysis,
  cancelOrRemoveCompanySendItem,
  removeFailedCompanySendItem,
  listTodoJobs,
  getTodoJob,
  setTodoJobStatus,
  processTodoApplicationJobs,
  processSingleJobItem,
  getProjectTodoSummary,
  getProjectCompanyResults,
  getTodoProjectSettings,
  updateTodoProjectPrefs,
  upsertTodoProjectCv,
  clearTodoProjectCv,
  getTodoProjectCvAttachment,
  mapItem,
  mapJob,
};
