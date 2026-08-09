const ClientUiPreferences = require("../models/client-ui-preferences.model");

const LANG = new Set(["turkish", "english"]);
const EMAIL_LANG = new Set(["auto", "turkish", "english"]);
const SOURCE = new Set(["company", "text"]);
const FILTER = new Set(["all", "sent", "unsent"]);
const CV_ATTACH = new Set(["optimized", "original"]);
const PAGE_TYPES = new Set([
  "homepage",
  "careers",
  "contact",
  "about",
  "blog",
  "products",
  "team",
  "other",
]);

function mapDoc(doc) {
  if (!doc) {
    return {
      targetPosition: "",
      cvLanguage: "turkish",
      outreachEmailLanguageMode: "auto",
      aiSettings: { about: true, workExperience: true, skills: true },
      selectedEmailPrefixCategories: ["turkey-hiring"],
      customEmailLocalPartsText: "",
      includePrimaryEmailInSend: true,
      skipPrimaryEmailVerification: false,
      forceResend: false,
      bulkSendHistoryFilter: "all",
      shouldGenerateCoverLetter: true,
      coverLetterSource: "company",
      shouldGenerateLinkedInMessage: false,
      linkedinMessageSource: "company",
      cvAdaptationSource: "company",
      includeCvPhoto: false,
      shouldSendCompanyEmail: false,
      outreachCvAttachmentSource: "optimized",
      manualMustMentionTopicsText: "",
      manualMustNotMentionTopicsText: "",
      coverLetterRecipientName: "",
      coverLetterCompanyName: "",
      lastCompanyPageType: "homepage",
      lastCompanyPageTypeOther: "",
      updatedAt: null,
    };
  }

  const ai = doc.aiSettings || {};
  return {
    targetPosition: String(doc.targetPosition || ""),
    cvLanguage: LANG.has(doc.cvLanguage) ? doc.cvLanguage : "turkish",
    outreachEmailLanguageMode: EMAIL_LANG.has(doc.outreachEmailLanguageMode)
      ? doc.outreachEmailLanguageMode
      : "auto",
    aiSettings: {
      about: ai.about !== false,
      workExperience: ai.workExperience !== false,
      skills: ai.skills !== false,
    },
    selectedEmailPrefixCategories: Array.isArray(doc.selectedEmailPrefixCategories)
      ? doc.selectedEmailPrefixCategories.map(String).filter(Boolean)
      : ["turkey-hiring"],
    customEmailLocalPartsText: String(doc.customEmailLocalPartsText || ""),
    includePrimaryEmailInSend: doc.includePrimaryEmailInSend !== false,
    skipPrimaryEmailVerification: Boolean(doc.skipPrimaryEmailVerification),
    forceResend: Boolean(doc.forceResend),
    bulkSendHistoryFilter: FILTER.has(doc.bulkSendHistoryFilter)
      ? doc.bulkSendHistoryFilter
      : "all",
    shouldGenerateCoverLetter: doc.shouldGenerateCoverLetter !== false,
    coverLetterSource: SOURCE.has(doc.coverLetterSource)
      ? doc.coverLetterSource
      : "company",
    shouldGenerateLinkedInMessage: Boolean(doc.shouldGenerateLinkedInMessage),
    linkedinMessageSource: SOURCE.has(doc.linkedinMessageSource)
      ? doc.linkedinMessageSource
      : "company",
    cvAdaptationSource: SOURCE.has(doc.cvAdaptationSource)
      ? doc.cvAdaptationSource
      : "company",
    includeCvPhoto: Boolean(doc.includeCvPhoto),
    shouldSendCompanyEmail: Boolean(doc.shouldSendCompanyEmail),
    outreachCvAttachmentSource: CV_ATTACH.has(doc.outreachCvAttachmentSource)
      ? doc.outreachCvAttachmentSource
      : "optimized",
    manualMustMentionTopicsText: String(doc.manualMustMentionTopicsText || ""),
    manualMustNotMentionTopicsText: String(doc.manualMustNotMentionTopicsText || ""),
    coverLetterRecipientName: String(doc.coverLetterRecipientName || ""),
    coverLetterCompanyName: String(doc.coverLetterCompanyName || ""),
    lastCompanyPageType: PAGE_TYPES.has(doc.lastCompanyPageType)
      ? doc.lastCompanyPageType
      : "homepage",
    lastCompanyPageTypeOther: String(doc.lastCompanyPageTypeOther || ""),
    updatedAt: doc.updatedAt || null,
  };
}

async function getClientUiPreferences(clientId) {
  const doc = await ClientUiPreferences.findOne({ clientId }).lean();
  return mapDoc(doc);
}

async function updateClientUiPreferences(clientId, userId, patch = {}) {
  const updates = {};

  if (patch.targetPosition !== undefined) {
    updates.targetPosition = String(patch.targetPosition || "").trim();
  }
  if (patch.cvLanguage !== undefined && LANG.has(String(patch.cvLanguage))) {
    updates.cvLanguage = String(patch.cvLanguage);
  }
  if (
    patch.outreachEmailLanguageMode !== undefined &&
    EMAIL_LANG.has(String(patch.outreachEmailLanguageMode))
  ) {
    updates.outreachEmailLanguageMode = String(patch.outreachEmailLanguageMode);
  }
  if (patch.aiSettings && typeof patch.aiSettings === "object") {
    updates.aiSettings = {
      about: patch.aiSettings.about !== false,
      workExperience: patch.aiSettings.workExperience !== false,
      skills: patch.aiSettings.skills !== false,
    };
  }
  if (patch.selectedEmailPrefixCategories !== undefined) {
    updates.selectedEmailPrefixCategories = Array.isArray(
      patch.selectedEmailPrefixCategories
    )
      ? patch.selectedEmailPrefixCategories.map(String).filter(Boolean)
      : [];
  }
  if (patch.customEmailLocalPartsText !== undefined) {
    updates.customEmailLocalPartsText = String(
      patch.customEmailLocalPartsText || ""
    );
  }
  if (patch.includePrimaryEmailInSend !== undefined) {
    updates.includePrimaryEmailInSend = Boolean(patch.includePrimaryEmailInSend);
  }
  if (patch.skipPrimaryEmailVerification !== undefined) {
    updates.skipPrimaryEmailVerification = Boolean(
      patch.skipPrimaryEmailVerification
    );
  }
  if (patch.forceResend !== undefined) {
    updates.forceResend = Boolean(patch.forceResend);
  }
  if (
    patch.bulkSendHistoryFilter !== undefined &&
    FILTER.has(String(patch.bulkSendHistoryFilter))
  ) {
    updates.bulkSendHistoryFilter = String(patch.bulkSendHistoryFilter);
  }
  if (patch.shouldGenerateCoverLetter !== undefined) {
    updates.shouldGenerateCoverLetter = Boolean(patch.shouldGenerateCoverLetter);
  }
  if (
    patch.coverLetterSource !== undefined &&
    SOURCE.has(String(patch.coverLetterSource))
  ) {
    updates.coverLetterSource = String(patch.coverLetterSource);
  }
  if (patch.shouldGenerateLinkedInMessage !== undefined) {
    updates.shouldGenerateLinkedInMessage = Boolean(
      patch.shouldGenerateLinkedInMessage
    );
  }
  if (
    patch.linkedinMessageSource !== undefined &&
    SOURCE.has(String(patch.linkedinMessageSource))
  ) {
    updates.linkedinMessageSource = String(patch.linkedinMessageSource);
  }
  if (
    patch.cvAdaptationSource !== undefined &&
    SOURCE.has(String(patch.cvAdaptationSource))
  ) {
    updates.cvAdaptationSource = String(patch.cvAdaptationSource);
  }
  if (patch.includeCvPhoto !== undefined) {
    updates.includeCvPhoto = Boolean(patch.includeCvPhoto);
  }
  if (patch.shouldSendCompanyEmail !== undefined) {
    updates.shouldSendCompanyEmail = Boolean(patch.shouldSendCompanyEmail);
  }
  if (
    patch.outreachCvAttachmentSource !== undefined &&
    CV_ATTACH.has(String(patch.outreachCvAttachmentSource))
  ) {
    updates.outreachCvAttachmentSource = String(patch.outreachCvAttachmentSource);
  }
  if (patch.manualMustMentionTopicsText !== undefined) {
    updates.manualMustMentionTopicsText = String(
      patch.manualMustMentionTopicsText || ""
    );
  }
  if (patch.manualMustNotMentionTopicsText !== undefined) {
    updates.manualMustNotMentionTopicsText = String(
      patch.manualMustNotMentionTopicsText || ""
    );
  }
  if (patch.coverLetterRecipientName !== undefined) {
    updates.coverLetterRecipientName = String(
      patch.coverLetterRecipientName || ""
    ).trim();
  }
  if (patch.coverLetterCompanyName !== undefined) {
    updates.coverLetterCompanyName = String(
      patch.coverLetterCompanyName || ""
    ).trim();
  }
  if (
    patch.lastCompanyPageType !== undefined &&
    PAGE_TYPES.has(String(patch.lastCompanyPageType))
  ) {
    updates.lastCompanyPageType = String(patch.lastCompanyPageType);
  }
  if (patch.lastCompanyPageTypeOther !== undefined) {
    updates.lastCompanyPageTypeOther = String(
      patch.lastCompanyPageTypeOther || ""
    ).trim();
  }

  if (!Object.keys(updates).length) {
    return getClientUiPreferences(clientId);
  }

  const doc = await ClientUiPreferences.findOneAndUpdate(
    { clientId },
    {
      $set: {
        ...updates,
        clientId,
        userId,
      },
      $setOnInsert: { clientId, userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return mapDoc(doc);
}

module.exports = {
  getClientUiPreferences,
  updateClientUiPreferences,
};
