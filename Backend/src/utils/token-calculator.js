/**
 * Token hesaplayıcı (rough estimation)
 * Gemini/GPT için yaklaşık token sayısı
 */

/**
 * Basit token tahmini: 1 token ≈ 4 karakter (İngilizce)
 * Türkçe için biraz daha fazla olabilir (~5 karakter/token)
 */
function estimateTokens(text, language = "mixed") {
  if (!text || typeof text !== "string") return 0;

  const charCount = text.length;

  // Dil bazlı çarpan
  const multiplier = language === "turkish" ? 5.5 : language === "english" ? 4 : 4.5;

  return Math.ceil(charCount / multiplier);
}

/**
 * Company-based CV optimization bundle için ortalama token kullanımı
 */
function estimateCompanyBasedTokens(request) {
  const cvText = String(request.cvText || "");
  const jobDescriptionText = String(request.jobDescriptionText || "");
  const companyPages = Array.isArray(request.companyPages) ? request.companyPages : [];
  const companyInfo = request.companyInfo || {};

  // INPUT tokens
  let inputTokens = 0;

  // CV text (ortalama 2000-5000 token)
  inputTokens += estimateTokens(cvText, request.cvLanguage || "mixed");

  // Company pages or profile
  if (companyPages.length > 0) {
    companyPages.forEach((page) => {
      inputTokens += estimateTokens(page.pageText || "", "mixed");
    });
  } else if (companyInfo.description) {
    inputTokens += estimateTokens(JSON.stringify(companyInfo), "mixed");
  }

  // Job description
  if (jobDescriptionText) {
    inputTokens += estimateTokens(jobDescriptionText, "mixed");
  }

  // System instructions (prompt template) ~2000 token sabit
  inputTokens += 2000;

  // OUTPUT tokens (ortalama tahmin)
  let outputTokens = 0;

  // Parsed CV + Analysis (base): ~3500 token
  outputTokens += 3500;

  // Optional outputs
  if (request.generateCoverLetter) outputTokens += 400;
  if (request.generateLinkedInMessage) outputTokens += 100;
  if (request.generateColdEmail) outputTokens += 200;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    breakdown: {
      cvText: estimateTokens(cvText, request.cvLanguage || "mixed"),
      targetData: inputTokens - estimateTokens(cvText, request.cvLanguage || "mixed") - 2000,
      systemInstructions: 2000,
      parsedCvAndAnalysis: 3500,
      optionalOutputs: outputTokens - 3500,
    },
  };
}

/**
 * Gemini fiyat hesaplama (Gemini API free/paid)
 * Free: $0/1M (quota limited)
 * Paid: $0.075 input / $0.30 output per 1M token
 */
function calculateGeminiCost(inputTokens, outputTokens, tier = "paid") {
  if (tier === "free") return { cost: 0, note: "Free tier (quota limited)" };

  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.3;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    costPer1000Requests: totalCost * 1000,
  };
}

module.exports = {
  estimateTokens,
  estimateCompanyBasedTokens,
  calculateGeminiCost,
};
