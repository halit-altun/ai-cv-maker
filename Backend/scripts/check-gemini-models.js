/* eslint-disable no-console */
/**
 * Gemini yapılandırmasını doğrular: seçilen model/URL sırası ve gerçek bir istek.
 * Kullanım: node scripts/check-gemini-models.js
 */
require("dotenv").config();

const {
  generateGeminiContent,
  getGeminiKeys,
  getGeminiEndpoints,
} = require("../src/services/gemini.service");

async function main() {
  console.log("Key sayısı:", getGeminiKeys().length);
  console.log(
    "Denenecek modeller:",
    getGeminiEndpoints()
      .map((e) => e.model)
      .join(" -> ")
  );

  try {
    const result = await generateGeminiContent({
      prompt: 'Sadece {"ok":true} JSON dondur.',
      jsonMode: true,
    });
    console.log("Sonuç:", {
      model: result.model,
      keyUsed: result.keyUsed,
      text: result.text.slice(0, 80),
    });
  } catch (err) {
    console.error("Hata:", err.message, err.details || "");
    process.exitCode = 1;
  }
}

void main();
