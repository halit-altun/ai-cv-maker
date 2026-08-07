/**
 * Hedef şirket sayfasından düz metin çeker (AI analizine girdi).
 */

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function detectPageLanguage(text) {
  const sample = String(text || "");
  const trHits = (sample.match(/[çğıöşüÇĞİÖŞÜ]/g) || []).length;
  const enHints = /\b(the|and|with|for|experience|responsibilities|requirements)\b/i.test(
    sample
  );
  if (trHits >= 3) return "turkish";
  if (enHints) return "english";
  return "other";
}

async function fetchPageText(rawUrl, { timeoutMs = 12000, maxChars = 14000 } = {}) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    return { ok: false, message: "url zorunlu", url: "", text: "", length: 0 };
  }

  let parsed;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, message: "Geçersiz URL", url: trimmed, text: "", length: 0 };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      ok: false,
      message: "Sadece http/https",
      url: parsed.toString(),
      text: "",
      length: 0,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CareerAIBot/1.0; +https://careerai.local)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Sayfa alınamadı (${response.status})`,
        url: parsed.toString(),
        text: "",
        length: 0,
      };
    }

    const html = await response.text();
    const text = stripHtml(html).slice(0, maxChars);
    return {
      ok: true,
      url: parsed.toString(),
      text,
      length: text.length,
      detectedLanguage: detectPageLanguage(text),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Fetch hatası",
      url: parsed.toString(),
      text: "",
      length: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  stripHtml,
  detectPageLanguage,
  fetchPageText,
};
