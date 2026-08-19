const { generateAIContent } = require("./ai-provider.service");
const { waitAndProceed } = require("./gemini-rate-limiter");
const { sanitizeOutreachPlaceholders, textAlreadyHasUrl } = require("../utils/outreach-placeholder.utils");

function safeJsonParse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function resolveMailLanguage({ mode, pageLanguage, fallback = "turkish" }) {
  if (mode === "turkish" || mode === "english") return mode;
  if (pageLanguage === "turkish" || pageLanguage === "english") return pageLanguage;
  return fallback || "turkish";
}

function buildSignatureLines(settings = {}) {
  const lines = [];
  const name = String(settings.candidateFullName || "").trim();
  const title = String(settings.candidateTitle || "").trim();
  if (name) lines.push(name);
  if (title) lines.push(title);
  if (settings.linkedinUrl) lines.push(String(settings.linkedinUrl).trim());
  const urls = [
    String(settings.portfolioUrl || "").trim(),
    String(settings.websiteUrl || "").trim(),
  ].filter(Boolean);
  const seen = new Set();
  for (const url of urls) {
    const key = url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    lines.push(url);
  }
  if (settings.phone) lines.push(String(settings.phone).trim());
  return lines.filter(Boolean);
}

/**
 * Firma sayfası metninden cold mail üretir.
 */
async function generateColdEmailForCompany({
  pageText,
  companyUrl,
  companyName,
  pageType,
  pageTypeOther,
  targetPosition,
  language,
  settings = {},
  provider = "gemini-free",
}) {
  await waitAndProceed();

  const langLabel = language === "english" ? "English" : "Turkish";
  const pageTypeLabel =
    pageType === "other"
      ? String(pageTypeOther || "other").trim() || "other"
      : pageType || "careers";

  const signature = buildSignatureLines(settings);
  const prompt = `
You write a short cold outreach email for a job application.

Return ONLY valid JSON:
{
  "companyName": "string",
  "subject": "string",
  "body": "string",
  "adaptationNotes": "string — 2-4 short bullets in the same language: what you tailored for this company (tone, role focus, keywords from page). No fake claims."
}

Rules:
- Language: ${langLabel}
- Keep body under 180 words
- Professional, concise, no fluff
- Mention interest in the company / role naturally
- Do NOT invent fake metrics
- NEVER use template tokens: [Name], [Company], [İlgili Kişi Adı Soyadı], [kullanıcı]
- If you do not know the recipient person, greet with "Sayın ilgili," (Turkish) or "Dear Hiring Team," (English)
- Include a short ask to review the attached CV if relevant
- Sign with the candidate info if provided
- Subject max 80 chars

Context:
- Company URL: ${companyUrl || ""}
- Known company name: ${companyName || ""}
- Page type: ${pageTypeLabel}
- Target position: ${targetPosition || ""}
- Candidate name: ${settings.candidateFullName || ""}
- Candidate title: ${settings.candidateTitle || ""}
- Signature lines: ${signature.join(" | ") || "(none)"}

Page text excerpt:
"""
${String(pageText || "").slice(0, 9000)}
"""
`.trim();

  const result = await generateAIContent({
    prompt,
    jsonMode: true,
    provider,
  });

  const parsed = safeJsonParse(result.text);
  if (!parsed || !parsed.body) {
    throw new Error("AI cold mail JSON üretilemedi.");
  }

  const resolvedCompanyName =
    String(parsed.companyName || companyName || "").trim() ||
    companyName ||
    "";

  let body = sanitizeOutreachPlaceholders(String(parsed.body || "").trim(), {
    kind: "body",
    language,
    companyName: resolvedCompanyName,
    candidateName: String(settings.candidateFullName || "").trim(),
  });
  const subject = sanitizeOutreachPlaceholders(
    String(parsed.subject || "").trim() ||
      (targetPosition ? `${targetPosition} başvurusu` : "İş başvurusu"),
    {
      kind: "subject",
      language,
      companyName: resolvedCompanyName,
      candidateName: String(settings.candidateFullName || "").trim(),
    }
  );
  const extraSignature = signature.filter(
    (line) => !body.includes(line) && !textAlreadyHasUrl(body, line)
  );
  if (extraSignature.length) {
    body = sanitizeOutreachPlaceholders(`${body}\n\n${extraSignature.join("\n")}`, {
      kind: "body",
      language,
      companyName: resolvedCompanyName,
      candidateName: String(settings.candidateFullName || "").trim(),
    });
  }

  return {
    companyName: resolvedCompanyName,
    subject,
    body,
    adaptationNotes: String(parsed.adaptationNotes || "").trim(),
    model: result.model,
    provider: result.provider || provider,
  };
}

module.exports = {
  resolveMailLanguage,
  generateColdEmailForCompany,
  safeJsonParse,
};
