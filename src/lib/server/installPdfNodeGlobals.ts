import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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
