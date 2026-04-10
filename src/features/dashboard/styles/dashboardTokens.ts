/** Dashboard’a özgü tekrarlayan stil sabitleri (MUI sx ile uyumlu) */
export const dashboardTokens = {
  sidebarWidth: 268,
  contentMaxWidth: 1280,
  cardRadius: 2,
  sectionGap: 3,
  subtleBorder: '1px solid',
  /** Mobil drawer üst bandı — yumuşak pastel */
  mobileDrawerHeaderBg:
    'linear-gradient(135deg, rgba(227, 242, 253, 0.98) 0%, rgba(237, 231, 246, 0.95) 50%, rgba(255, 248, 225, 0.35) 100%)',
  /** Dashboard mobil üst şerit */
  mobileTopBarBg:
    'linear-gradient(90deg, rgba(236, 245, 252, 0.92) 0%, rgba(250, 251, 253, 0.98) 55%, rgba(245, 248, 252, 1) 100%)',
  mobileTopBarBorder: '1px solid rgba(25, 118, 210, 0.1)',
  drawerPaperBg: '#fafbfd',
  shellBg: '#ffffff',
  contentFrameShadow: '0 0 0 1px rgba(15, 23, 42, 0.04), 0 16px 48px rgba(15, 23, 42, 0.06)',
} as const;
