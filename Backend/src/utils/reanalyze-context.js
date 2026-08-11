/**
 * Company Based “Yeniden analiz et” için gönderim anı snapshot.
 */

const {
  pickBestCompanyUrl,
  resolveCompanyDisplayName,
} = require("./company-display-name");

function cleanString(value) {
  return String(value || "").trim();
}

/** Path (/about, /careers …) korunur; boşsa domain köküne düşer. */
function ensureCompanyUrl(companyUrl, domain) {
  const raw = cleanString(companyUrl);
  const d = cleanString(domain).toLowerCase().replace(/^@+/, "");
  const domainUrl = d && !d.includes("@") ? `https://${d}` : "";
  if (raw && raw.includes("@") && !/^https?:\/\//i.test(raw)) {
    return domainUrl;
  }
  return pickBestCompanyUrl(raw, domainUrl);
}

function normalizeReanalyzeContext(input = {}, fallbacks = {}) {
  const domain = cleanString(input.domain || fallbacks.domain).toLowerCase();
  const companyUrl = ensureCompanyUrl(
    input.companyUrl || fallbacks.companyUrl,
    domain
  );
  const rawDomainInput = cleanString(
    input.rawDomainInput || fallbacks.rawDomainInput || domain
  );
  const selectedCategories = Array.isArray(input.selectedCategories)
    ? input.selectedCategories.map((c) => String(c || "").trim()).filter(Boolean)
    : Array.isArray(fallbacks.selectedCategories)
      ? fallbacks.selectedCategories
      : [];

  const customParts = Array.isArray(input.customEmailLocalParts)
    ? input.customEmailLocalParts
    : typeof input.customEmailLocalPartsText === "string"
      ? String(input.customEmailLocalPartsText)
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(fallbacks.customEmailLocalParts)
        ? fallbacks.customEmailLocalParts
        : [];

  const ai = input.aiSettings || fallbacks.aiSettings || null;

  const rawCompanyName = cleanString(
    input.companyName || fallbacks.companyName
  );

  return {
    companyUrl,
    rawDomainInput,
    domain,
    companyName:
      resolveCompanyDisplayName({
        name: rawCompanyName,
        website: companyUrl,
        domain,
      }) || rawCompanyName,
    targetPosition: cleanString(
      input.targetPosition || fallbacks.targetPosition
    ),
    projectId: input.projectId
      ? String(input.projectId)
      : fallbacks.projectId
        ? String(fallbacks.projectId)
        : "",
    selectedCategories,
    pageType: cleanString(input.pageType || fallbacks.pageType || "homepage") || "homepage",
    pageTypeOther: cleanString(input.pageTypeOther || fallbacks.pageTypeOther),
    cvLanguage:
      input.cvLanguage === "english" || fallbacks.cvLanguage === "english"
        ? "english"
        : input.cvLanguage || fallbacks.cvLanguage
          ? "turkish"
          : "",
    outreachEmailLanguageMode: ["auto", "turkish", "english"].includes(
      String(input.outreachEmailLanguageMode || fallbacks.outreachEmailLanguageMode || "")
    )
      ? String(input.outreachEmailLanguageMode || fallbacks.outreachEmailLanguageMode)
      : "auto",
    customEmailLocalParts: customParts,
    includePrimaryEmailInSend:
      input.includePrimaryEmailInSend !== undefined
        ? Boolean(input.includePrimaryEmailInSend)
        : fallbacks.includePrimaryEmailInSend !== undefined
          ? Boolean(fallbacks.includePrimaryEmailInSend)
          : true,
    shouldSendCompanyEmail:
      input.shouldSendCompanyEmail !== undefined
        ? Boolean(input.shouldSendCompanyEmail)
        : fallbacks.shouldSendCompanyEmail !== undefined
          ? Boolean(fallbacks.shouldSendCompanyEmail)
          : true,
    skipPrimaryEmailVerification:
      input.skipPrimaryEmailVerification !== undefined
        ? Boolean(input.skipPrimaryEmailVerification)
        : Boolean(fallbacks.skipPrimaryEmailVerification),
    shouldGenerateCoverLetter:
      input.shouldGenerateCoverLetter !== undefined
        ? Boolean(input.shouldGenerateCoverLetter)
        : fallbacks.shouldGenerateCoverLetter !== false,
    shouldGenerateLinkedInMessage:
      input.shouldGenerateLinkedInMessage !== undefined
        ? Boolean(input.shouldGenerateLinkedInMessage)
        : Boolean(fallbacks.shouldGenerateLinkedInMessage),
    coverLetterSource:
      (input.coverLetterSource || fallbacks.coverLetterSource) === "text"
        ? "text"
        : "company",
    linkedinMessageSource:
      (input.linkedinMessageSource || fallbacks.linkedinMessageSource) === "text"
        ? "text"
        : "company",
    cvAdaptationSource:
      (input.cvAdaptationSource || fallbacks.cvAdaptationSource) === "text"
        ? "text"
        : "company",
    outreachCvAttachmentSource:
      (input.outreachCvAttachmentSource ||
        fallbacks.outreachCvAttachmentSource) === "original"
        ? "original"
        : "optimized",
    includeCvPhoto:
      input.includeCvPhoto !== undefined
        ? Boolean(input.includeCvPhoto)
        : Boolean(fallbacks.includeCvPhoto),
    aiSettings: ai
      ? {
          about: ai.about !== false,
          workExperience: Boolean(ai.workExperience),
          skills: Boolean(ai.skills),
        }
      : null,
    linkedinMessageSnapshot: cleanString(
      input.linkedinMessageSnapshot || fallbacks.linkedinMessageSnapshot
    ),
  };
}

/**
 * Snapshot varsa rawDomainInput’a birebir güven.
 * Recipient fallback yalnızca reanalyzeContext hiç yokken (eski kayıtlar).
 */
function buildReanalyzePayloadFromLog(log, options = {}) {
  if (!log) return null;
  const hasSnapshot =
    log.reanalyzeContext != null && typeof log.reanalyzeContext === "object";
  const ctx = hasSnapshot ? log.reanalyzeContext : {};
  const domain = cleanString(log.domain).toLowerCase();

  let rawDomainInput = "";
  if (hasSnapshot) {
    // Kullanıcı domain-only girdiyse onu koru; alıcıyla ezme
    rawDomainInput = cleanString(ctx.rawDomainInput) || domain;
  } else {
    const recipientCandidates = [
      options.recipientFallback,
      ...((log.recipients || []).map((r) => r?.email)),
    ]
      .map((e) => cleanString(e).toLowerCase())
      .filter((e) => e.includes("@"));
    const matchingRecipient = recipientCandidates.find(
      (email) => !domain || email.endsWith(`@${domain}`)
    );
    rawDomainInput = matchingRecipient || recipientCandidates[0] || domain;
  }

  return normalizeReanalyzeContext(ctx, {
    domain,
    companyName: log.companyName,
    targetPosition: log.targetPosition,
    projectId: log.projectId,
    selectedCategories: log.selectedCategories,
    companyUrl: ctx.companyUrl,
    rawDomainInput,
  });
}

module.exports = {
  ensureCompanyUrl,
  normalizeReanalyzeContext,
  buildReanalyzePayloadFromLog,
};
