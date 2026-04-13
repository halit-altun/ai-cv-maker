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

/**
 * `node -e` alt süreci ayrı global scope kullanır; ana süreçteki polyfill yetmez.
 */
export const PDF_PARSE_CHILD_GLOBALS_IIFE = `(function(){var g=globalThis;if(typeof g.DOMMatrix!=="undefined")return;var impl=require(${JSON.stringify(
  '@thednp/dommatrix'
)});g.DOMMatrix=impl&&impl.default?impl.default:impl;})();`;

installPdfNodeGlobals();
