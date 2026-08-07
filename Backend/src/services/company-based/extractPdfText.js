/**
 * Proje CV PDF (base64) → düz metin.
 * Frontend extractPdfText ile aynı pdf-parse bağımlılığı.
 */
async function extractPdfTextFromBase64(contentBase64) {
  const raw = String(contentBase64 || "")
    .replace(/^data:[^;]+;base64,/, "")
    .trim();
  if (!raw) {
    throw new Error("CV PDF içeriği boş.");
  }

  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length) {
    throw new Error("CV PDF decode edilemedi.");
  }

  let PDFParse;
  try {
    ({ PDFParse } = require("pdf-parse"));
  } catch {
    const mod = require("pdf-parse");
    PDFParse = mod.PDFParse || mod;
  }

  if (typeof PDFParse === "function" && PDFParse.prototype?.getText) {
    const parser = new PDFParse({ data: buffer });
    try {
      if (typeof PDFParse.setWorker === "function") {
        try {
          const path = require("path");
          const fs = require("fs");
          const workerCandidates = [
            path.join(
              process.cwd(),
              "node_modules",
              "pdf-parse",
              "node_modules",
              "pdfjs-dist",
              "build",
              "pdf.worker.mjs"
            ),
            path.join(
              process.cwd(),
              "node_modules",
              "pdfjs-dist",
              "build",
              "pdf.worker.mjs"
            ),
          ];
          for (const w of workerCandidates) {
            if (fs.existsSync(w)) {
              PDFParse.setWorker(require("url").pathToFileURL(w).href);
              break;
            }
          }
        } catch {
          // worker optional in some envs
        }
      }
      const parsed = await parser.getText({
        pageJoiner: "page_number:page_number/total_number:total_number",
      });
      return String(parsed?.text || "").trim();
    } finally {
      await parser.destroy?.().catch(() => undefined);
    }
  }

  // Legacy pdf-parse API: module.exports = async function(buffer)
  if (typeof PDFParse === "function") {
    const data = await PDFParse(buffer);
    return String(data?.text || "").trim();
  }

  throw new Error("pdf-parse API uyumsuz.");
}

module.exports = {
  extractPdfTextFromBase64,
};
