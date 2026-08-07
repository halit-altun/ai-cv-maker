const {
  runFullOptimizationBundle,
} = require("../services/company-based/fullOptimizationBundle.service");
const { isAppError } = require("../utils/app-error");

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

/**
 * POST /api/company-based/optimize-bundle
 * Company-based FE ve (gerekirse) harici istemciler için ortak AI pipeline.
 */
async function optimizeBundleHandler(req, res, next) {
  try {
    const body = req.body || {};
    const cvText = String(body.cvText || "").trim();
    if (!cvText) {
      return res.status(400).json({
        ok: false,
        message: "cvText zorunlu.",
        code: "CV_TEXT_REQUIRED",
      });
    }

    const provider =
      req.user?.preferredAiProvider ||
      body.provider ||
      "gemini-free";

    const result = await runFullOptimizationBundle(
      {
        cvText,
        cvLanguage: body.cvLanguage === "english" ? "english" : "turkish",
        adaptationSource:
          body.adaptationSource === "text" ? "text" : "company",
        companyInfo: body.companyInfo || undefined,
        companyPages: Array.isArray(body.companyPages)
          ? body.companyPages
          : undefined,
        jobDescriptionText: body.jobDescriptionText,
        targetPosition: body.targetPosition,
        keywordTargetSections: body.keywordTargetSections || {
          about: true,
          workExperience: true,
          skills: true,
        },
        manualMustMentionTopics: body.manualMustMentionTopics,
        manualMustNotMentionTopics: body.manualMustNotMentionTopics,
        generateCoverLetter: Boolean(body.generateCoverLetter),
        generateLinkedInMessage: Boolean(body.generateLinkedInMessage),
        generateColdEmail: Boolean(body.generateColdEmail),
        coldEmailLanguage:
          body.coldEmailLanguage === "english" ? "english" : "turkish",
        recipientName: body.recipientName,
        recipientCompanyName: body.recipientCompanyName,
        outreachLinkedinUrl: body.outreachLinkedinUrl,
        outreachPortfolioUrl: body.outreachPortfolioUrl,
        outreachWebsiteUrl: body.outreachWebsiteUrl,
        outreachPhone: body.outreachPhone,
      },
      { provider }
    );

    return res.json({
      ok: true,
      parsedCV: result.parsedCV,
      analysis: result.analysis,
      coverLetter: result.coverLetter,
      linkedinMessage: result.linkedinMessage,
      coldEmail: result.coldEmail,
      companyInfo: result.companyInfo,
      adaptedCvData: result.adaptedCvData,
      adaptationNotes: result.adaptationNotes,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    console.error("[company-based/optimize-bundle]", error);
    return res.status(500).json({
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Optimizasyon bundle başarısız.",
      code: "OPTIMIZE_BUNDLE_FAILED",
    });
  }
}

module.exports = {
  optimizeBundleHandler,
};
