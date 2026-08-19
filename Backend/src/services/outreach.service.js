const OutreachLog = require("../models/outreach-log.model");
const MailTracking = require("../models/mail-tracking.model");
const crypto = require("crypto");
const { enqueueEmail, attachOutreachLogToQueuedEmails } = require("./email-queue.service");
const {
  isInfoOrContactEmail,
  anyInfoOrContactEmail,
  wrapColdEmailForInfoContactInbox,
  wrapLinkedInForGenericInbox,
} = require("../utils/cold-email-generic-inbox");
const { createMailTracking, generateTrackingPixelHtml } = require("./mail-tracking.service");
const { createEmailHtmlTemplate } = require("../utils/email-template");
const { AppError } = require("../utils/app-error");
const {
  isVerifyEnabled,
  pickValidRecipient,
} = require("./email-verifier.service");
const {
  buildPdfAttachmentFromBase64,
  stripDataUriBase64,
  toQueueAttachment,
} = require("../utils/email-attachment.utils");
const { resolveCompanyDisplayName } = require("../utils/company-display-name");
const {
  sanitizeOutreachPlaceholders,
} = require("../utils/outreach-placeholder.utils");
const {
  isPersistOutreachHistoryEnabled,
} = require("../utils/persist-outreach-history");
const {
  normalizeReanalyzeContext,
  buildReanalyzePayloadFromLog,
} = require("../utils/reanalyze-context");
const User = require("../models/user.model");

/** Aynı client+domain için paralel gönderimi sıraya al (çift API → çift mail) */
const domainSendLocks = new Map();

async function withDomainSendLock(clientId, domain, fn) {
  const key = `${String(clientId || "")}:${String(domain || "").toLowerCase()}`;
  const previous = domainSendLocks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const chained = previous.catch(() => undefined).then(() => gate);
  domainSendLocks.set(key, chained);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (domainSendLocks.get(key) === chained) {
      domainSendLocks.delete(key);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * İki alıcı arası rastgele bekleme.
 * Varsayılan 100–5000 ms (0.1–5 sn, aralıkta %100 rastgele).
 * OUTREACH_SEND_DELAY_MIN_MS / OUTREACH_SEND_DELAY_MAX_MS ile ayarlanır.
 */
function resolveInterSendDelayMs() {
  let minMs = Number(process.env.OUTREACH_SEND_DELAY_MIN_MS);
  let maxMs = Number(process.env.OUTREACH_SEND_DELAY_MAX_MS);

  if (!Number.isFinite(minMs) || minMs < 0) minMs = 100;
  if (!Number.isFinite(maxMs) || maxMs < 0) maxMs = 5000;

  if (maxMs < minMs) {
    const t = minMs;
    minMs = maxMs;
    maxMs = t;
  }

  if (maxMs === minMs) return Math.floor(minMs);
  return Math.floor(minMs + Math.random() * (maxMs - minMs + 1));
}

// HTML şablon için (şu an kullanılmıyor; şablon açılınca birlikte açılır)
// function escapeHtml(value) {
//   return String(value || "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/\n/g, "<br />");
// }

function normalizeDomain(raw) {
  let value = String(raw || "").trim().toLowerCase();
  if (!value) return "";

  if (value.includes("@")) {
    value = value.split("@").pop() || "";
  }

  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  value = value.split("/")[0].split("?")[0].replace(/^@/, "");
  return value;
}

function getOutreachLimits() {
  return {
    maxRecipientsPerSend: Math.max(
      1,
      Number(process.env.OUTREACH_MAX_RECIPIENTS_PER_SEND || 5)
    ),
    dailyEmailLimit: Math.max(
      1,
      Number(process.env.OUTREACH_DAILY_EMAIL_LIMIT || 3000)
    ),
    blockDomainResend: String(process.env.OUTREACH_BLOCK_DOMAIN_RESEND || "true")
      .toLowerCase() !== "false",
  };
}

async function countTodayRecipientSends(clientId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const logs = await OutreachLog.find({
    clientId,
    sentAt: { $gte: start },
    status: { $in: ["success", "partial", "failed"] },
  })
    .select("totalRecipients sentCount")
    .lean();

  return logs.reduce((sum, log) => sum + Number(log.totalRecipients || 0), 0);
}

function buildPdfAttachment(attachment) {
  if (!attachment || !attachment.contentBase64) return null;
  const raw = stripDataUriBase64(attachment.contentBase64);
  // ~8MB base64 ~ 6MB binary
  if (raw.length > 11_000_000) {
    throw new AppError("CV eki çok büyük (max ~8MB).", 400, "ATTACHMENT_TOO_LARGE");
  }
  try {
    return buildPdfAttachmentFromBase64({
      filename: attachment.filename,
      contentBase64: raw,
      contentType: attachment.contentType,
    });
  } catch (err) {
    if (err && err.code === "INVALID_PDF_ATTACHMENT") {
      throw new AppError(
        "CV eki bozuk veya geçersiz PDF. Lütfen tekrar üretin / yükleyin.",
        400,
        "INVALID_PDF_ATTACHMENT"
      );
    }
    throw err;
  }
}

/**
 * Hedef firmaya CV + mail şablonu gönderir ve client bazlı log kaydeder.
 */
async function sendCompanyOutreachEmails(params) {
  const candidates = Array.isArray(params?.recipients)
    ? [...new Set(params.recipients.map((r) => String(r || "").trim().toLowerCase()).filter(Boolean))]
    : [];
  const earlyDomain =
    normalizeDomain(params?.domain) ||
    normalizeDomain(candidates[0]) ||
    "";
  if (!earlyDomain || !params?.clientId) {
    return sendCompanyOutreachEmailsImpl(params);
  }
  return withDomainSendLock(params.clientId, earlyDomain, () =>
    sendCompanyOutreachEmailsImpl(params)
  );
}

async function sendCompanyOutreachEmailsImpl({
  recipients,
  subject,
  bodyText,
  replyTo,
  senderName,
  companyName,
  domain,
  clientId,
  userId,
  cvId,
  cvTitle,
  cvFileName,
  selectedCategories,
  templateType,
  targetPosition,
  forceResend,
  pdfAttachment,
  skipVerification,
  rawDomainInput,
  trustedEmail,
  projectId,
  trackingPublicBaseUrl,
  linkedinMessageText,
  companyUrl,
  reanalyzeContext,
  todoJobId,
  todoItemId,
  analysisSnapshot,
}) {
  const limits = getOutreachLimits();
  const candidates = Array.isArray(recipients)
    ? [...new Set(recipients.map((r) => String(r || "").trim().toLowerCase()).filter(Boolean))]
    : [];

  const fromDisplayName = String(senderName || "").trim();
  if (!fromDisplayName) {
    throw new AppError(
      "Mail gönderimi için profilinizde ad ve soyad zorunludur. Profilim sayfasından kaydedin.",
      400,
      "SENDER_NAME_REQUIRED"
    );
  }

  if (!candidates.length) {
    throw new AppError("En az bir alıcı e-posta gerekli.", 400, "RECIPIENTS_REQUIRED");
  }

  if (candidates.length > limits.maxRecipientsPerSend) {
    throw new AppError(
      `Tek seferde en fazla ${limits.maxRecipientsPerSend} alıcıya gönderilebilir.`,
      400,
      "RECIPIENT_LIMIT",
      { max: limits.maxRecipientsPerSend, requested: candidates.length }
    );
  }

  if (!bodyText || !String(bodyText).trim()) {
    throw new AppError("Mail gövdesi zorunludur.", 400, "BODY_REQUIRED");
  }

  const resolvedDomain =
    normalizeDomain(domain) ||
    normalizeDomain(candidates[0]) ||
    "";

  if (!resolvedDomain) {
    throw new AppError("Geçerli bir e-posta domaini gerekli.", 400, "DOMAIN_REQUIRED");
  }

  const resolvedCompanyName =
    resolveCompanyDisplayName({
      name: companyName,
      website: companyUrl,
      domain: resolvedDomain,
    }) ||
    String(companyName || "").trim() ||
    resolvedDomain;

  const resolvedReanalyzeContext = normalizeReanalyzeContext(
    {
      ...(reanalyzeContext && typeof reanalyzeContext === "object"
        ? reanalyzeContext
        : {}),
      companyUrl,
      rawDomainInput,
      domain: resolvedDomain,
      companyName: resolvedCompanyName,
      targetPosition,
      projectId,
      selectedCategories,
    },
    {}
  );

  let resolvedProjectId = null;
  let resolvedProjectName = "";
  if (projectId) {
    const { getProjectOrThrow } = require("./outreach-project.service");
    const project = await getProjectOrThrow(clientId, projectId);
    resolvedProjectId = project._id;
    resolvedProjectName = String(project.name || "").trim();
  }

  const persistHistory = await isPersistOutreachHistoryEnabled(userId);
  const userMailPrefs = await User.findById(userId)
    .select("enableMailTracking")
    .lean();
  const trackingEnabled =
    persistHistory && userMailPrefs?.enableMailTracking !== false;

  // --- Gönderimden hemen önce: MX + Reacher/EmailVerify doğrulama ---
  const verifyOn = isVerifyEnabled() && !skipVerification;
  let verificationMeta = {
    enabled: verifyOn,
    mxOk: false,
    provider: "",
    selectedEmail: "",
    selectedEmails: [],
    checks: [],
    warning: "",
  };
  let list = candidates;

  if (verifyOn) {
    const picked = await pickValidRecipient(candidates, {
      domain: resolvedDomain,
      rawDomainInput: rawDomainInput || domain,
      trustedEmail,
    });
    const allValid = Array.isArray(picked.validEmails)
      ? picked.validEmails.filter(Boolean)
      : picked.validEmail
        ? [picked.validEmail]
        : [];

    verificationMeta = {
      enabled: true,
      mxOk: Boolean(picked.mx?.ok),
      provider: picked.provider || "",
      selectedEmail: allValid[0] || picked.validEmail || "",
      selectedEmails: allValid,
      checks: (picked.checks || []).map((c) => ({
        email: c.email,
        isValid: Boolean(c.isValid),
        provider: c.provider || "",
        result: c.result || c.reason || "",
      })),
      warning: picked.warning || "",
    };

    if (!picked.ok || allValid.length === 0) {
      const failRecipients = (verificationMeta.checks.length
        ? verificationMeta.checks
        : candidates.map((email) => ({
            email,
            isValid: false,
            provider: "mx",
            result: picked.reason || "NO_VALID_EMAIL",
          }))
      ).map((c) => ({
        email: c.email,
        status: "invalid",
        errorMessage: `Doğrulanamadı (${c.provider || "n/a"}: ${c.result || picked.reason || "fail"})`,
        verifyProvider: c.provider || "",
        verifyResult: c.result || "",
      }));

      const failMessage =
        picked.message || "Geçerli e-posta bulunamadı; gönderim iptal edildi.";

      let failLogId = null;
      if (persistHistory) {
        const failLog = await OutreachLog.create({
          clientId,
          userId,
          projectId: resolvedProjectId,
          companyName: resolvedCompanyName,
          domain: resolvedDomain,
          status: "verify_failed",
          subject: String(subject || "").trim(),
          bodyText: String(bodyText || "").trim(),
          templateType: templateType || "cold_email",
          cvId: cvId || null,
          cvTitle: cvTitle || "",
          cvFileName: cvFileName || "",
          selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [],
          recipients: failRecipients,
          sentCount: 0,
          failedCount: failRecipients.length,
          loggedCount: 0,
          totalRecipients: failRecipients.length,
          errorMessage: failMessage,
          targetPosition: targetPosition || "",
          replyTo: replyTo || "",
          verification: verificationMeta,
          reanalyzeContext: resolvedReanalyzeContext,
          sentAt: new Date(),
        });
        failLogId = String(failLog._id);
      }

      throw new AppError(failMessage, 422, picked.reason === "NO_MX" || picked.reason === "ENOTFOUND" ? "NO_MX" : "NO_VALID_EMAIL", {
        domain: resolvedDomain,
        verification: verificationMeta,
        logId: failLogId,
      });
    }

    // Tüm doğrulanmış geçerli adreslere gönder (limit dahilinde).
    // Ana adres yalnızca trustedEmail açıkça verildiyse (checkbox) eklenir.
    const trustedResolved = (() => {
      const explicit = String(trustedEmail || "").trim().toLowerCase();
      return explicit.includes("@") ? explicit : null;
    })();

    list = allValid.slice(0, limits.maxRecipientsPerSend);
    if (trustedResolved && !list.includes(trustedResolved)) {
      list = [trustedResolved, ...list].slice(0, limits.maxRecipientsPerSend);
    }
  }

  if (limits.blockDomainResend && !forceResend) {
    const prior = await OutreachLog.findOne({
      clientId,
      domain: resolvedDomain,
      status: { $in: ["success", "partial"] },
      $or: [
        { sentCount: { $gt: 0 } },
        { loggedCount: { $gt: 0 } },
        { "recipients.status": { $in: ["sent", "logged", "queued"] } },
      ],
    })
      .sort({ sentAt: -1 })
      .lean();

    if (prior) {
      const lastDate = prior.sentAt ? new Date(prior.sentAt).toLocaleDateString('tr-TR') : 'Bilinmiyor';
      throw new AppError(
        `Bu firmaya (@${resolvedDomain}) daha önce mail gönderildi (${lastDate}). Aynı firmaya tekrar mail göndermek profesyonellik açısından önerilmez. Yine de göndermek isterseniz "Yine de Gönder" butonunu kullanın.`,
        409,
        "DOMAIN_ALREADY_CONTACTED",
        {
          domain: resolvedDomain,
          lastSentAt: prior.sentAt,
          lastStatus: prior.status,
          logId: String(prior._id),
          canForceResend: true,
        }
      );
    }
  }

  const todayCount = await countTodayRecipientSends(clientId);
  if (todayCount + list.length > limits.dailyEmailLimit) {
    throw new AppError(
      `Günlük gönderim kotası aşıldı (${todayCount}/${limits.dailyEmailLimit}).`,
      429,
      "DAILY_QUOTA_EXCEEDED",
      {
        used: todayCount,
        limit: limits.dailyEmailLimit,
        requested: list.length,
      }
    );
  }

  const attachment = buildPdfAttachment(pdfAttachment);
  const attachments = attachment ? [attachment] : [];
  const storedPdf = toQueueAttachment(pdfAttachment);

  const safeSubject = sanitizeOutreachPlaceholders(
    String(subject || "").trim() ||
      `Başvuru${resolvedCompanyName ? ` — ${resolvedCompanyName}` : ""} | ${fromDisplayName}`,
    {
      kind: "subject",
      companyName: resolvedCompanyName,
      candidateName: fromDisplayName,
    }
  );

  const baseText = sanitizeOutreachPlaceholders(String(bodyText).trim(), {
    kind: "body",
    companyName: resolvedCompanyName,
    candidateName: fromDisplayName,
  });
  const infoContactBodyText = anyInfoOrContactEmail(list)
    ? sanitizeOutreachPlaceholders(
        wrapColdEmailForInfoContactInbox({
          bodyText: baseText,
          companyName: resolvedCompanyName,
        }),
        {
          kind: "body",
          companyName: resolvedCompanyName,
          candidateName: fromDisplayName,
        }
      )
    : "";

  let linkedinStandard =
    String(linkedinMessageText || "").trim() ||
    String(
      resolvedReanalyzeContext?.linkedinMessageSnapshot ||
        reanalyzeContext?.linkedinMessageSnapshot ||
        ""
    ).trim();
  if (linkedinStandard) {
    linkedinStandard = sanitizeOutreachPlaceholders(linkedinStandard, {
      kind: "body",
      companyName: resolvedCompanyName,
      candidateName: fromDisplayName,
    });
  }
  if (linkedinStandard && resolvedReanalyzeContext) {
    resolvedReanalyzeContext.linkedinMessageSnapshot = linkedinStandard;
  }
  const linkedinInfoContact = linkedinStandard && anyInfoOrContactEmail(list)
    ? sanitizeOutreachPlaceholders(
        wrapLinkedInForGenericInbox({
          bodyText: linkedinStandard,
        }),
        {
          kind: "body",
          companyName: resolvedCompanyName,
          candidateName: fromDisplayName,
        }
      )
    : "";

  const results = [];
  const mailIds = [];
  const selectedSet = new Set(list.map((e) => String(e).toLowerCase()));

  // Doğrulama sonrası geçersiz / limite takılan adayları logla
  if (verifyOn && verificationMeta.checks?.length) {
    for (const check of verificationMeta.checks) {
      const email = String(check.email || "").toLowerCase();
      if (selectedSet.has(email)) continue;
      const wasValid = Boolean(check.isValid);
      results.push({
        email: check.email,
        status: wasValid ? "skipped" : "invalid",
        errorMessage: wasValid
          ? `Geçerli ama tek sefer limitine (${limits.maxRecipientsPerSend}) takıldığı için atlandı.`
          : `Doğrulama başarısız (${check.provider}: ${check.result})`,
        verifyProvider: check.provider || "",
        verifyResult: check.result || "",
        mailId: "",
      });
    }
  }

  for (let i = 0; i < list.length; i += 1) {
    const to = list[i];
    // info@ / contact@ / hello@ / sales@ / support@ / bilgi@ / destek@ / iletisim@: mevcut cold mail aynı kalır; yalnızca yönlendirme girişi + teşekkür eklenir.
    // Diğer alıcılar: baseText birebir (tek kelime değişmez).
    const text = isInfoOrContactEmail(to)
      ? wrapColdEmailForInfoContactInbox({
          bodyText: baseText,
          companyName: resolvedCompanyName,
        })
      : baseText;
    if (i > 0 && list.length > 1) {
      const waitMs = resolveInterSendDelayMs();
      console.log(
        `[OUTREACH DELAY] ${to} öncesi ${(waitMs / 1000).toFixed(1)} sn bekleniyor (${i + 1}/${list.length})`
      );
      await sleep(waitMs);
    }
    const checkMeta = (verificationMeta.checks || []).find(
      (c) => String(c.email || "").toLowerCase() === String(to).toLowerCase()
    );
    try {
      let mailId = null;
      let pixelHtml = "";
      let htmlBody = text; // Plain text fallback
      const pendingTracking = trackingEnabled
        ? {
            recipient: to,
            company: resolvedCompanyName,
            jobTitle: targetPosition || "",
            subject: safeSubject,
            projectId: resolvedProjectId || null,
            projectName: resolvedProjectName,
            linkedinMessageText: linkedinStandard,
            linkedinInfoContactMessageText:
              isInfoOrContactEmail(to) && linkedinStandard
                ? linkedinInfoContact ||
                  wrapLinkedInForGenericInbox({ bodyText: linkedinStandard })
                : "",
          }
        : null;

      // Pixel HTML'e enqueue anında gömülür; Mail Takip dokümanı kuyrukta SMTP sonrası yazılır.
      if (trackingEnabled) {
        mailId = crypto.randomUUID();
        pixelHtml = generateTrackingPixelHtml(mailId, trackingPublicBaseUrl);
        htmlBody = createEmailHtmlTemplate(text, pixelHtml);
      }

      // Mail'i queue'ya ekle (interval 0 veya kayıt kapalıysa direkt gönderir)
      const queueResult = await enqueueEmail(
        userId,
        {
          to: [to],
          subject: safeSubject,
          text, // Plain text fallback
          html: trackingEnabled ? htmlBody : undefined, // HTML with tracking pixel (sadece aktifse)
          fromName: fromDisplayName,
          replyTo: replyTo || undefined,
          attachments,
        },
        {
          companyName,
          domain: resolvedDomain,
          cvId,
          cvTitle,
          selectedCategories,
          mailId, // Tracking ID
          pendingTracking,
          persistHistory,
          // Todo job üzerinden gelen gönderimler aralıklı kuyruk pipeline'ıdır:
          // profil aralığı 0 olsa da kuyrukta iz bırakmalı.
          forceQueue: Boolean(todoJobId),
          projectId: resolvedProjectId ? String(resolvedProjectId) : undefined,
          companyUrl: companyUrl || undefined,
          todoJobId: todoJobId ? String(todoJobId) : undefined,
          todoItemId: todoItemId ? String(todoItemId) : undefined,
          analysisSnapshot:
            analysisSnapshot && typeof analysisSnapshot === "object"
              ? analysisSnapshot
              : undefined,
        }
      );

      if (queueResult.sent && queueResult.immediate) {
        if (trackingEnabled && mailId && pendingTracking) {
          await createMailTracking({
            mailId,
            userId,
            sentAt: new Date(),
            outreachLogId: null,
            ...pendingTracking,
          });
          mailIds.push(mailId);
        }
        // Direkt gönderildi (interval 0)
        results.push({
          email: to,
          status: "sent",
          errorMessage: "",
          verifyProvider: checkMeta?.provider || verificationMeta.provider || "",
          verifyResult: checkMeta?.result || (verificationMeta.provider ? "valid" : ""),
          mailId: mailId || "",
        });
      } else if (queueResult.queued) {
        // Kuyruğa eklendi
        results.push({
          email: to,
          status: "queued",
          errorMessage: "",
          queueId: queueResult.queueId,
          scheduledAt: queueResult.scheduledAt,
          estimatedSendTime: queueResult.estimatedSendTime,
          verifyProvider: checkMeta?.provider || verificationMeta.provider || "",
          verifyResult: checkMeta?.result || (verificationMeta.provider ? "valid" : ""),
          mailId: mailId || "",
        });
      }
    } catch (err) {
      results.push({
        email: to,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Gönderim hatası",
        verifyProvider: checkMeta?.provider || verificationMeta.provider || "",
        verifyResult: checkMeta?.result || (verificationMeta.provider ? "valid" : ""),
        mailId: "",
      });
    }
  }


  const sentCount = results.filter((r) => r.status === "sent").length;
  const loggedCount = results.filter((r) => r.status === "logged").length;
  const queuedCount = results.filter((r) => r.status === "queued").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  let status = "failed";
  const acceptedCount = sentCount + loggedCount + queuedCount;
  if (acceptedCount > 0 && failedCount === 0) status = "success";
  else if (acceptedCount > 0 && failedCount > 0) status = "partial";
  else status = "failed";

  let logId = null;
  if (persistHistory) {
    const log = await OutreachLog.create({
      clientId,
      userId,
      projectId: resolvedProjectId,
      companyName: resolvedCompanyName,
      domain: resolvedDomain,
      status,
      subject: safeSubject,
      bodyText: baseText,
      infoContactBodyText,
      linkedinMessageText: linkedinStandard,
      linkedinInfoContactMessageText: linkedinInfoContact,
      templateType: templateType || "cold_email",
      cvId: cvId || null,
      cvTitle: cvTitle || "",
      cvFileName: cvFileName || (storedPdf ? storedPdf.filename : "") || (attachment ? attachment.filename : ""),
      pdfAttachment: storedPdf
        ? {
            filename: storedPdf.filename,
            contentBase64: storedPdf.contentBase64,
            contentType: storedPdf.contentType || "application/pdf",
          }
        : undefined,
      selectedCategories: Array.isArray(selectedCategories) ? selectedCategories : [],
      recipients: results,
      sentCount: sentCount + queuedCount,
      failedCount,
      loggedCount,
      totalRecipients: results.filter((r) => r.status === "sent" || r.status === "logged" || r.status === "failed").length,
      errorMessage: failedCount ? `${failedCount} alıcıya gönderilemedi.` : "",
      targetPosition: targetPosition || "",
      replyTo: replyTo || "",
      verification: verificationMeta,
      reanalyzeContext: resolvedReanalyzeContext,
      sentAt: new Date(),
    });
    logId = String(log._id);

    const queuedIds = results.map((r) => r.queueId).filter(Boolean);
    if (queuedIds.length) {
      await attachOutreachLogToQueuedEmails(queuedIds, log._id);
    }

    // Tracking kayıtlarını logId ile bağla (yalnızca anında gönderilenler)
    if (mailIds.length) {
      await MailTracking.updateMany(
        { mailId: { $in: mailIds } },
        {
          $set: {
            outreachLogId: log._id,
            ...(linkedinStandard
              ? {
                  linkedinMessageText: linkedinStandard,
                  linkedinInfoContactMessageText: linkedinInfoContact,
                }
              : {}),
          },
        }
      ).catch(() => null);
    }
  }

  return {
    total: list.length,
    sentCount,
    loggedCount,
    failedCount,
    status,
    results,
    mailIds: persistHistory ? mailIds : [],
    replyTo: replyTo || null,
    domain: resolvedDomain,
    logId,
    persisted: persistHistory,
    attachmentIncluded: Boolean(attachment),
    limits,
    verification: verificationMeta,
    selectedRecipient: verificationMeta.selectedEmail || list[0] || null,
    selectedRecipients: Array.isArray(verificationMeta.selectedEmails)
      ? verificationMeta.selectedEmails
      : list,
  };
}


async function createAiErrorLog({
  clientId,
  userId,
  companyName,
  domain,
  errorMessage,
  cvId,
  cvTitle,
  cvFileName,
  targetPosition,
  projectId,
}) {
  if (!(await isPersistOutreachHistoryEnabled(userId))) {
    return { logId: null, domain: normalizeDomain(domain) || "unknown", skipped: true };
  }

  const resolvedDomain = normalizeDomain(domain);
  if (!resolvedDomain && !companyName) {
    throw new AppError("Domain veya şirket adı gerekli.", 400, "DOMAIN_REQUIRED");
  }

  let resolvedProjectId = null;
  if (projectId) {
    const { getProjectOrThrow } = require("./outreach-project.service");
    const project = await getProjectOrThrow(clientId, projectId);
    resolvedProjectId = project._id;
  }

  const log = await OutreachLog.create({
    clientId,
    userId,
    projectId: resolvedProjectId,
    companyName: String(companyName || "").trim() || resolvedDomain || "Bilinmeyen",
    domain: resolvedDomain || "unknown",
    status: "ai_error",
    subject: "",
    bodyText: "",
    templateType: "none",
    cvId: cvId || null,
    cvTitle: cvTitle || "",
    cvFileName: cvFileName || "",
    selectedCategories: [],
    recipients: [],
    sentCount: 0,
    failedCount: 0,
    loggedCount: 0,
    totalRecipients: 0,
    errorMessage: String(errorMessage || "AI işlemi başarısız oldu."),
    targetPosition: targetPosition || "",
    replyTo: "",
    sentAt: new Date(),
  });

  return { logId: String(log._id), domain: log.domain };
}

/**
 * Proje seçiliyken yalnızca şirket analizi yapıldığında kaydedilir (mail yok).
 */
async function createAnalysisOnlyLog({
  clientId,
  userId,
  companyName,
  domain,
  cvId,
  cvTitle,
  cvFileName,
  targetPosition,
  projectId,
  matchScore,
  subject,
  bodyText,
  companyUrl,
  reanalyzeContext,
}) {
  if (!(await isPersistOutreachHistoryEnabled(userId))) {
    return { logId: null, domain: normalizeDomain(domain) || "unknown", skipped: true };
  }

  if (!projectId) {
    throw new AppError("Proje seçili değil — analiz kaydı oluşturulmaz.", 400, "PROJECT_REQUIRED");
  }

  const { getProjectOrThrow } = require("./outreach-project.service");
  const project = await getProjectOrThrow(clientId, projectId);
  const resolvedDomain = normalizeDomain(domain) || "unknown";
  const resolvedReanalyzeContext = normalizeReanalyzeContext(
    {
      ...(reanalyzeContext && typeof reanalyzeContext === "object"
        ? reanalyzeContext
        : {}),
      companyUrl,
      domain: resolvedDomain,
      companyName,
      targetPosition,
      projectId,
    },
    {}
  );

  const log = await OutreachLog.create({
    clientId,
    userId,
    projectId: project._id,
    companyName: String(companyName || "").trim() || resolvedDomain,
    domain: resolvedDomain,
    status: "analysis_only",
    subject: String(subject || "").trim(),
    bodyText: String(bodyText || "").trim(),
    templateType: "none",
    cvId: cvId || null,
    cvTitle: cvTitle || "",
    cvFileName: cvFileName || "",
    selectedCategories: Array.isArray(reanalyzeContext?.selectedCategories)
      ? reanalyzeContext.selectedCategories
      : [],
    recipients: [],
    sentCount: 0,
    failedCount: 0,
    loggedCount: 0,
    totalRecipients: 0,
    errorMessage: "",
    targetPosition: targetPosition || "",
    replyTo: "",
    reanalyzeContext: resolvedReanalyzeContext,
    verification: {
      enabled: false,
      mxOk: false,
      provider: "",
      selectedEmail: "",
      selectedEmails: [],
      checks: [],
      warning: matchScore != null ? `Match score: ${matchScore}%` : "",
    },
    sentAt: new Date(),
  });

  return { logId: String(log._id), domain: log.domain, projectId: String(project._id) };
}

async function checkDomainHistory(clientId, domain) {
  const resolved = normalizeDomain(domain);
  if (!resolved) {
    throw new AppError("Geçerli domain gerekli.", 400, "DOMAIN_REQUIRED");
  }

  const logs = await OutreachLog.find({ clientId, domain: resolved })
    .sort({ sentAt: -1 })
    .limit(40)
    .lean();

  const limits = getOutreachLimits();
  const mapped = logs.map(mapLog);

  const extractActuallySentEmails = (log) => {
    return (log.recipients || [])
      .filter((r) => r && (r.status === "sent" || r.status === "logged"))
      .map((r) => String(r.email || "").trim().toLowerCase())
      .filter(Boolean);
  };

  /** Gerçek SMTP/log gönderimi — analiz / iptal / doğrulama fail sayılmaz */
  const isActualMailSend = (log) => {
    if (!log) return false;
    if (log.status !== "success" && log.status !== "partial") return false;
    if (Number(log.sentCount || 0) > 0 || Number(log.loggedCount || 0) > 0) return true;
    return extractActuallySentEmails(log).length > 0;
  };

  const mailLogs = mapped.filter(isActualMailSend);
  const analysisOnlyLogs = mapped.filter((l) => l.status === "analysis_only");
  const otherAttemptLogs = mapped.filter(
    (l) =>
      !isActualMailSend(l) &&
      l.status !== "analysis_only" &&
      (l.status === "verify_failed" || l.status === "failed" || l.status === "ai_error")
  );

  const successful = mailLogs[0] || null;

  const allSentEmails = [
    ...new Set(mailLogs.flatMap((l) => extractActuallySentEmails(l))),
  ];

  const lastOutreach = successful
    ? {
        id: successful.id,
        sentAt: successful.sentAt,
        status: successful.status,
        companyName: successful.companyName,
        subject: successful.subject,
        sentEmails: extractActuallySentEmails(successful),
        verification: successful.verification,
        recipients: successful.recipients || [],
      }
    : null;

  const lastAnalysis = analysisOnlyLogs[0]
    ? {
        id: analysisOnlyLogs[0].id,
        sentAt: analysisOnlyLogs[0].sentAt,
        companyName: analysisOnlyLogs[0].companyName,
        status: analysisOnlyLogs[0].status,
      }
    : null;

  return {
    domain: resolved,
    /** Yalnızca gerçek mail gönderimi varsa true */
    previouslyContacted: mailLogs.length > 0,
    blockedResend: Boolean(limits.blockDomainResend && mailLogs.length > 0),
    /** Gerçek mail gönderim sayısı */
    count: mailLogs.length,
    mailSendCount: mailLogs.length,
    analysisOnlyCount: analysisOnlyLogs.length,
    otherAttemptCount: otherAttemptLogs.length,
    hasAnalysisOnly: analysisOnlyLogs.length > 0,
    lastSentAt: successful?.sentAt || null,
    lastStatus: successful?.status || null,
    lastCompanyName: successful?.companyName || mapped[0]?.companyName || null,
    lastAnalysisAt: lastAnalysis?.sentAt || null,
    lastAnalysis,
    lastOutreach,
    allSentEmails,
    items: mapped,
    limits,
  };
}

async function getOutreachQuota(clientId) {
  const limits = getOutreachLimits();
  const usedToday = await countTodayRecipientSends(clientId);
  return {
    ...limits,
    usedToday,
    remainingToday: Math.max(0, limits.dailyEmailLimit - usedToday),
  };
}

async function listOutreachLogs(clientId, { domain, status, limit = 100 } = {}) {
  const filter = { clientId };
  if (domain) filter.domain = normalizeDomain(domain);
  if (status) filter.status = status;

  const items = await OutreachLog.find(filter)
    .sort({ sentAt: -1 })
    .limit(Math.min(Number(limit) || 100, 300))
    .lean();

  return items.map(mapLog);
}

async function listOutreachByCompany(clientId) {
  const items = await OutreachLog.find({ clientId }).sort({ sentAt: -1 }).lean();

  const map = new Map();
  for (const raw of items) {
    const log = mapLog(raw);
    const key = log.domain || log.companyName || "unknown";
    if (!map.has(key)) {
      map.set(key, {
        domain: log.domain,
        companyName: log.companyName,
        totalAttempts: 0,
        successCount: 0,
        partialCount: 0,
        failedCount: 0,
        aiErrorCount: 0,
        lastSentAt: log.sentAt,
        lastStatus: log.status,
        logs: [],
      });
    }
    const group = map.get(key);
    group.totalAttempts += 1;
    if (log.status === "success") group.successCount += 1;
    if (log.status === "partial") group.partialCount += 1;
    if (log.status === "failed") group.failedCount += 1;
    if (log.status === "verify_failed") group.failedCount += 1;
    if (log.status === "ai_error") group.aiErrorCount += 1;
    if (!group.lastSentAt || new Date(log.sentAt) > new Date(group.lastSentAt)) {
      group.lastSentAt = log.sentAt;
      group.lastStatus = log.status;
      group.companyName = log.companyName || group.companyName;
    }
    group.logs.push(log);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime()
  );
}

async function getOutreachLogById(clientId, id) {
  const log = await OutreachLog.findOne({ _id: id, clientId }).lean();
  if (!log) {
    throw new AppError("Log bulunamadı.", 404, "LOG_NOT_FOUND");
  }
  return mapLog(log);
}

function mapLog(doc) {
  const domain = doc.domain || "";
  const companyName =
    resolveCompanyDisplayName({
      name: doc.companyName,
      domain,
      website: doc.reanalyzeContext?.companyUrl,
    }) ||
    doc.companyName ||
    "";
  return {
    id: String(doc._id),
    clientId: doc.clientId,
    projectId: doc.projectId ? String(doc.projectId) : null,
    companyName,
    domain,
    status: doc.status,
    subject: doc.subject || "",
    bodyText: doc.bodyText || "",
    templateType: doc.templateType || "cover_letter",
    cvId: doc.cvId || null,
    cvTitle: doc.cvTitle || "",
    cvFileName: doc.cvFileName || "",
    selectedCategories: doc.selectedCategories || [],
    recipients: doc.recipients || [],
    sentCount: doc.sentCount || 0,
    failedCount: doc.failedCount || 0,
    loggedCount: doc.loggedCount || 0,
    totalRecipients: doc.totalRecipients || 0,
    errorMessage: doc.errorMessage || "",
    targetPosition: doc.targetPosition || "",
    replyTo: doc.replyTo || "",
    verification: doc.verification || null,
    sentAt: doc.sentAt || doc.createdAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = {
  sendCompanyOutreachEmails,
  createAiErrorLog,
  createAnalysisOnlyLog,
  checkDomainHistory,
  getOutreachQuota,
  listOutreachLogs,
  listOutreachByCompany,
  getOutreachLogById,
  normalizeDomain,
  getOutreachLimits,
};
