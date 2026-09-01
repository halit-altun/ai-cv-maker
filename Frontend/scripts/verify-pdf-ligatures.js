/**
 * ATS PDF ligature regression test.
 *
 * 1) Static: @react-pdf/textkit yaması hâlâ uygulı mı?
 * 2) Dynamic: Carlito ile PDF üret → text extraction → fi/fl/ti kelimeleri bozulmamış mı?
 *
 * Çalıştır: npm test
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const React = require("react");
const { Font, Document, Page, Text, pdf } = require("@react-pdf/renderer");

const ROOT = path.join(__dirname, "..");
const TEXTKIT_JS = path.join(
  ROOT,
  "node_modules",
  "@react-pdf",
  "textkit",
  "lib",
  "textkit.js"
);
const PATCH_FILE = path.join(ROOT, "patches", "@react-pdf+textkit+6.1.0.patch");
const FONT_PATH = path.join(ROOT, "public", "fonts", "Carlito-Regular.ttf");

const ATS_FEATURES_SNIPPET =
  "{ liga: false, clig: false, dlig: false, hlig: false, calt: false, rlig: false, ccmp: false, locl: false, salt: false, frac: false, numr: false, dnom: false, kern: false, cpsp: false }";

const UNPATCHED_CALLS = [
  "font.layout(string, undefined, undefined, undefined, 'ltr')",
  "font[0].layout(runString, undefined, undefined, undefined, 'ltr')",
];

const PROBE =
  "solutions workflow finishing office efficient notifications Information";

const REQUIRED_WORDS = [
  "solutions",
  "workflow",
  "finishing",
  "office",
  "efficient",
  "notifications",
  "Information",
];

function assertTextkitPatchApplied() {
  assert.ok(fs.existsSync(PATCH_FILE), `patch dosyası yok: ${PATCH_FILE}`);
  assert.ok(fs.existsSync(TEXTKIT_JS), `textkit bulunamadı: ${TEXTKIT_JS}`);

  const source = fs.readFileSync(TEXTKIT_JS, "utf8");
  const featureHits = source.split(ATS_FEATURES_SNIPPET).length - 1;
  assert.ok(
    featureHits >= 2,
    `textkit ligature yaması eksik/bozuk (beklenen ≥2 layout çağrısı, bulunan ${featureHits}). ` +
      `npm install sonrası patch-package çalıştı mı? patches/@react-pdf+textkit+6.1.0.patch`
  );
  assert.ok(
    source.includes("fillEmptyGlyphCodePoints"),
    "textkit ATS codePoints yaması eksik (fillEmptyGlyphCodePoints)."
  );

  for (const unpatched of UNPATCHED_CALLS) {
    assert.ok(
      !source.includes(unpatched),
      `Yama düşmüş: hâlâ unpatched layout çağrısı var → ${unpatched}`
    );
  }

  console.log("✓ static: @react-pdf/textkit ligature patch applied");
}

async function extractPdfText(buffer) {
  const { PDFParse } = require("pdf-parse");
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = String(result?.text ?? result ?? "");
    if (typeof parser.destroy === "function") await parser.destroy();
    return text;
  } catch {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return String(result?.text ?? "");
  }
}

async function assertPdfExtractionKeepsLigaturePairs() {
  assert.ok(fs.existsSync(FONT_PATH), `Carlito font yok: ${FONT_PATH}`);

  Font.register({
    family: "CalibriTest",
    fonts: [{ src: FONT_PATH, fontWeight: 400 }],
  });
  Font.registerHyphenationCallback((word) => [word.replace(/\u00AD/g, "")]);

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      {
        size: "A4",
        style: { fontFamily: "CalibriTest", fontSize: 12, padding: 40 },
      },
      React.createElement(Text, null, PROBE)
    )
  );

  const blob = await pdf(doc).toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const extracted = (await extractPdfText(buffer)).replace(/\s+/g, " ").trim();

  console.log("  probe :", PROBE);
  console.log("  extract:", extracted);

  const missing = REQUIRED_WORDS.filter((word) => !extracted.includes(word));
  assert.deepStrictEqual(
    missing,
    [],
    `PDF text extraction ligature kaybı: eksik kelimeler = [${missing.join(", ")}]. ` +
      `Ham extract: ${extracted}`
  );

  // Tipik ligature bozulma imzaları — yanlış negatif riski düşük, erken uyarı için
  const corruptions = [
    ["solutions", "solutons"],
    ["workflow", "workfow"],
    ["finishing", "fnishing"],
    ["office", "ofce"],
    ["efficient", "efcient"],
    ["notifications", "noticatons"],
    ["Information", "Informaon"],
    ["Information", "Infor*ation"],
  ];
  for (const [good, bad] of corruptions) {
    assert.ok(
      extracted.includes(good),
      `Beklenen kelime yok: ${good}`
    );
    assert.ok(
      !extracted.includes(bad),
      `Ligature bozulması tespit edildi: "${bad}" (asıl: ${good})`
    );
  }

  console.log("✓ dynamic: PDF extraction keeps fi/fl/ti letter pairs");
}

async function main() {
  assertTextkitPatchApplied();
  await assertPdfExtractionKeepsLigaturePairs();
  console.log("\nAll ligature regression checks passed.");
}

void main().catch((err) => {
  console.error("\nLigature regression FAILED:\n", err.message || err);
  process.exitCode = 1;
});
