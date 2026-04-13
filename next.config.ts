import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', '@thednp/dommatrix', '@napi-rs/canvas'],
  // Netlify / Vercel: pdf-parse → pdfjs fake-worker `import(workerSrc)` için worker dosyaları trace'e girmez.
  outputFileTracingIncludes: {
    '/api/extract-pdf-text': [
      './node_modules/pdf-parse/node_modules/pdfjs-dist/legacy/build/**/*',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker*.mjs',
      './node_modules/pdfjs-dist/build/pdf.worker*.mjs'
    ]
  }
};

export default nextConfig;
