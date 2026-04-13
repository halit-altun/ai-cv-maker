import './installPdfDomPolyfills';

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { PDFParse } from 'pdf-parse';

const nodeRequire = createRequire(import.meta.url);

/**
 * pdf-parse, kendi bağımlılığı olarak ayrı bir pdfjs-dist kopyası kullanır.
 * GlobalWorkerOptions.workerSrc bu kopyadaki worker dosyasına işaret etmeli;
 * aksi halde üst seviyedeki (farklı sürüm) pdfjs-dist veya trace edilmemiş
 * dosyalar Netlify / serverless ortamında hata üretir.
 */
function resolvePdfWorkerHref(): string {
  const entry = nodeRequire.resolve('pdf-parse');
  let dir = dirname(entry);
  for (let i = 0; i < 10; i++) {
    const workerFile = join(dir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');
    if (existsSync(workerFile)) {
      return pathToFileURL(workerFile).href;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  const pdfjsRoot = dirname(nodeRequire.resolve('pdfjs-dist/package.json'));
  const fallbackFile = join(pdfjsRoot, 'build', 'pdf.worker.mjs');
  if (!existsSync(fallbackFile)) {
    throw new Error(`pdf.worker.mjs not found at ${fallbackFile}`);
  }
  return pathToFileURL(fallbackFile).href;
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
