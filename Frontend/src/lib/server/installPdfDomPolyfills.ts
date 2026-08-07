import DOMMatrix from '@thednp/dommatrix';

const g = globalThis as typeof globalThis & { DOMMatrix?: typeof DOMMatrix };

if (typeof g.DOMMatrix === 'undefined') {
  g.DOMMatrix = DOMMatrix as typeof g.DOMMatrix;
}
