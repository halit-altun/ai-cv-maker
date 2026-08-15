/**
 * CV bölüm sayfalama regresyon testi.
 *
 * react-pdf (@react-pdf/layout) kırılma kararı:
 *   shouldBreak = props.break
 *              || (shouldSplit && wrap === false)
 *              || (!shouldSplit && endOfPresence > availableHeight && sayfada içerik varsa)
 *   endOfPresence = min(box.top + box.height + box.marginBottom + minPresenceAhead,
 *                       sonraki kardeşlerin en alt ucu)
 *
 * Yani `marginBottom` ve `minPresenceAhead`, sayfaya SIĞAN bir bölümü sonraki
 * sayfaya attırır. Kalıcı çözüm: boşlukları blokların arasına spacer View olarak
 * koymak ve bölüme wrap={false} vermek.
 *
 * Bu test iki değişmez kuralı doğrular (font metriklerine bağlı olmayan):
 *   1) Atomiklik : Beceriler bölümünün başlığı ve TÜM rozetleri aynı sayfada.
 *   2) Monotonluk: Boşluk arttıkça bölüm asla geri gitmez. Bölüm N satır
 *      dolgu ile 1. sayfada kalıyorsa, N-1 satır dolgu (daha fazla boşluk) ile
 *      de 1. sayfada kalmalıdır.
 *
 * Çalıştır: node scripts/verify-cv-section-pagination.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const React = require("react");
const { Document, Page, Text, View, StyleSheet, pdf, Font } = require("@react-pdf/renderer");

const ROOT = path.join(__dirname, "..");
const FONT_PATH = path.join(ROOT, "public", "fonts", "Carlito-Regular.ttf");

const cssPxToPt = (px) => (px * 72) / 96;
const PAD_BOTTOM_PT = cssPxToPt(50);
const PAD_X_PT = cssPxToPt(33);
const PAD_TOP_PT = Math.round((20 * 72) / 25.4);
const SECTION_GAP_PT = 10;
const BADGE_ROW_GAP_PT = 5;

Font.register({ family: "Calibri", src: FONT_PATH });

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: PAD_BOTTOM_PT,
    fontFamily: "Calibri",
    fontSize: 11,
  },
  content: {
    paddingTop: PAD_TOP_PT,
    paddingLeft: PAD_X_PT,
    paddingRight: PAD_X_PT,
  },
  section: { marginBottom: 0 },
  sectionLegacy: { marginBottom: SECTION_GAP_PT },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  line: { fontSize: 11, marginBottom: 0 },
  lineLegacy: { fontSize: 11, marginBottom: 3 },
  badgeRow: { flexDirection: "row", flexWrap: "nowrap", marginBottom: 0 },
  badgeRowLegacy: { flexDirection: "row", flexWrap: "nowrap", marginBottom: BADGE_ROW_GAP_PT },
  badge: {
    backgroundColor: "#F5F5F5",
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 7,
    paddingRight: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  badgeText: { fontSize: 11, color: "#333" },
});

const SKILL_ROWS = [
  ["C#", ".NET", "Next.js", "TypeScript", "React", "JavaScript", "Node.js", "SQL", "MongoDB", "AWS", "Docker"],
  ["GitHub", "Bitbucket", "Jira", "HTML", "CSS", "Agile", "Scrum"],
];
const LANG_ROWS = [["English (B1)", "Turkish (C2)"]];

const gap = (key, heightPt) =>
  React.createElement(View, { key, style: { height: heightPt, width: "100%" } });

/** Blokların arasına boşluk ekler (PdfFlowGap.withFlowGaps ile aynı davranış) */
function withFlowGaps(blocks, gapPt, keyPrefix) {
  const out = [];
  blocks.forEach((block, index) => {
    if (out.length > 0) out.push(gap(`${keyPrefix}-${index}`, gapPt));
    out.push(block);
  });
  return out;
}

function badgeSection(title, rows, { legacy }) {
  const titleProps = { style: styles.sectionTitle };
  if (legacy) titleProps.minPresenceAhead = title.startsWith("SKILLS") ? 48 : 36;

  const rowNodes = rows.map((row, rowIndex) =>
    React.createElement(
      View,
      {
        key: `row-${rowIndex}`,
        style: legacy ? styles.badgeRowLegacy : styles.badgeRow,
        wrap: false,
      },
      ...row.map((label, i) =>
        React.createElement(
          View,
          { key: `${label}-${i}`, style: styles.badge },
          React.createElement(Text, { style: styles.badgeText }, label)
        )
      )
    )
  );

  return React.createElement(
    View,
    {
      style: legacy ? styles.sectionLegacy : styles.section,
      // Yeni davranış: bölüm bütün halinde taşınır
      wrap: legacy ? true : false,
    },
    React.createElement(Text, titleProps, title),
    ...(legacy ? rowNodes : withFlowGaps(rowNodes, BADGE_ROW_GAP_PT, `${title}-rowgap`))
  );
}

function TestDoc({ fillerLines, legacy }) {
  const filler = [];
  for (let i = 1; i <= fillerLines; i++) {
    filler.push(
      React.createElement(
        Text,
        { key: i, style: legacy ? styles.lineLegacy : styles.line, wrap: false },
        `FILLER_${String(i).padStart(2, "0")} experience bullet line for pagination test`
      )
    );
  }
  const fillerSection = React.createElement(
    View,
    { key: "filler", style: legacy ? styles.sectionLegacy : styles.section },
    ...(legacy ? filler : withFlowGaps(filler, 3, "filler-gap"))
  );

  const blocks = [
    fillerSection,
    badgeSection("SKILLS_TITLE", SKILL_ROWS, { legacy }),
    badgeSection("LANGUAGES_TITLE", LANG_ROWS, { legacy }),
  ];

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.content },
        ...(legacy ? blocks : withFlowGaps(blocks, SECTION_GAP_PT, "section-gap"))
      )
    )
  );
}

async function analyze(buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const strings = [];
    let minY = Infinity;
    for (const item of content.items) {
      const str = (item.str || "").trim();
      if (!str) continue;
      strings.push(str);
      minY = Math.min(minY, item.transform[5]);
    }
    pages.push({ page: p, strings, lowestY: minY, freeBelowPt: minY - PAD_BOTTOM_PT });
  }
  return pages;
}

async function render(props) {
  const blob = await pdf(React.createElement(TestDoc, props)).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

/** Etiketin bulunduğu sayfa numarası (yoksa null) */
function pageOf(pages, label) {
  const found = pages.find((p) => p.strings.some((s) => s.includes(label)));
  return found ? found.page : null;
}

const FILLER_RANGE = [];
for (let n = 48; n >= 28; n -= 1) FILLER_RANGE.push(n);

async function sweep(legacy) {
  const rows = [];
  for (const fillerLines of FILLER_RANGE) {
    const pages = await analyze(await render({ fillerLines, legacy }));
    const titlePage = pageOf(pages, "SKILLS_TITLE");
    const labelPages = SKILL_ROWS.flat().map((label) => pageOf(pages, label));
    rows.push({
      fillerLines,
      page1FreePt: pages[0].freeBelowPt,
      titlePage,
      labelPages,
      isAtomic: labelPages.every((p) => p === titlePage),
      missing: labelPages.some((p) => p === null),
    });
  }
  return rows;
}

function report(name, rows) {
  console.log(`\n=== ${name} ===`);
  console.log("filler | skillsPage | atomik | 1.sayfa boşluk");
  rows.forEach((r) =>
    console.log(
      `  ${String(r.fillerLines).padStart(2)}   |     p${r.titlePage}     |  ${
        r.isAtomic ? "  ok " : " HAYIR"
      }  | ${r.page1FreePt.toFixed(1).padStart(6)}pt`
    )
  );
}

function findViolations(rows) {
  const notAtomic = rows.filter((r) => !r.isAtomic || r.missing);
  const nonMonotonic = [];
  for (let i = 1; i < rows.length; i++) {
    // rows[i] daha az dolgu = daha fazla boşluk → sayfa numarası artmamalı
    if (rows[i].titlePage > rows[i - 1].titlePage) {
      nonMonotonic.push({ from: rows[i - 1], to: rows[i] });
    }
  }
  return { notAtomic, nonMonotonic };
}

/**
 * Kuralların gerçek bileşende de geçerli olduğunu doğrular.
 * (Test yapıyı taklit eder; bu kontrol asıl dosyanın kurala uymasını garanti eder.)
 */
function assertSourceFollowsRules() {
  const file = path.join(ROOT, "src/components/cv-maker/PDFDocument.tsx");
  const src = fs.readFileSync(file, "utf8");

  // Yorumlarda geçebilir; yasak olan prop/stil olarak kullanımıdır
  assert.ok(
    !/minPresenceAhead\s*[=:]/.test(src),
    "PDFDocument.tsx: minPresenceAhead kullanılmamalı — sığan bölümü sonraki sayfaya atar"
  );

  const forbiddenMargins = [
    "marginBottom: CV_SECTION_GAP_PT",
    "marginBottom: CV_ITEM_GAP_PT",
    "marginBottom: CV_BULLET_GAP_PT",
  ];
  for (const pattern of forbiddenMargins) {
    assert.ok(
      !src.includes(pattern),
      `PDFDocument.tsx: "${pattern}" kullanılmamalı — boşluk PdfFlowGap ile bloklar arasına konur`
    );
  }

  assert.ok(
    src.includes("withFlowGaps(flowBlocks"),
    "PDFDocument.tsx: bölümler withFlowGaps ile render edilmeli"
  );

  console.log("✓ static: PDFDocument.tsx sayfalama kurallarına uyuyor");
}

async function main() {
  assertSourceFollowsRules();

  const legacyRows = await sweep(true);
  report("ESKİ: marginBottom + minPresenceAhead", legacyRows);
  const legacyViolations = findViolations(legacyRows);
  console.log(
    `  ihlal: atomik değil=${legacyViolations.notAtomic.length}, monoton değil=${legacyViolations.nonMonotonic.length}`
  );
  legacyViolations.nonMonotonic.forEach((v) =>
    console.log(
      `    filler ${v.from.fillerLines} (boşluk ${v.from.page1FreePt.toFixed(1)}pt) p${v.from.titlePage} → filler ${v.to.fillerLines} (boşluk ${v.to.page1FreePt.toFixed(1)}pt) p${v.to.titlePage}`
    )
  );

  const fixedRows = await sweep(false);
  report("YENİ: spacer boşluk + wrap={false} bölüm", fixedRows);
  const fixedViolations = findViolations(fixedRows);

  assert.strictEqual(
    fixedViolations.notAtomic.length,
    0,
    `Bölüm parçalandı veya rozet kayboldu: ${JSON.stringify(
      fixedViolations.notAtomic.map((r) => r.fillerLines)
    )}`
  );

  assert.strictEqual(
    fixedViolations.nonMonotonic.length,
    0,
    `Boşluk arttığı halde bölüm sonraki sayfaya kaçtı: ${fixedViolations.nonMonotonic
      .map(
        (v) =>
          `filler ${v.from.fillerLines}(p${v.from.titlePage}) → ${v.to.fillerLines}(p${v.to.titlePage}, boşluk ${v.to.page1FreePt.toFixed(1)}pt)`
      )
      .join("; ")}`
  );

  assert.ok(
    fixedRows.some((r) => r.titlePage === 1),
    "Beceriler bölümü hiçbir senaryoda 1. sayfada kalmadı"
  );

  console.log("\nOK: bölüm atomik taşınıyor ve yalnızca gerçekten sığmadığında sonraki sayfaya geçiyor.");
}

module.exports = { render, analyze, pageOf, SKILL_ROWS, LANG_ROWS, PAD_BOTTOM_PT };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
