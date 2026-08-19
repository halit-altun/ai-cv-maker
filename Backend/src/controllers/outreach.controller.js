const {
  sendCompanyOutreachEmails,
  createAiErrorLog,
  createAnalysisOnlyLog,
  checkDomainHistory,
  getOutreachQuota,
  listOutreachLogs,
  listOutreachByCompany,
  getOutreachLogById,
} = require("../services/outreach.service");
const { pickValidRecipient } = require("../services/email-verifier.service");
const { getEmailVerifyQuotaStatus } = require("../services/emailverify-quota.service");
const { computeSpamRiskScore } = require("../services/spam-risk-score.service");
const { isAppError, AppError } = require("../utils/app-error");

/**
 * Gönderici adı = giriş yapan kullanıcının profilindeki ad + soyad.
 * CV AI Maker / SMTP_FROM_NAME fallback yasak.
 */
function resolveOutreachSenderName(user) {
  const first = String(user?.firstName || "").trim();
  const last = String(user?.lastName || "").trim();
  if (!first || !last) return null;
  return `${first} ${last}`;
}

function sendError(res, error) {
  if (isAppError(error)) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message,
      code: error.code,
      details: error.details ?? undefined,
    });
  }
  return null;
}

async function sendCompanyEmailHandler(req, res, next) {
  try {
    const {
      recipients,
      subject,
      bodyText,
      replyTo,
      companyName,
      domain,
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
      linkedinMessageText,
      companyUrl,
      reanalyzeContext,
      analysisSnapshot,
    } = req.body || {};

    const senderName = resolveOutreachSenderName(req.user);
    if (!senderName) {
      throw new AppError(
        "Mail gönderimi için profilinizde ad ve soyad zorunludur. Profilim sayfasından kaydedin.",
        400,
        "SENDER_NAME_REQUIRED"
      );
    }

    const {
      resolveTrackingBaseFromRequest,
      getTrackingPublicBaseUrl,
    } = require("../services/mail-tracking.service");
    const trackingPublicBaseUrl =
      resolveTrackingBaseFromRequest(req) || getTrackingPublicBaseUrl();

    const result = await sendCompanyOutreachEmails({
      recipients,
      subject,
      bodyText,
      replyTo: replyTo || req.user?.email,
      senderName,
      companyName,
      domain,
      clientId: req.clientId,
      userId: req.user?.id,
      cvId,
      cvTitle,
      cvFileName,
      selectedCategories,
      templateType,
      targetPosition,
      forceResend: Boolean(forceResend),
      pdfAttachment,
      skipVerification: Boolean(skipVerification),
      rawDomainInput,
      trustedEmail,
      projectId: projectId || null,
      trackingPublicBaseUrl,
      linkedinMessageText,
      companyUrl,
      reanalyzeContext,
      analysisSnapshot,
    });

    const selectedList = Array.isArray(result.selectedRecipients)
      ? result.selectedRecipients.filter(Boolean)
      : result.selectedRecipient
        ? [result.selectedRecipient]
        : [];
    const selected = selectedList.length
      ? ` Doğrulanmış alıcılar: ${selectedList.join(", ")}.`
      : "";

    return res.json({
      ok: true,
      message:
        result.sentCount > 0
          ? `${result.sentCount} mail gönderildi${result.attachmentIncluded ? " (CV ekli)" : ""}.${selected}`
          : result.loggedCount > 0
            ? `SMTP yok — mail loglandı; kayıt oluşturuldu.${selected}`
            : `İşlem tamamlandı; log kaydedildi.${selected}`,
      ...result,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function verifyEmailsHandler(req, res, next) {
  try {
    const recipients = req.body?.recipients;
    const domain = req.body?.domain;
    const result = await pickValidRecipient(recipients, {
      domain,
      rawDomainInput: req.body?.rawDomainInput || domain,
      trustedEmail: req.body?.trustedEmail,
    });
    return res.json({
      ok: result.ok,
      message: result.message,
      reason: result.reason || null,
      validEmail: result.validEmail,
      validEmails: result.validEmails || (result.validEmail ? [result.validEmail] : []),
      domain: result.domain || domain || null,
      provider: result.provider || null,
      warning: result.warning || null,
      mx: result.mx
        ? {
            ok: result.mx.ok,
            domain: result.mx.domain,
            records: (result.mx.mx || []).slice(0, 5),
          }
        : null,
      checks: result.checks || [],
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function checkDomainHandler(req, res, next) {
  try {
    const domain = req.query.domain || req.body?.domain;
    const result = await checkDomainHistory(req.clientId, domain);
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function quotaHandler(req, res, next) {
  try {
    const quota = await getOutreachQuota(req.clientId);
    return res.json({ ok: true, quota });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function listLogsHandler(req, res, next) {
  try {
    const items = await listOutreachLogs(req.clientId, {
      domain: req.query.domain,
      status: req.query.status,
      limit: req.query.limit,
    });
    return res.json({ ok: true, items });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function listCompaniesHandler(req, res, next) {
  try {
    const companies = await listOutreachByCompany(req.clientId);
    return res.json({ ok: true, companies });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function getLogHandler(req, res, next) {
  try {
    const item = await getOutreachLogById(req.clientId, req.params.id);
    return res.json({ ok: true, item });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function createAiErrorLogHandler(req, res, next) {
  try {
    const result = await createAiErrorLog({
      clientId: req.clientId,
      userId: req.user?.id,
      companyName: req.body?.companyName,
      domain: req.body?.domain,
      errorMessage: req.body?.errorMessage,
      cvId: req.body?.cvId,
      cvTitle: req.body?.cvTitle,
      cvFileName: req.body?.cvFileName,
      targetPosition: req.body?.targetPosition,
      projectId: req.body?.projectId || null,
    });
    return res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function createAnalysisOnlyLogHandler(req, res, next) {
  try {
    const result = await createAnalysisOnlyLog({
      clientId: req.clientId,
      userId: req.user?.id,
      companyName: req.body?.companyName,
      domain: req.body?.domain,
      cvId: req.body?.cvId,
      cvTitle: req.body?.cvTitle,
      cvFileName: req.body?.cvFileName,
      targetPosition: req.body?.targetPosition,
      projectId: req.body?.projectId,
      matchScore: req.body?.matchScore,
      subject: req.body?.subject,
      bodyText: req.body?.bodyText,
      companyUrl: req.body?.companyUrl,
      reanalyzeContext: req.body?.reanalyzeContext,
    });
    return res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function emailVerifyQuotaHandler(req, res, next) {
  try {
    const quota = await getEmailVerifyQuotaStatus();
    return res.json({ ok: true, quota });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function checkDeliverabilityHandler(req, res, next) {
  try {
    const { forceRefresh, subject, bodyText, hasAttachment } = req.body || {};
    const userId = req.user?.id || req.user?._id;
    const clientId = req.clientId || req.user?.clientId;

    if (!userId || !clientId) {
      throw new AppError("Kimlik doğrulama gerekli", 401, "UNAUTHORIZED");
    }

    const result = await computeSpamRiskScore({
      userId,
      clientId,
      forceRefreshDns: Boolean(forceRefresh),
      subject: subject || undefined,
      bodyText: bodyText || undefined,
      hasAttachment: Boolean(hasAttachment),
    });
    return res.json(result);
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

module.exports = {
  sendCompanyEmailHandler,
  checkDomainHandler,
  quotaHandler,
  listLogsHandler,
  listCompaniesHandler,
  getLogHandler,
  createAiErrorLogHandler,
  createAnalysisOnlyLogHandler,
  verifyEmailsHandler,
  emailVerifyQuotaHandler,
  checkDeliverabilityHandler,
};
