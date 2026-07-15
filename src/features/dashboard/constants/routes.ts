/** Uygulama rotaları — sidebar, CTA ve footer için */
export const appRoutes = {
  home: '/',
  dashboard: '/dashboard',
  myCvs: '/my-cvs',
  aiOptimizer: '/company-based-cv-editor',
  settings: '/settings',
  help: '/help',
  /** Yeni CV — AI CV Builder */
  createCv: '/my-cvs/ai-cv-builder/new',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  logout: '#',
} as const;

/** Mevcut CV düzenleme yolu */
export function getEditCvPath(cvId: string): string {
  return `/my-cvs/ai-cv-builder/edit/${cvId}`;
}
