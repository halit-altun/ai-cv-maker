const { generateAIContent } = require("../ai-provider.service");
const { COMPANY_BASED_GEMINI_MODEL } = require("../gemini.service");
const { waitAndProceed } = require("../gemini-rate-limiter");
const { buildFullOptimizationBundlePrompt } = require("./fullOptimizationBundle.prompt");
const { resolveCompanyDisplayName } = require("../../utils/company-display-name");
const { parseJSONResponse } = require("./jsonParse");
const {
  normalizeParsedCVData,
  normalizeCVAnalysisResponse,
  normalizeOutreachLetterFormatting,
  buildOutreachSignatureBlock,
} = require("./normalizeCv");
const {
  applyAdaptedCvFromBundle,
  buildAdaptationNotes,
} = require("./applyAdaptedCv");
const {
  wrapColdEmailForInfoContactInbox,
} = require("../../utils/cold-email-generic-inbox");

const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAY_MS = 1500;

/**
 * Company-based runFullOptimizationBundle — Frontend ile aynı prompt + post-process.
 */
async function runFullOptimizationBundle(request = {}, options = {}) {
  const provider = options.provider || "gemini-free";
  const { prompt, meta } = buildFullOptimizationBundlePrompt(request);
  const {
    wantCover,
    wantLinkedIn,
    wantCold,
    coldLang,
    kwAbout,
    kwExp,
    targetPosition,
    recipientCompany,
    needCompanyExtract,
  } = meta;

  await waitAndProceed();

  let lastError = null;
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      const aiResult = await generateAIContent({
        prompt,
        jsonMode: true,
        provider,
        model: COMPANY_BASED_GEMINI_MODEL,
      });

      const parsed = parseJSONResponse(aiResult.text, {
        useCompanyFallback: false,
      });

      const parsedCV = normalizeParsedCVData(parsed.parsedCV || {}, request.cvText);
      const analysis = normalizeCVAnalysisResponse(parsed.analysis || {}, {
        cvText: request.cvText,
        keywordTargetSections: {
          about: kwAbout,
          workExperience: kwExp,
        },
      });

      let coverLetter = wantCover ? String(parsed.coverLetter || "").trim() : "";
      let linkedinMessage = wantLinkedIn
        ? String(parsed.linkedinMessage || "").trim()
        : "";

      if (coverLetter) {
        coverLetter = normalizeOutreachLetterFormatting(
          coverLetter.replace(/\[company\]/gi, "")
        );
        if (!recipientCompany && request.companyInfo?.name) {
          const escaped = String(request.companyInfo.name).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          coverLetter = normalizeOutreachLetterFormatting(
            coverLetter.replace(new RegExp(escaped, "gi"), "")
          );
        }
        const signature = buildOutreachSignatureBlock(parsedCV.personalInfo);
        coverLetter = `${coverLetter}\n\n${signature}`.trim();
      }

      if (linkedinMessage) {
        linkedinMessage = normalizeOutreachLetterFormatting(
          linkedinMessage.replace(/\[company\]/gi, "")
        );
        if (!recipientCompany && request.companyInfo?.name) {
          const escaped = String(request.companyInfo.name).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          linkedinMessage = normalizeOutreachLetterFormatting(
            linkedinMessage.replace(new RegExp(escaped, "gi"), "")
          );
        }
        const signature = buildOutreachSignatureBlock(parsedCV.personalInfo);
        linkedinMessage = `${linkedinMessage}\n\n${signature}`.trim();
      }

      let coldEmail = null;
      if (wantCold) {
        const coldRaw = parsed.coldEmail || {};
        let subject = String(coldRaw.subject || "").trim();
        let body = String(coldRaw.body || "").trim();
        const fullName = `${parsedCV.personalInfo?.firstName || ""} ${
          parsedCV.personalInfo?.lastName || ""
        }`.trim();
        const title =
          parsedCV.personalInfo?.title || targetPosition || "Full Stack Developer";
        if (!subject) {
          subject =
            coldLang === "English"
              ? `${title} – ${fullName || "Application"} Application`
              : `${title} Başvurusu – ${fullName || ""}`.trim();
        }
        if (body) {
          const linkedin =
            String(request.outreachLinkedinUrl || "").trim() ||
            parsedCV.personalInfo?.linkedin ||
            "";
          const portfolio =
            String(request.outreachPortfolioUrl || "").trim() ||
            parsedCV.personalInfo?.portfolio ||
            "";
          const website = String(request.outreachWebsiteUrl || "").trim();
          const missing = [];
          if (linkedin && !body.toLowerCase().includes(linkedin.toLowerCase())) {
            missing.push(linkedin);
          }
          if (portfolio && !body.toLowerCase().includes(portfolio.toLowerCase())) {
            missing.push(portfolio);
          }
          if (website && !body.toLowerCase().includes(website.toLowerCase())) {
            missing.push(website);
          }
          if (missing.length) body = `${body}\n${missing.join(" | ")}`.trim();
          if (request.coldEmailGenericInboxRouting) {
            body = wrapColdEmailForInfoContactInbox({
              bodyText: body,
              companyName:
                String(request.recipientCompanyName || "").trim() ||
                String(request.companyInfo?.name || "").trim(),
              language: coldLang === "English" ? "english" : "turkish",
            });
          }
          coldEmail = { subject, body };
        }
      }

      let resolvedCompanyInfo = request.companyInfo || undefined;
      if (needCompanyExtract && parsed.companyInfo && typeof parsed.companyInfo === "object") {
        const raw = parsed.companyInfo;
        const keywords = Array.isArray(raw.extractedKeywords)
          ? raw.extractedKeywords.map((k) => String(k ?? "").trim()).filter(Boolean)
          : [];
        resolvedCompanyInfo = {
          name: resolveCompanyDisplayName({
            name: String(raw.name || "").trim(),
            website: String(
              raw.website || request.companyPages?.[0]?.url || ""
            ).trim(),
          }) || "Şirket",
          website: String(
            raw.website || request.companyPages?.[0]?.url || ""
          ).trim(),
          description: String(raw.description || "").trim(),
          industry: String(raw.industry || "").trim(),
          values: Array.isArray(raw.values)
            ? raw.values.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [],
          requirements: Array.isArray(raw.requirements)
            ? raw.requirements.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [],
          culture: String(raw.culture || "").trim(),
          extractedKeywords: keywords.slice(0, 10),
          detectedLanguage:
            raw.detectedLanguage === "english" || raw.detectedLanguage === "turkish"
              ? raw.detectedLanguage
              : "other",
          analyzedLinks: Array.isArray(raw.analyzedLinks)
            ? raw.analyzedLinks
            : (request.companyPages || []).map((p) => ({
                url: p.url,
                description: p.description || p.pageType || "",
                pageType: p.pageType || undefined,
              })),
        };
      }

      const adaptedCvData = applyAdaptedCvFromBundle({
        parsedCV,
        analysis,
        companyInfo: resolvedCompanyInfo,
        aiSettings: {
          about: request.keywordTargetSections?.about !== false,
          workExperience: request.keywordTargetSections?.workExperience !== false,
          skills: request.keywordTargetSections?.skills !== false,
        },
        targetPosition,
      });

      return {
        parsedCV,
        analysis,
        coverLetter,
        linkedinMessage,
        coldEmail,
        companyInfo: resolvedCompanyInfo,
        adaptedCvData,
        adaptationNotes: buildAdaptationNotes(analysis),
        model: aiResult.model,
        provider: aiResult.provider || provider,
      };
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isParseError = /JSON formatında ayrıştırılamadı|JSON/i.test(msg);
      if (!isParseError || attempt >= GEMINI_MAX_RETRIES) throw error;
      console.warn(
        `[runFullOptimizationBundle] parse fail — retry ${attempt + 1}/${
          GEMINI_MAX_RETRIES + 1
        }`
      );
      await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Optimizasyon AI yanıtı ayrıştırılamadı.");
}

module.exports = {
  runFullOptimizationBundle,
};
