import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/cv-maker-ai',
        destination: '/my-cvs/ai-cv-builder/new',
        permanent: true,
      },
      {
        source: '/cv-maker-ai/:path*',
        destination: '/my-cvs/ai-cv-builder/new',
        permanent: true,
      },
      {
        source: '/my-cvs/ai-cv-builder/new/:id',
        destination: '/my-cvs/ai-cv-builder/edit/:id',
        permanent: true,
      },
    ];
  },
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
