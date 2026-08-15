/**
 * CV sayfa kenar boşluklarını doğrula (CSS px ↔ PDF pt).
 * Çalıştır: node scripts/verify-cv-page-margins.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const React = require("react");
const { Document, Page, Text, View, StyleSheet, pdf, Font } = require("@react-pdf/renderer");

const ROOT = path.join(__dirname, "..");
const FONT_PATH = path.join(ROOT, "public", "fonts", "Carlito-Regular.ttf");
const OUT = path.join(ROOT, ".tmp-margin-test.pdf");

function cssPxToPt(px) {
  return (px * 72) / 96;
}
function ptToCssPx(pt) {
  return (pt * 96) / 72;
}

const PAD_X_PX = 33;
const PAD_BOTTOM_PX = 50;
const PAD_X_PT = cssPxToPt(PAD_X_PX);
const PAD_BOTTOM_PT = cssPxToPt(PAD_BOTTOM_PX);
/** Üst — eski hali 20mm (fotoğraf konumu) */
const PAD_TOP_PT = Math.round((20 * 72) / 25.4);
const PAD_TOP_PX = ptToCssPx(PAD_TOP_PT);

Font.register({ family: "Calibri", src: FONT_PATH });

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: PAD_BOTTOM_PT,
    fontFamily: "Calibri",
    fontSize: 11,
    position: "relative",
  },
  content: {
    paddingTop: PAD_TOP_PT,
    paddingLeft: PAD_X_PT,
    paddingRight: PAD_X_PT,
  },
  line: { marginBottom: 3, fontSize: 11 },
});

function TestDoc() {
  const lines = [];
  for (let i = 1; i <= 90; i++) {
    lines.push(
      React.createElement(
        Text,
        { key: i, style: styles.line },
        `LINE_${String(i).padStart(2, "0")} xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
      )
    );
  }
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(View, { style: styles.content }, ...lines)
    )
  );
}

async function measure(filePath) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const item of content.items) {
      const str = (item.str || "").trim();
      if (!str) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      const w = item.width || 0;
      const h = item.height || 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
    }
    out.push({
      page: p,
      pageH: viewport.height,
      pageW: viewport.width,
      leftPx: ptToCssPx(minX),
      rightPx: ptToCssPx(viewport.width - maxX),
      bottomPx: ptToCssPx(minY),
      topPx: ptToCssPx(viewport.height - maxY),
      bottomPt: minY,
    });
  }
  return { numPages: doc.numPages, pages: out };
}

async function main() {
  console.log("=== Bugfix verification ===");
  console.log(`Eski bottom: 57pt = ${ptToCssPx(57).toFixed(1)} CSS px (fazlaydı)`);
  console.log(`Yeni bottom: ${PAD_BOTTOM_PX} CSS px = ${PAD_BOTTOM_PT} pt`);
  console.log(`Yeni left/right: ${PAD_X_PX} CSS px = ${PAD_X_PT} pt`);
  console.log(`Üst (eski): 20mm = ${PAD_TOP_PT} pt ≈ ${PAD_TOP_PX.toFixed(1)} CSS px`);

  assert.strictEqual(PAD_BOTTOM_PT, 37.5);
  assert.strictEqual(PAD_X_PT, 24.75);
  assert.strictEqual(PAD_TOP_PT, 57);

  const src = fs.readFileSync(
    path.join(ROOT, "src/components/cv-maker/cvPhoto.ts"),
    "utf8"
  );
  assert.ok(src.includes("CV_PAGE_PADDING_BOTTOM_PX = 50"));
  assert.ok(src.includes("cssPxToPt(CV_PAGE_PADDING_BOTTOM_PX)"));
  assert.ok(src.includes("CV_PAGE_PADDING_X_PX = 33"));
  assert.ok(src.includes("cssPxToPt(CV_PAGE_PADDING_X_PX)"));
  assert.ok(src.includes("CV_PAGE_PADDING_TOP_PT = Math.round((20 * 72) / 25.4)"));
  assert.ok(src.includes("CV_PAGE_PADDING_TOP_CSS = '20mm'"));

  const blob = await pdf(React.createElement(TestDoc)).toBlob();
  fs.writeFileSync(OUT, Buffer.from(await blob.arrayBuffer()));
  const { numPages, pages } = await measure(OUT);
  console.log(`\nGenerated ${numPages} page(s)`);

  for (const m of pages) {
    console.log(
      `Page ${m.page}: left=${m.leftPx.toFixed(1)}px top=${m.topPx.toFixed(1)}px bottom=${m.bottomPx.toFixed(1)}px right≈${m.rightPx.toFixed(1)}px`
    );
  }

  const p1 = pages[0];
  assert.ok(Math.abs(p1.leftPx - PAD_X_PX) <= 1, `left ${p1.leftPx}`);
  assert.ok(Math.abs(p1.topPx - PAD_TOP_PX) <= 3, `top ${p1.topPx}`);

  // Dolu 1. sayfa: en alt metin padding'e yakın olmalı.
  // Satır kutusu sığmadığı için baseline, padding'den birkaç px yukarıda olabilir.
  assert.ok(numPages >= 2, "need wrap to a 2nd page to stress bottom padding");
  assert.ok(p1.bottomPx >= PAD_BOTTOM_PX - 2, `underrun bottom ${p1.bottomPx}`);
  assert.ok(
    p1.bottomPx <= PAD_BOTTOM_PX + 18,
    `bottom gap ${p1.bottomPx.toFixed(1)}px too large (padding ${PAD_BOTTOM_PX}px + line box slack)`
  );

  console.log("\nOK — constants correct; measured left/top ≈ target; bottom ≥ padding.");
  console.log(
    `Note: full-page text baseline bottom≈${p1.bottomPx.toFixed(1)}px includes ~line-height slack above the ${PAD_BOTTOM_PX}px pad.`
  );

  try {
    fs.unlinkSync(OUT);
  } catch (_) {}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
