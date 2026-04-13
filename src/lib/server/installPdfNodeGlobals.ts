import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

let cachedPdfWorkerSrcHref: string | undefined;

const workerBasenames = ['pdf.worker.min.mjs', 'pdf.worker.mjs'] as const;

function workerCandidatesFromDir(baseDir: string): string[] {
  const out: string[] = [];
  for (const name of workerBasenames) {
    out.push(
      path.join(baseDir, 'node_modules', 'pdf-parse', 'node_modules', 'pdfjs-dist', 'legacy', 'build', name),
      path.join(baseDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build', name),
      path.join(baseDir, 'node_modules', 'pdfjs-dist', 'build', name)
    );
  }
  return out;
}

function findExistingWorkerFile(): string | undefined {
  const tried = new Set<string>();

  const consider = (file: string) => {
    const n = path.normalize(file);
    if (tried.has(n)) return undefined;
    tried.add(n);
    return existsSync(n) ? n : undefined;
  };

  for (const file of workerCandidatesFromDir(process.cwd())) {
    const hit = consider(file);
    if (hit) return hit;
  }

  // Derlenmiş chunk konumundan (/var/task/.next/server/...) köke doğru çık
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 16; i++) {
      for (const file of workerCandidatesFromDir(dir)) {
        const hit = consider(file);
        if (hit) return hit;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // import.meta.url yoksa atla
  }

  try {
    const resolved = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
    return consider(resolved);
  } catch {
    // yok
  }

  return undefined;
}

/**
 * pdfjs Node fake-worker `import(workerSrc)` için mutlak `file:` URL.
 * Göreli `./pdf.worker.mjs` Netlify trace'inde kırılır; gerçek dosya yolunu buluruz.
 */
export function getPdfJsWorkerSrcHref(): string {
  if (cachedPdfWorkerSrcHref) return cachedPdfWorkerSrcHref;

  const found = findExistingWorkerFile();
  if (!found) {
    throw new Error(
      'pdf.worker*.mjs bulunamadı. next.config.ts içinde outputFileTracingIncludes ile worker dosyalarını ekleyin ve yeniden deploy edin.'
    );
  }

  cachedPdfWorkerSrcHref = pathToFileURL(found).href;
  return cachedPdfWorkerSrcHref;
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
