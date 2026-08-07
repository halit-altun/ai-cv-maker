/** Uygulama rotaları — sidebar, CTA ve footer için */
export const appRoutes = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  myCvs: '/my-cvs',
  aiOptimizer: '/company-based-cv-editor',
  aiOptimizerBulk: '/company-based-cv-editor/bulk',
  todoApplications: '/todo-applications',
  outreachLogs: '/outreach-logs',
  outreachProjects: '/outreach-projects',
  mailTracking: '/mail-tracking',
  profile: '/profile',
  settings: '/settings',
  help: '/help',
  /** Yeni CV — AI CV Builder */
  createCv: '/my-cvs/ai-cv-builder/new',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  logout: '#',
} as const;

/** To Do proje detay yolu */
export function getTodoProjectPath(projectId: string): string {
  return `/todo-applications/${encodeURIComponent(projectId)}`;
}

/** Dashboard shell kullanılmayan auth sayfaları */
export const authShellExemptPaths = [
  appRoutes.login,
  appRoutes.register,
  appRoutes.forgotPassword,
  appRoutes.resetPassword,
] as const;

export function isAuthShellExemptPath(pathname: string): boolean {
  return authShellExemptPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/** Mevcut CV düzenleme yolu */
export function getEditCvPath(cvId: string): string {
  return `/my-cvs/ai-cv-builder/edit/${cvId}`;
}
