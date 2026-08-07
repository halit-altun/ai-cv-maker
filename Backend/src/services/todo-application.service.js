const TodoApplicationItem = require("../models/todo-application-item.model");
const TodoApplicationJob = require("../models/todo-application-job.model");
const TodoProjectSettings = require("../models/todo-project-settings.model");
const MailTracking = require("../models/mail-tracking.model");
const User = require("../models/user.model");
const { AppError } = require("../utils/app-error");
const { isValidPdfBuffer } = require("../utils/email-attachment.utils");
const { getProjectOrThrow } = require("./outreach-project.service");
const { fetchPageText } = require("./todo-page-fetch.service");
const {
  buildRecipientEmails,
  normalizeEmailDomainInput,
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

let processingLock = false;

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

async function processSingleJobItem(job, item) {
  const settings = job.settings || {};
  const user = await User.findById(job.userId).lean();
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
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

  item.companyName = bundle.companyInfo?.name || item.companyName;
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
  });

  item.candidateRecipients = candidates;

  // Exclusive kategorilerde tüm liste; diğerlerinde ilk 3
  const exclusive = ["minimal-three", "main-domain-only", "turkey-hiring"];
  const selectedCats = settings.selectedEmailPrefixCategories || [];
  const selected = selectedCats.some((id) => exclusive.includes(id))
    ? candidates
    : candidates.slice(0, 3);
  item.selectedRecipients = selected;

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
    }).catch(() => null);

    item.status = "completed";
    item.step = "analyzed_only";
    item.completedAt = new Date();
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

  const trustedEmail =
    settings.includePrimaryEmailInSend !== false &&
    settings.skipPrimaryEmailVerification &&
    String(item.emailDomainInput || "").includes("@")
      ? String(item.emailDomainInput).trim().toLowerCase()
      : undefined;

  const sendResult = await sendCompanyOutreachEmails({
    recipients: selected,
    subject: item.coldEmailSubject,
    bodyText: item.coldEmailBody,
    replyTo: settings.replyTo || user.email,
    senderName,
    companyName: item.companyName,
    domain,
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
    rawDomainInput: item.emailDomainInput,
    trustedEmail,
    projectId: job.projectId,
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

  // Önce yarım kalan firmayı bitir
  let item = (job.items || []).find((i) =>
    ["fetching", "analyzing", "sending"].includes(i.status)
  );

  // Duraklatılmışsa yeni firmaya geçme
  if (!item) {
    if (job.status === "paused" || job.pauseAfterCurrent) {
      job.pauseAfterCurrent = false;
      job.status = "paused";
      job.currentItemId = null;
      job.progress = computeProgress(job.items);
      await job.save();
      return { processed: false, jobId: String(job._id), paused: true };
    }
    item = (job.items || []).find((i) => i.status === "pending");
  }

  if (!item) {
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

  return {
    processed: true,
    jobId: String(job._id),
    itemId: String(item._id),
    itemStatus: item.status,
    jobStatus: job.status,
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

module.exports = {
  listTodoItems,
  createTodoItems,
  updateTodoItem,
  deleteTodoItem,
  deleteTodoItemsBulk,
  startTodoJob,
  listTodoJobs,
  getTodoJob,
  setTodoJobStatus,
  processTodoApplicationJobs,
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
