/**
 * Optimize CV PDF — Frontend Next route üzerinden mevcut react-pdf yolu.
 */
function resolvePdfRenderBaseUrl() {
  const explicit = String(process.env.CV_PDF_RENDER_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;

  const fromFrontend = String(process.env.FRONTEND_URL || "")
    .split(",")
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (fromFrontend.length) return fromFrontend[0];

  return "http://localhost:3010";
}

async function renderOptimizedCvPdfViaFrontend(adaptedCvData, options = {}) {
  const baseUrl = resolvePdfRenderBaseUrl();
  const secret = String(process.env.INTERNAL_PIPELINE_SECRET || "").trim();
  if (!secret) {
    throw new Error(
      "INTERNAL_PIPELINE_SECRET tanımlı değil — optimize PDF üretilemiyor."
    );
  }

  const url = `${baseUrl}/api/company-based/render-pdf`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Pipeline-Secret": secret,
      },
      body: JSON.stringify({
        cvData: adaptedCvData,
        isEnglish: Boolean(options.isEnglish),
        bodyFontSize: options.bodyFontSize,
        headingFontSize: options.headingFontSize,
        jobTitleFontSize: options.jobTitleFontSize,
        skillsFontSize: options.skillsFontSize,
        nameFontSize: options.nameFontSize,
        profileTitleFontSize: options.profileTitleFontSize,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : `PDF render başarısız (${response.status})`
      );
    }

    if (!data.contentBase64) {
      throw new Error("PDF render boş içerik döndü.");
    }

    return {
      filename: String(data.filename || "Optimized_CV.pdf"),
      contentBase64: String(data.contentBase64),
      contentType: String(data.contentType || "application/pdf"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  resolvePdfRenderBaseUrl,
  renderOptimizedCvPdfViaFrontend,
};
