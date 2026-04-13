import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas', '@thednp/dommatrix'],
  outputFileTracingIncludes: {
    '/api/extract-pdf-text': [
      './node_modules/pdf-parse/**/*',
      './node_modules/pdf-parse/node_modules/pdfjs-dist/**/*',
      './node_modules/pdfjs-dist/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    ],
  },
};

export default nextConfig;
