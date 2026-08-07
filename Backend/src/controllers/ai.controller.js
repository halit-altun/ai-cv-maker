const { generateAIContent } = require("../services/ai-provider.service");
const { isAppError } = require("../utils/app-error");
const { waitAndProceed, getRequiredWaitMs } = require("../services/gemini-rate-limiter");

/**
 * AI content generation handler (Gemini veya OpenAI)
 * Kullanıcının preferredAiProvider tercihine göre provider seçer
 */
async function geminiGenerateHandler(req, res, next) {
  try {
    const { prompt, jsonMode, preferredKeyIndex, model } = req.body || {};
    const parsedPreferred =
      preferredKeyIndex === undefined || preferredKeyIndex === null || preferredKeyIndex === ""
        ? undefined
        : Number(preferredKeyIndex);

    // Kullanıcının AI provider tercihi (default: gemini)
    const userProvider = req.user?.preferredAiProvider || "gemini";

    // Rate limiter: 429 önleme (10s zorunlu gap)
    // OpenAI için rate limit gerekmiyor ama consistency için tutuyoruz
    const waitCheck = getRequiredWaitMs();
    if (waitCheck > 0) {
      console.log(
        `[ai.controller] rate limit — ${waitCheck / 1000}s beklenecek (provider=${userProvider})`
      );
    }
    const waitInfo = await waitAndProceed();

    const result = await generateAIContent({
      prompt,
      jsonMode: Boolean(jsonMode),
      preferredKeyIndex: Number.isFinite(parsedPreferred) ? parsedPreferred : undefined,
      model: typeof model === "string" ? model : undefined,
      provider: userProvider,
    });

    return res.json({
      ok: true,
      ...result,
      rateLimitInfo: waitInfo.waited
        ? {
            waited: true,
            waitedMs: waitInfo.waitedMs,
            message: `Rate limit: ${(waitInfo.waitedMs / 1000).toFixed(1)}s beklendi`,
          }
        : undefined,
    });
  } catch (error) {
    if (isAppError(error)) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        message: error.message,
        code: error.code,
        details: error.details ?? undefined,
      });
    }
    return next(error);
  }
}

module.exports = {
  geminiGenerateHandler,
};
