/**
 * ATS PDF encoding regression.
 *
 * ChatGPT/ATS specified: visually fine English CV, but extraction drops/corrupts
 * letters (University→niversity, Unit→nit, Languages→Lan$ua$es).
 *
 * Root cause: fontkit caches glyphs by id. Turkish composites (Ü, ğ) call
 * getGlyph(U/g) without codePoints; the next English PDF then embeds empty
 * ToUnicode for those letters. All create/edit/company/bulk paths share
 * PDFDocument + Font.register, so one sequential render reproduces it.
 *
 * Çalıştır: npm run test:pdf-ats-encoding
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath, pathToFileURL } from 'url';
import React from 'react';
import { Font, pdf } from '@react-pdf/renderer';
import fontkit from 'fontkit';
import { PDFParse } from 'pdf-parse';
import PDFDocument from '../src/components/cv-maker/PDFDocument';
import { sanitizeCvDataForPdf } from '../src/components/cv-maker/sanitizeCvDataForPdf';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(ROOT, 'public', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'Carlito-Regular.ttf');

const PATCH_FILES = {
  fontkit: path.join(ROOT, 'patches', 'fontkit+2.0.4.patch'),
  pdfkit: path.join(ROOT, 'patches', '@react-pdf+pdfkit+4.1.0.patch'),
  textkit: path.join(ROOT, 'patches', '@react-pdf+textkit+6.1.0.patch'),
};

const TEXTKIT_JS = path.join(ROOT, 'node_modules', '@react-pdf', 'textkit', 'lib', 'textkit.js');
const FONTKIT_MAIN = path.join(ROOT, 'node_modules', 'fontkit', 'dist', 'main.cjs');
const PDFKIT_JS = path.join(ROOT, 'node_modules', '@react-pdf', 'pdfkit', 'lib', 'pdfkit.js');

Font.register({
  family: 'Calibri',
  fonts: [{ src: path.join(FONT_DIR, 'Carlito-Regular.ttf'), fontWeight: 400 }],
});
Font.registerHyphenationCallback((word) => [word.replace(/\u00AD/g, '')]);

const REQUIRED_ENGLISH = [
  'Yıldız Technical University',
  'Information Technologies and Cyber Security Unit',
  'Information Technologies',
  'Languages',
  'University',
  'Unit',
  '10/2020',
  '06/2024',
] as const;

const FORBIDDEN_ENGLISH = [
  'Lan$ua$es',
  'Lan ua es',
  'Lan$ua es',
  '(ni)ersity',
  'Infor*ation',
  '(nit',
  '202+',
] as const;

/** ATS son tarama: TR + EN harfler, rakamlar, CV sembolleri. */
const CHARSET_TR = 'çğıöşüÇĞİÖŞÜ';
const CHARSET_EN_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARSET_EN_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const CHARSET_DIGITS = '0123456789';
const CHARSET_SYMBOLS = "+-/:;.,@%&#()'?!=_";
const CHARSET_ALL = `${CHARSET_TR}${CHARSET_EN_UPPER}${CHARSET_EN_LOWER}${CHARSET_DIGITS}${CHARSET_SYMBOLS}`;
const CHARSET_PROBE = `TR ${CHARSET_TR} EN ${CHARSET_EN_UPPER}${CHARSET_EN_LOWER} 09 ${CHARSET_DIGITS} SY ${CHARSET_SYMBOLS}`;

type SampleCv = Parameters<typeof sanitizeCvDataForPdf>[0];

function englishCv(): SampleCv {
  return {
    personalInfo: {
      firstName: 'Halit',
      lastName: 'ALTUN',
      title: 'Full Stack Web Developer',
      country: 'Turkey',
      city: 'Istanbul',
      phone: '+90 531 382 50 79',
      email: 'halitaltun002@gmail.com',
      portfolio: 'https://halitaltun.netlify.app',
      github: 'https://github.com/halit-altun',
      linkedin: 'https://linkedin.com/in/halit-altun-923207258',
      includePhoto: false,
      photoUrl: '',
    },
    about:
      'Analytical full stack developer focused on secure web platforms, marketplace integrations and maintainable TypeScript services.',
    workExperience: [
      {
        id: '1',
        position: 'Full Stack Web Developer',
        company: 'Pronist Software and Consulting',
        city: 'Istanbul',
        country: 'Turkey',
        startDate: '2025-01',
        endDate: 'Present',
        bulletPoints: [
          'Built marketplace integrations for Amazon, Trendyol and Hepsiburada.',
          'Implemented JWT authentication and role-based access control.',
        ],
      },
      {
        id: '2',
        position: 'Intern / Backend Web Developer',
        company: 'Information Technologies and Cyber Security Unit',
        city: 'Istanbul',
        country: 'Turkey',
        startDate: '2023-08',
        endDate: '2023-10',
        bulletPoints: [
          'Developed a multi-layer web app with .NET Core Identity.',
        ],
      },
    ],
    education: [
      {
        id: '1',
        university: 'Yıldız Technical University',
        department: 'Computer Engineering',
        startDate: '2020-10',
        endDate: '2024-06',
      },
    ],
    skills: ['React', 'TypeScript', 'Next.js', '.NET', 'SQL Server'],
    languages: [
      { id: '1', language: 'Turkish', level: 'Native' },
      { id: '2', language: 'English', level: 'Professional' },
    ],
  };
}

function turkishCv(): SampleCv {
  return {
    personalInfo: {
      firstName: 'Halit',
      lastName: 'ALTUN',
      title: 'Full Stack Web Developer',
      country: 'Türkiye',
      city: 'İstanbul',
      phone: '+90 531 382 50 79',
      email: 'halitaltun002@gmail.com',
      portfolio: 'https://halitaltun.netlify.app',
      github: 'https://github.com/halit-altun',
      linkedin: 'https://linkedin.com/in/halit-altun-923207258',
      includePhoto: false,
      photoUrl: '',
    },
    about:
      'Gelişime açık, analitik ve yenilikçi bir full stack web developer olarak çalışıyorum. Öğrenci işleri ve üniversite süreçlerinde güvenli çözümler üretirim.',
    workExperience: [
      {
        id: '1',
        position: 'Full Stack Web Developer',
        company: 'Pronist Yazılım ve Danışmanlık',
        city: 'İstanbul',
        country: 'Türkiye',
        startDate: '2025-01',
        endDate: 'Present',
        bulletPoints: [
          'Çoklu pazaryeri entegrasyonlarını geliştirdim ve operasyonel süreçleri hızlandırdım.',
        ],
      },
      {
        id: '2',
        position: 'Stajyer / Backend Web Developer',
        company: 'Yıldız Teknik Üniversitesi',
        city: 'İstanbul',
        country: 'Türkiye',
        startDate: '2023-08',
        endDate: '2023-10',
        bulletPoints: [
          '.NET Core Identity ile çok katmanlı web uygulaması geliştirdim.',
        ],
      },
    ],
    education: [
      {
        id: '1',
        university: 'Biruni Üniversitesi',
        department: 'Bilgisayar Mühendisliği',
        startDate: '2020-10',
        endDate: '2024-06',
      },
    ],
    skills: ['React', 'TypeScript', 'Next.js'],
    languages: [{ id: '1', language: 'Türkçe', level: 'Ana dil' }],
  };
}

function charsetCv(): SampleCv {
  return {
    personalInfo: {
      firstName: CHARSET_TR,
      lastName: CHARSET_EN_UPPER.slice(0, 13),
      title: CHARSET_PROBE,
      country: 'Türkiye',
      city: 'İstanbul',
      phone: '+90 531 382 50 79',
      email: 'charset.test@example.com',
      portfolio: 'https://example.com/a-z_09',
      github: 'https://github.com/charset-az',
      linkedin: 'https://linkedin.com/in/charset-az',
      includePhoto: false,
      photoUrl: '',
    },
    about: CHARSET_PROBE,
    workExperience: [
      {
        id: '1',
        position: CHARSET_PROBE,
        company: CHARSET_PROBE,
        city: 'İstanbul',
        country: 'Türkiye',
        startDate: '2010-03',
        endDate: '2024-07',
        bulletPoints: [CHARSET_PROBE, `Ligatures: solutions workflow finishing office ${CHARSET_DIGITS}`],
      },
    ],
    education: [
      {
        id: '1',
        university: CHARSET_PROBE,
        department: CHARSET_PROBE,
        startDate: '2018-09',
        endDate: '2022-06',
      },
    ],
    skills: [CHARSET_TR, CHARSET_EN_UPPER, CHARSET_EN_LOWER, CHARSET_DIGITS, CHARSET_SYMBOLS],
    languages: [{ id: '1', language: CHARSET_TR, level: CHARSET_DIGITS }],
  };
}

function normalizeExtracted(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text ?? '');
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
}

function inflatePdfStreams(buffer: Buffer): string[] {
  const latin = buffer.toString('latin1');
  const chunks: string[] = [];
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(latin))) {
    const raw = Buffer.from(match[1], 'latin1');
    for (const fn of [zlib.inflateSync, zlib.inflateRawSync]) {
      try {
        chunks.push(fn(raw).toString('latin1'));
        break;
      } catch {
        /* not this flate variant */
      }
    }
  }
  return chunks;
}

function assertToUnicodeMapsLetters(buffer: Buffer) {
  const inflated = inflatePdfStreams(buffer).join('\n');
  const cmaps = inflated.match(/begincmap[\s\S]*?endcmap/g) ?? [];
  assert.ok(cmaps.length > 0, 'PDF ToUnicode CMap bulunamadı (ATS Identity-H metin katmanı yok).');

  const mapped = new Set<string>();
  let emptyDest = 0;
  for (const cmap of cmaps) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g;
    let pair: RegExpExecArray | null;
    while ((pair = pairRe.exec(cmap))) {
      const dest = pair[2];
      if (!dest) {
        emptyDest += 1;
        continue;
      }
      for (let i = 0; i < dest.length; i += 4) {
        const unit = Number.parseInt(dest.slice(i, i + 4), 16);
        if (unit) mapped.add(String.fromCharCode(unit));
      }
    }
  }

  assert.ok(mapped.has('U'), 'ToUnicode içinde U yok — ATS University kelimesini kaybeder.');
  assert.ok(mapped.has('g'), 'ToUnicode içinde g yok — ATS Languages kelimesini $ ile bozar.');
  assert.ok(mapped.has('L'), 'ToUnicode içinde L yok.');
  assert.strictEqual(
    emptyDest,
    0,
    `ToUnicode boş bfchar hedefi var (${emptyDest}). ATS bu CID'leri $ veya boşluğa çevirir.`
  );
  assert.ok(
    !cmaps.some((cmap) => /<[0-9a-fA-F]+><[0-9a-fA-F]+ [0-9a-fA-F]/.test(cmap)),
    'ToUnicode dest hex içinde boşluk var — ligature CMap parse kırılır.'
  );
  console.log('✓ ToUnicode CMap maps U/g/L and has no empty destinations');
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  const pdfjsRoot = path.join(ROOT, 'node_modules', 'pdf-parse', 'node_modules', 'pdfjs-dist');
  const { getDocument, GlobalWorkerOptions } = await import(
    pathToFileURL(path.join(pdfjsRoot, 'legacy', 'build', 'pdf.mjs')).href
  );
  GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs')
  ).href;

  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;
  let text = '';
  try {
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text +=
        content.items.map((item: { str?: string }) => item.str ?? '').join(' ') + '\n';
    }
  } finally {
    await doc.destroy();
  }
  return text;
}

async function renderCvPdf(data: SampleCv, isEnglish: boolean): Promise<Buffer> {
  const document = React.createElement(PDFDocument, {
    data: sanitizeCvDataForPdf(data),
    isEnglish,
  }) as Parameters<typeof pdf>[0];
  const blob = await pdf(document).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

function assertEnglishExtraction(label: string, extracted: string) {
  const normalized = normalizeExtracted(extracted);
  console.log(`  [${label}]`, normalized.slice(0, 280));

  for (const phrase of REQUIRED_ENGLISH) {
    assert.ok(
      normalized.includes(phrase),
      `${label}: ATS extract eksik "${phrase}". Ham: ${normalized}`
    );
  }
  for (const bad of FORBIDDEN_ENGLISH) {
    assert.ok(!normalized.includes(bad), `${label}: bozuk ATS imzası bulundu: "${bad}"`);
  }
  assert.ok(
    !normalized.includes('$'),
    `${label}: extract içinde $ var (ToUnicode boş/fallback). Ham: ${normalized}`
  );
  assert.ok(
    !normalized.includes('*'),
    `${label}: extract içinde * var (Infor*ation / ligature). Ham: ${normalized}`
  );
  assert.ok(
    !extracted.includes('\uD835'),
    `${label}: matematiksel italic Unicode var (italic TTF fallback).`
  );
  assert.match(
    normalized,
    /\bUniversity\b/,
    `${label}: University kelime sınırıyla yok (U düşmüş olabilir).`
  );
  assert.match(normalized, /\bUnit\b/, `${label}: Unit kelime sınırıyla yok.`);
  assert.match(normalized, /\bLanguages\b/, `${label}: Languages yok.`);
}

function assertPatchesApplied() {
  for (const [name, file] of Object.entries(PATCH_FILES)) {
    assert.ok(fs.existsSync(file), `patch yok: ${name} → ${file}`);
  }
  const fontkitSrc = fs.readFileSync(FONTKIT_MAIN, 'utf8');
  assert.ok(
    fontkitSrc.includes('cachedGlyph.codePoints = characters'),
    'fontkit getGlyph yaması yok (npm install / patch-package).'
  );
  const pdfkitSrc = fs.readFileSync(PDFKIT_JS, 'utf8');
  assert.ok(
    pdfkitSrc.includes('glyphCodePoints(glyph)'),
    'pdfkit ToUnicode fallback yaması yok.'
  );
  assert.ok(
    pdfkitSrc.includes("encoded.join('')"),
    'pdfkit ToUnicode hex join yaması yok (boşluklu dest CMap zehirler).'
  );
  const textkitSrc = fs.readFileSync(TEXTKIT_JS, 'utf8');
  assert.ok(
    textkitSrc.includes('fillEmptyGlyphCodePoints'),
    'textkit empty codePoints yaması yok.'
  );
  assert.ok(
    textkitSrc.includes('kern: false'),
    'textkit kern/frac ATS feature yaması yok.'
  );
  console.log('✓ static: fontkit + pdfkit + textkit ATS encoding patches applied');
}

function assertFontkitCacheRepair() {
  const font = fontkit.openSync(FONT_REGULAR);
  for (const gid of [38, 93, 21, 1140, 100]) {
    font.getGlyph(gid);
  }
  const run = font.layout(
    'Yıldız Technical University Languages Unit',
    { liga: false, clig: false, dlig: false, hlig: false, calt: false },
    undefined,
    undefined,
    'ltr'
  );
  const text = run.glyphs.map((g: { codePoints?: number[] }) =>
    String.fromCodePoint(...(g.codePoints ?? []))
  ).join('');
  assert.strictEqual(
    text,
    'Yıldız Technical University Languages Unit',
    `fontkit cache onarılmadı. layout çıktısı: ${JSON.stringify(text)}`
  );
  console.log('✓ unit: fontkit restores U/g codePoints after getGlyph prime');
}

function assertTurkishHeadings(label: string, extracted: string) {
  const normalized = normalizeExtracted(extracted);
  const required = [
    'Hakkımda',
    'Eğitim',
    'Beceriler',
    'Diller',
    'Full Stack Web Developer',
    'Stajyer / Backend Web Developer',
    'Biruni Üniversitesi',
  ];
  for (const phrase of required) {
    assert.ok(
      normalized.includes(phrase),
      `${label}: kalın başlık/unvan ATS extract'te yok: "${phrase}". Ham: ${normalized}`
    );
  }
  assert.ok(
    !normalized.includes('#$iti'),
    `${label}: Eğitim başlığı #$iti bozulması (Bold ToUnicode).`
  );
}

function missingCharsetChars(extracted: string): string[] {
  const missing: string[] = [];
  for (const ch of CHARSET_ALL) {
    if (!extracted.includes(ch)) missing.push(ch);
  }
  return missing;
}

function assertCharsetExtraction(label: string, extracted: string) {
  const missing = missingCharsetChars(extracted);
  assert.deepStrictEqual(
    missing,
    [],
    `${label}: ATS extract eksik karakterler = [${missing
      .map((c) => `${c} U+${c.codePointAt(0)!.toString(16).toUpperCase()}`)
      .join(', ')}]. Ham: ${normalizeExtracted(extracted).slice(0, 500)}`
  );
  console.log(`✓ charset: ${label} keeps TR/EN/digits/symbols (${CHARSET_ALL.length} chars)`);
}

function assertToUnicodeMapsCharset(buffer: Buffer) {
  const inflated = inflatePdfStreams(buffer).join('\n');
  const cmaps = inflated.match(/begincmap[\s\S]*?endcmap/g) ?? [];
  assert.ok(cmaps.length > 0, 'Charset PDF ToUnicode CMap yok.');
  const mapped = new Set<string>();
  for (const cmap of cmaps) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g;
    let pair: RegExpExecArray | null;
    while ((pair = pairRe.exec(cmap))) {
      const dest = pair[2];
      if (!dest) continue;
      for (let i = 0; i < dest.length; i += 4) {
        const unit = Number.parseInt(dest.slice(i, i + 4), 16);
        if (unit) mapped.add(String.fromCharCode(unit));
      }
    }
  }
  const missing = [...CHARSET_ALL].filter((ch) => !mapped.has(ch));
  assert.deepStrictEqual(
    missing,
    [],
    `ToUnicode charset eksik: [${missing
      .map((c) => `${c} U+${c.codePointAt(0)!.toString(16).toUpperCase()}`)
      .join(', ')}]`
  );
  console.log('✓ ToUnicode CMap maps full TR/EN/digit/symbol charset');
}

function assertNoEmbeddedBoldOrItalic(buffer: Buffer, label: string) {
  const latin = buffer.toString('latin1');
  assert.ok(
    !latin.includes('Carlito-Bold'),
    `${label}: Carlito-Bold gömülü — kalın satırlar ATS'de sembole döner.`
  );
  assert.ok(
    !latin.includes('Carlito-Italic'),
    `${label}: Carlito-Italic gömülü.`
  );
}

async function assertSequentialPdfDocumentExtraction() {
  const turkishBuf = await renderCvPdf(turkishCv(), false);
  assert.ok(turkishBuf.length > 1000, 'Türkçe PDF üretilemedi');
  assertNoEmbeddedBoldOrItalic(turkishBuf, 'turkish');
  const turkishParse = await extractWithPdfParse(turkishBuf);
  assertTurkishHeadings('pdf-parse TR', turkishParse);
  assertTurkishHeadings('pdfjs TR', await extractWithPdfJs(turkishBuf));
  console.log('✓ pdf 1/2: Turkish headings/titles extract (no Bold TTF)');

  const englishBuf = await renderCvPdf(englishCv(), true);
  assert.ok(englishBuf.length > 1000, 'İngilizce PDF üretilemedi');
  assertNoEmbeddedBoldOrItalic(englishBuf, 'english');

  const pdfParseText = await extractWithPdfParse(englishBuf);
  assertEnglishExtraction('pdf-parse', pdfParseText);

  assertToUnicodeMapsLetters(englishBuf);
  assertEnglishExtraction('pdfjs', await extractWithPdfJs(englishBuf));

  const englishAgain = await renderCvPdf(englishCv(), true);
  assertEnglishExtraction('pdf-parse 3rd render', await extractWithPdfParse(englishAgain));

  console.log('✓ dynamic: sequential TR→EN→EN PDFDocument extraction keeps U/g/Languages');

  const charsetTr = await renderCvPdf(charsetCv(), false);
  const charsetEn = await renderCvPdf(charsetCv(), true);
  assertNoEmbeddedBoldOrItalic(charsetTr, 'charset-tr');
  assertNoEmbeddedBoldOrItalic(charsetEn, 'charset-en');
  assertToUnicodeMapsCharset(charsetTr);
  assertCharsetExtraction('pdf-parse TR charset', await extractWithPdfParse(charsetTr));
  assertCharsetExtraction('pdfjs TR charset', await extractWithPdfJs(charsetTr));
  assertCharsetExtraction('pdf-parse EN charset', await extractWithPdfParse(charsetEn));
  assertCharsetExtraction('pdfjs EN charset', await extractWithPdfJs(charsetEn));
}

async function main() {
  assertPatchesApplied();
  assertFontkitCacheRepair();
  await assertSequentialPdfDocumentExtraction();
  console.log('\nAll ATS encoding regression checks passed.');
}

void main().catch((err) => {
  console.error('\nATS encoding regression FAILED:\n', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
