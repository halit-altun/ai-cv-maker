/**
 * CareerAI Dashboard design tokens (HTML tasarımından birebir).
 * Ortak stiller tek kaynaktan yönetilir.
 */
export const dashboardTokens = {
  sidebarWidth: 256,
  contentMaxWidth: 1280,
  topBarHeight: 64,
  colors: {
    background: '#f7f9fb',
    surface: '#f7f9fb',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f2f4f6',
    surfaceContainer: '#eceef0',
    surfaceContainerHigh: '#e6e8ea',
    surfaceContainerHighest: '#e0e3e5',
    onSurface: '#191c1e',
    onSurfaceVariant: '#45464d',
    outline: '#76777d',
    outlineVariant: '#c6c6cd',
    primary: '#000000',
    onPrimary: '#ffffff',
    primaryContainer: '#131b2e',
    onPrimaryContainer: '#7c839b',
    onPrimaryFixed: '#131b2e',
    secondary: '#4648d4',
    onSecondary: '#ffffff',
    secondaryContainer: '#6063ee',
    onSecondaryContainer: '#fffbff',
    secondaryFixed: '#e1e0ff',
    secondaryFixedDim: '#c0c1ff',
    onSecondaryFixed: '#07006c',
    onSecondaryFixedVariant: '#2f2ebe',
    tertiaryFixedDim: '#d0bcff',
    tertiaryFixed: '#e9ddff',
    onTertiaryContainer: '#9466ff',
    inverseSurface: '#2d3133',
    inverseOnSurface: '#eff1f3',
    error: '#ba1a1a',
  },
  gradients: {
    aiBorder: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    aiGlowBorder: 'linear-gradient(to right, #6366F1, #9466ff)',
    aiFab: 'linear-gradient(135deg, #4648d4, #9466ff)',
  },
  shadows: {
    aiGlow: '0 0 20px -5px rgba(99, 102, 241, 0.2)',
    fab: '0 8px 24px rgba(99, 102, 241, 0.35)',
  },
  fonts: {
    display:
      'var(--font-plus-jakarta), "Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    body: 'var(--font-inter), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
} as const;

export type DashboardTokens = typeof dashboardTokens;
