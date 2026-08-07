'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Box, Button, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import type { DashboardSidebarLink } from '../../types';
import { dashboardCopy } from '../../constants/copy';
import { appRoutes } from '../../constants/routes';
import { dashboardTokens } from '../../styles/dashboardTokens';
import { logoutRequest } from '@/lib/auth/api';

interface SidebarNavProps {
  primaryItems: DashboardSidebarLink[];
  footerItems: DashboardSidebarLink[];
  onNavigate?: () => void;
  showBrand?: boolean;
  accountLabel?: string;
}

function isActivePath(pathname: string, item: DashboardSidebarLink): boolean {
  if (item.matchPath) {
    return pathname === item.matchPath || pathname.startsWith(`${item.matchPath}/`);
  }
  if (item.href === '/' || item.href === '#') {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({
  primaryItems,
  footerItems,
  onNavigate,
  showBrand = true,
  accountLabel,
}: SidebarNavProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { colors, fonts, radius } = dashboardTokens;
  const resolvedAccountLabel = accountLabel || dashboardCopy.accountLabel;

  const navItemSx = (active: boolean) => ({
    borderRadius: radius.md,
    p: 2,
    mb: 0.5,
    gap: 2,
    color: active ? colors.onSecondaryContainer : colors.onSurfaceVariant,
    bgcolor: active ? colors.secondaryContainer : 'transparent',
    transition: 'background-color 0.2s, transform 0.2s',
    '&:hover': {
      bgcolor: active ? colors.secondaryContainer : colors.surfaceContainerHigh,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
    '&.Mui-selected': {
      bgcolor: colors.secondaryContainer,
      color: colors.onSecondaryContainer,
      '&:hover': { bgcolor: colors.secondaryContainer },
      '& .MuiListItemIcon-root': { color: 'inherit' },
    },
  });

  const renderItem = (item: DashboardSidebarLink) => {
    const Icon = item.icon;
    const active = isActivePath(pathname, item);
    const isHash = item.href === '#';

    const content = (
      <>
        <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
          <Icon sx={{ fontSize: 22 }} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
          }}
        />
      </>
    );

    if (isHash) {
      const handleClick = async () => {
        onNavigate?.();
        if (item.id === 'logout') {
          await logoutRequest();
          router.replace(appRoutes.login);
          router.refresh();
        }
      };

      return (
        <ListItemButton
          key={item.id}
          selected={active}
          onClick={handleClick}
          sx={navItemSx(active)}
        >
          {content}
        </ListItemButton>
      );
    }

    return (
      <ListItemButton
        key={item.id}
        component={Link}
        href={item.href}
        selected={active}
        onClick={onNavigate}
        sx={navItemSx(active)}
      >
        {content}
      </ListItemButton>
    );
  };


  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 3,
        px: 2,
        bgcolor: colors.surfaceContainerLowest,
        borderRight: `1px solid ${colors.outlineVariant}`,
      }}
    >
      {showBrand && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              bgcolor: colors.primaryContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesome sx={{ color: colors.onPrimaryFixed, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontSize: 20,
                lineHeight: '28px',
                fontWeight: 700,
                color: colors.primary,
              }}
            >
              {dashboardCopy.brandName}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 12,
                lineHeight: '14px',
                letterSpacing: '0.02em',
                fontWeight: 500,
                color: colors.onSurfaceVariant,
              }}
            >
              {resolvedAccountLabel}
            </Typography>
          </Box>
        </Box>
      )}

      <Box component="nav" sx={{ flex: 1 }}>
        {primaryItems.map(renderItem)}
      </Box>

      <Box sx={{ mt: 'auto' }}>
        <Button
          component={Link}
          href={appRoutes.createCv}
          fullWidth
          onClick={onNavigate}
          sx={{
            mb: 3,
            py: 2,
            px: 3,
            borderRadius: radius.md,
            bgcolor: colors.secondary,
            color: colors.onSecondary,
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: colors.secondary, opacity: 0.92 },
            '&:active': { transform: 'scale(0.95)' },
            transition: 'transform 0.15s, opacity 0.15s',
          }}
        >
          {dashboardCopy.createCvCta}
        </Button>
        {footerItems.map(renderItem)}
      </Box>
    </Box>
  );
}
