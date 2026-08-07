function stripMarkdownCodeFences(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJsonObject(text) {
  const start = String(text || "").indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function sanitizeJsonString(jsonStr) {
  return String(jsonStr || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function escapeControlCharsInJsonStrings(jsonStr) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (!inString) {
      result += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = false;
      continue;
    }

    if (char === "\n") {
      result += "\\n";
      continue;
    }
    if (char === "\r") {
      result += "\\r";
      continue;
    }
    if (char === "\t") {
      result += "\\t";
      continue;
    }

    result += char;
  }

  return result;
}

function tryParseJsonCandidates(response) {
  const cleaned = stripMarkdownCodeFences(response);
  const candidates = [cleaned, extractJsonObject(cleaned)].filter(Boolean);

  for (const candidate of candidates) {
    const sanitized = sanitizeJsonString(candidate);
    const escaped = escapeControlCharsInJsonStrings(sanitized);
    for (const attempt of [sanitized, escaped]) {
      try {
        return JSON.parse(attempt);
      } catch {
        // continue
      }
    }
  }
  return null;
}

function parseJSONResponse(response, options = {}) {
  const parsed = tryParseJsonCandidates(response);
  if (parsed != null) return parsed;

  if (options.useCompanyFallback !== false) {
    return {
      name: "Şirket Adı",
      website: "https://example.com",
      description: "Şirket açıklaması alınamadı",
      industry: "Teknoloji",
      values: ["İnovasyon", "Kalite", "Müşteri Odaklılık"],
      requirements: ["Deneyim", "Ekip Çalışması", "Problem Çözme"],
      culture: "Dinamik ve yenilikçi çalışma ortamı",
    };
  }

  throw new Error("AI yanıtı geçerli JSON formatında ayrıştırılamadı. Lütfen tekrar deneyin.");
}

module.exports = {
  parseJSONResponse,
  tryParseJsonCandidates,
  stripMarkdownCodeFences,
};
