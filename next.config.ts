import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Route handler içinde `pdf-parse` native/transitif bağımlılıklarıyla birlikte
  // Node üzerinde `require`/`import` ile yüklenir; aksi halde bundler + Netlify
  // function içinde çözümleme hataları oluşabilir.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
