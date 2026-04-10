'use client';

import { useState } from 'react';
import { Box, Drawer, IconButton, Toolbar, Typography } from '@mui/material';
import { Menu as MenuIcon, SpaceDashboardOutlined } from '@mui/icons-material';
import { dashboardTokens } from '../../styles/dashboardTokens';
import { dashboardCopy } from '../../constants/copy';
import { SidebarNav } from './SidebarNav';
import type { DashboardSidebarLink } from '../../types';

const drawerWidth = dashboardTokens.sidebarWidth;

interface DashboardShellProps {
  sidebarItems: DashboardSidebarLink[];
  children: React.ReactNode;
}

export function DashboardShell({ sidebarItems, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: dashboardTokens.drawerPaperBg,
      }}
    >
      <Toolbar
        sx={{
          minHeight: 72,
          px: 2,
          background: dashboardTokens.mobileDrawerHeaderBg,
          color: 'text.primary',
          borderBottom: dashboardTokens.mobileTopBarBorder,
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 0.25,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.6 }}>
          {dashboardCopy.appShortName}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          {dashboardCopy.pageTitle}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', lineHeight: 1.3 }}>
          {dashboardCopy.drawerHeaderHint}
        </Typography>
      </Toolbar>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <SidebarNav
          items={sidebarItems}
          onNavigate={() => setMobileOpen(false)}
        />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: 'calc(100vh - 1px)',
        bgcolor: dashboardTokens.shellBg,
      }}
    >
      {/* Sol menü yalnızca mobilde (temporary drawer) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
            boxShadow: '4px 0 24px rgba(25, 118, 210, 0.08)',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minWidth: 0,
        }}
      >
        <Toolbar
          sx={{
            display: { xs: 'flex', md: 'none' },
            gap: 1.5,
            alignItems: 'center',
            minHeight: 56,
            px: 1.5,
            bgcolor: '#ffffff',
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 1px 0 rgba(255, 255, 255, 1) inset',
          }}
        >
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label={dashboardCopy.mobileMenuAria}
            sx={{
              color: 'primary.main',
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.14)' },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <SpaceDashboardOutlined sx={{ fontSize: 22, color: 'primary.main', opacity: 0.85 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                {dashboardCopy.pageTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                {dashboardCopy.mobileBarHint}
              </Typography>
            </Box>
          </Box>
        </Toolbar>

        <Box
          sx={{
            maxWidth: dashboardTokens.contentMaxWidth,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, md: 3 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
