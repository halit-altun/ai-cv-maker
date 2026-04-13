import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

let cachedPdfWorkerSrcHref: string | undefined;

/**
 * pdfjs Node fake-worker `import(workerSrc)` için mutlak `file:` URL.
 * Göreli `./pdf.worker.mjs` Netlify trace'inde kırılır; `pdf.worker.min.mjs` yolunu sabitliyoruz.
 */
export function getPdfJsWorkerSrcHref(): string {
  if (cachedPdfWorkerSrcHref) return cachedPdfWorkerSrcHref;

  const cwd = process.cwd();
  const relPaths = [
    ['node_modules', 'pdf-parse', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs'],
    ['node_modules', 'pdf-parse', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'],
    ['node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'],
    ['node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs']
  ];

  for (const segs of relPaths) {
    const file = path.join(cwd, ...segs);
    if (existsSync(file)) {
      cachedPdfWorkerSrcHref = pathToFileURL(file).href;
      return cachedPdfWorkerSrcHref;
    }
  }

  try {
    const resolved = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
    cachedPdfWorkerSrcHref = pathToFileURL(resolved).href;
    return cachedPdfWorkerSrcHref;
  } catch {
    // yok
  }

  throw new Error(
    'pdf.worker.min.mjs bulunamadı (pdf-parse/pdfjs-dist). Netlify deploy kökünde node_modules kontrol edin.'
  );
}

/**
 * pdfjs-dist (pdf-parse üzerinden) bazı Node / serverless ortamlarında
 * tarayıcı global'lerini bekler; Netlify Functions'ta `DOMMatrix` yoktur.
 */
export function installPdfNodeGlobals(): void {
  if (typeof globalThis.DOMMatrix !== 'undefined') return;
  const impl = require('@thednp/dommatrix') as typeof globalThis.DOMMatrix;
  Object.assign(globalThis, { DOMMatrix: impl });
}

installPdfNodeGlobals();
