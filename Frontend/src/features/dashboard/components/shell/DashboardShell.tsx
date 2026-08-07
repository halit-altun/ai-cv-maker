'use client';

import { useState } from 'react';
import { Box, Drawer } from '@mui/material';
import { usePathname } from 'next/navigation';
import { dashboardTokens } from '../../styles/dashboardTokens';
import type { DashboardSidebarLink } from '../../types';
import { SidebarNav } from './SidebarNav';
import { DashboardTopBar } from './DashboardTopBar';
import { DashboardFooter } from './DashboardFooter';

interface DashboardShellProps {
  primaryNav: DashboardSidebarLink[];
  footerNav: DashboardSidebarLink[];
  avatarUrl: string;
  accountLabel?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  primaryNav,
  footerNav,
  avatarUrl,
  accountLabel,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const { colors, sidebarWidth, contentMaxWidth } = dashboardTokens;
  const isCvEditor = pathname.includes('/ai-cv-builder/');

  const closeMobile = () => setMobileOpen(false);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: colors.surface,
        color: colors.onSurface,
        overflowX: 'hidden',
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: sidebarWidth,
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 50,
        }}
      >
        <Box sx={{ width: sidebarWidth, height: '100%' }}>
          <SidebarNav
            primaryItems={primaryNav}
            footerItems={footerNav}
            accountLabel={accountLabel}
          />
        </Box>
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
          },
        }}
      >
        <SidebarNav
          primaryItems={primaryNav}
          footerItems={footerNav}
          accountLabel={accountLabel}
          onNavigate={closeMobile}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minWidth: 0,
          ml: { xs: 0, md: `${sidebarWidth}px` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <DashboardTopBar avatarUrl={avatarUrl} onMenuClick={() => setMobileOpen(true)} />

        <Box
          sx={
            isCvEditor
              ? {
                  flex: 1,
                  width: '100%',
                  maxWidth: 'none',
                  p: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }
              : {
                  flex: 1,
                  width: '100%',
                  maxWidth: contentMaxWidth,
                  mx: 'auto',
                  px: 3,
                  py: 5,
                }
          }
        >
          {children}
          {!isCvEditor && <DashboardFooter />}
        </Box>
      </Box>
    </Box>
  );
}
