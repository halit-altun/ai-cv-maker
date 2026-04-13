import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

let domMatrixPathForChild: string | undefined;

/**
 * `node -e` / `[eval]` alt sürecinde bare `require('@scope/pkg')` güvenilir değil.
 * Lambda kökünde (`process.cwd()` → genelde `/var/task`) gerçek dosya yolunu üret.
 */
function getDomMatrixAbsolutePathForChild(): string {
  if (domMatrixPathForChild) return domMatrixPathForChild;

  const pkgDir = path.join(process.cwd(), 'node_modules', '@thednp', 'dommatrix');
  const pkgJson = path.join(pkgDir, 'package.json');
  if (existsSync(pkgJson)) {
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as { main?: string };
    const rel = pkg.main ?? 'dist/dommatrix.cjs';
    const entry = path.join(pkgDir, rel);
    if (existsSync(entry)) {
      domMatrixPathForChild = path.normalize(entry);
      return domMatrixPathForChild;
    }
  }

  domMatrixPathForChild = path.normalize(require.resolve('@thednp/dommatrix'));
  return domMatrixPathForChild;
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

/** Alt süreç betiğinin başına eklenecek IIFE (mutlak require yolu). */
export function getPdfParseChildGlobalsIife(): string {
  const domPath = getDomMatrixAbsolutePathForChild();
  return `(function(){var g=globalThis;if(typeof g.DOMMatrix!=="undefined")return;var impl=require(${JSON.stringify(domPath)});g.DOMMatrix=impl&&impl.default?impl.default:impl;})();`;
}

installPdfNodeGlobals();
