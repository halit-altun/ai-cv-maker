import './installPdfDomPolyfills';

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PDFParse } from 'pdf-parse';

/**
 * Next.js paketlemesi `createRequire(...).resolve('pdf-parse')` sonucunu bazen
 * sayısal modül kimliğine çevirir; `path.dirname` bu yüzden patlar.
 * Bu yüzden `node_modules` konumu dosya sistemi + `process.cwd()` ile bulunur.
 */
function resolvePdfParseInstallRoot(): string {
  const cwd = process.cwd();
  const direct = join(cwd, 'node_modules', 'pdf-parse');
  if (existsSync(join(direct, 'package.json'))) {
    return direct;
  }

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 24; i++) {
    const candidate = join(dir, 'node_modules', 'pdf-parse', 'package.json');
    if (existsSync(candidate)) {
      return join(dir, 'node_modules', 'pdf-parse');
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error('pdf-parse kurulum dizini bulunamadı (node_modules/pdf-parse).');
}

/**
 * pdf-parse, kendi bağımlılığı olarak ayrı bir pdfjs-dist kopyası kullanır.
 * GlobalWorkerOptions.workerSrc bu kopyadaki worker dosyasına işaret etmeli;
 * aksi halde üst seviyedeki (farklı sürüm) pdfjs-dist veya trace edilmemiş
 * dosyalar Netlify / serverless ortamında hata üretir.
 */
function resolvePdfWorkerHref(): string {
  const pdfParseRoot = resolvePdfParseInstallRoot();
  const nestedWorker = join(pdfParseRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');
  if (existsSync(nestedWorker)) {
    return pathToFileURL(nestedWorker).href;
  }

  const topWorker = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');
  if (existsSync(topWorker)) {
    return pathToFileURL(topWorker).href;
  }

  throw new Error(
    `pdf.worker.mjs bulunamadı. Denenen yollar: ${nestedWorker} | ${topWorker}`
  );
}

let workerConfigured = false;

function ensurePdfWorkerConfigured(): void {
  if (workerConfigured) {
    return;
  }
  PDFParse.setWorker(resolvePdfWorkerHref());
  workerConfigured = true;
}

export async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  ensurePdfWorkerConfigured();

  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText({
      pageJoiner: 'page_number:page_number/total_number:total_number',
    });
    return (parsed?.text ?? '').toString();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
