/**
 * OpenAI Service (GPT-4o-mini)
 * Gemini'ye alternatif olarak kullanılabilir
 */

const https = require("https");
const { AppError } = require("../utils/app-error");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * OpenAI API çağrısı
 */
async function generateOpenAIContent({ prompt, jsonMode = false } = {}) {
  if (!OPENAI_API_KEY) {
    throw new AppError("OPENAI_API_KEY tanımlı değil", 500, "OPENAI_CONFIG_ERROR");
  }

  if (!prompt || typeof prompt !== "string") {
    throw new AppError("Prompt gerekli", 400, "INVALID_PROMPT");
  }

  console.log(`[openai] model=${OPENAI_MODEL} jsonMode=${jsonMode}`);

  const messages = [
    {
      role: "user",
      content: prompt,
    },
  ];

  const requestBody = {
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 16000,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callOpenAIAPI(requestBody);
      
      if (!response.choices || response.choices.length === 0) {
        throw new AppError("OpenAI boş yanıt döndü", 500, "OPENAI_EMPTY_RESPONSE");
      }

      const text = response.choices[0].message?.content || "";
      
      if (!text.trim()) {
        throw new AppError("OpenAI boş içerik döndü", 500, "OPENAI_EMPTY_CONTENT");
      }

      console.log(
        `[openai] başarılı — model=${OPENAI_MODEL} tokens=${response.usage?.total_tokens || "?"}`
      );

      return {
        text: text.trim(),
        model: OPENAI_MODEL,
        provider: "openai",
        usage: response.usage || null,
      };
    } catch (error) {
      lastError = error;
      const isRetriable =
        error.statusCode === 429 ||
        error.statusCode === 502 ||
        error.statusCode === 503 ||
        error.statusCode === 504 ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (isRetriable && attempt < MAX_RETRIES) {
        console.warn(
          `[openai] hata ${error.statusCode || error.code} — ${RETRY_DELAY_MS / 1000}s sonra tekrar (deneme ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new AppError("OpenAI isteği başarısız", 500, "OPENAI_REQUEST_FAILED");
}

/**
 * OpenAI API çağrısı (low-level)
 */
function callOpenAIAPI(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(OPENAI_API_URL, options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(responseData);
            resolve(json);
          } catch (parseError) {
            reject(
              new AppError(
                `OpenAI JSON parse hatası: ${parseError.message}`,
                500,
                "OPENAI_PARSE_ERROR"
              )
            );
          }
        } else {
          let errorMessage = `OpenAI API hatası: ${res.statusCode}`;
          try {
            const errorJson = JSON.parse(responseData);
            errorMessage = errorJson.error?.message || errorMessage;
          } catch {
            // JSON parse edilemezse default mesaj
          }

          const error = new AppError(errorMessage, res.statusCode, "OPENAI_API_ERROR");
          error.statusCode = res.statusCode;
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(new AppError(`OpenAI network hatası: ${error.message}`, 500, "OPENAI_NETWORK_ERROR"));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new AppError("OpenAI timeout", 504, "OPENAI_TIMEOUT"));
    });

    req.setTimeout(60000); // 60s timeout

    req.write(data);
    req.end();
  });
}

module.exports = {
  generateOpenAIContent,
  OPENAI_MODEL,
};
