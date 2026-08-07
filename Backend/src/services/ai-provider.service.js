/**
 * Unified AI Provider Service
 * Gemini Free (3 key) / Gemini Pro (1 key) / OpenAI seçimi
 */

const { generateGeminiContent, getGeminiProKey, COMPANY_BASED_GEMINI_MODEL } = require("./gemini.service");
const { generateOpenAIContent, OPENAI_MODEL } = require("./openai.service");

const DEFAULT_AI_PROVIDER = process.env.DEFAULT_AI_PROVIDER || "gemini-free";

/**
 * Kullanıcı tercihe göre AI provider seçer ve content üretir
 * 
 * @param {Object} options
 * @param {string} options.prompt - Prompt metni
 * @param {boolean} [options.jsonMode=false] - JSON response mı
 * @param {number} [options.preferredKeyIndex] - Gemini Free için key index
 * @param {string} [options.model] - Gemini için model override
 * @param {string} [options.provider="gemini-free"] - AI provider: "gemini-free" | "gemini-pro" | "openai"
 * @returns {Promise<{text: string, model: string, provider: string, ...}>}
 */
async function generateAIContent({
  prompt,
  jsonMode = false,
  preferredKeyIndex,
  model,
  provider = DEFAULT_AI_PROVIDER,
} = {}) {
  const normalizedProvider = (provider || DEFAULT_AI_PROVIDER).toLowerCase().trim();

  console.log(`[ai-provider] provider=${normalizedProvider} jsonMode=${jsonMode}`);

  if (normalizedProvider === "openai") {
    // OpenAI kullan
    return await generateOpenAIContent({ prompt, jsonMode });
  } else if (normalizedProvider === "gemini-pro") {
    // Gemini Pro: tek key, round-robin yok
    const proKey = getGeminiProKey();
    if (!proKey) {
      throw new Error("GEMINI_PRO_API_KEY tanımlı değil");
    }
    
    // Gemini'yi tek key ile çağır (preferredKeyIndex kullanma)
    const result = await generateGeminiContent({
      prompt,
      jsonMode,
      preferredKeyIndex: undefined, // Pro için round-robin yok
      model,
      singleKey: proKey, // Tek key modu
    });
    
    return {
      ...result,
      provider: "gemini-pro",
    };
  } else {
    // Gemini Free: 3 key round-robin (default)
    return await generateGeminiContent({
      prompt,
      jsonMode,
      preferredKeyIndex,
      model,
    });
  }
}

/**
 * Provider bilgilerini döner
 */
function getProviderInfo(provider = DEFAULT_AI_PROVIDER) {
  const normalizedProvider = (provider || DEFAULT_AI_PROVIDER).toLowerCase().trim();

  if (normalizedProvider === "openai") {
    return {
      provider: "openai",
      model: OPENAI_MODEL,
      displayName: "OpenAI GPT-4o-mini",
      features: {
        rateLimit: "10,000 RPM",
        contextWindow: "128K tokens",
        costPerRequest: "$0.0020",
      },
    };
  } else if (normalizedProvider === "gemini-pro") {
    return {
      provider: "gemini-pro",
      model: COMPANY_BASED_GEMINI_MODEL,
      displayName: "Google Gemini 2.5 Flash Pro",
      features: {
        rateLimit: "1,000 RPM (Paid)",
        contextWindow: "1M tokens",
        costPerRequest: "$0.0015",
      },
    };
  } else {
    // gemini-free (default)
    return {
      provider: "gemini-free",
      model: COMPANY_BASED_GEMINI_MODEL,
      displayName: "Google Gemini 2.5 Flash Free",
      features: {
        rateLimit: "15 RPM (3 key round-robin)",
        contextWindow: "1M tokens",
        costPerRequest: "$0 (Free Tier)",
      },
    };
  }
}

module.exports = {
  generateAIContent,
  getProviderInfo,
  DEFAULT_AI_PROVIDER,
};
