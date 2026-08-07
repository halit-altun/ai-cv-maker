'use client';

import {
  Avatar,
  Badge,
  Box,
  IconButton,
  InputBase,
  Typography,
} from '@mui/material';
import { Menu as MenuIcon, Search, NotificationsOutlined } from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import { dashboardCopy } from '../../constants/copy';
import { dashboardTokens } from '../../styles/dashboardTokens';
import { appRoutes } from '../../constants/routes';
import { myCvsCopy } from '@/features/my-cvs/constants/copy';
import { aiCvBuilderCopy } from '@/features/ai-cv-builder/constants/copy';

interface DashboardTopBarProps {
  avatarUrl: string;
  onMenuClick: () => void;
}

export function DashboardTopBar({ avatarUrl, onMenuClick }: DashboardTopBarProps) {
  const pathname = usePathname() ?? '';
  const { colors, fonts, radius, topBarHeight } = dashboardTokens;
  const searchPlaceholder = pathname.includes('/ai-cv-builder/')
    ? aiCvBuilderCopy.searchTemplates
    : pathname.startsWith(appRoutes.myCvs)
      ? myCvsCopy.searchPlaceholder
      : dashboardCopy.searchPlaceholder;

  return (
    <Box
      component="header"
      sx={{
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: topBarHeight,
        px: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: colors.surfaceContainerLowest,
        borderBottom: `1px solid ${colors.outlineVariant}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={onMenuClick}
            aria-label={dashboardCopy.mobileMenuAria}
            size="small"
            sx={{ color: colors.primary }}
          >
            <MenuIcon />
          </IconButton>
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
        </Box>

        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            minWidth: 300,
            px: 2,
            py: 0.5,
            borderRadius: radius.full,
            bgcolor: colors.surfaceContainerLow,
          }}
        >
          <Search sx={{ fontSize: 20, color: colors.onSurfaceVariant }} />
          <InputBase
            placeholder={searchPlaceholder}
            sx={{
              flex: 1,
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: '20px',
              color: colors.onSurface,
              '& input::placeholder': { color: colors.onSurfaceVariant, opacity: 1 },
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          aria-label={dashboardCopy.notificationsAria}
          size="small"
          sx={{
            p: 0.5,
            color: colors.onSurfaceVariant,
            '&:hover': { bgcolor: colors.surfaceContainerLow },
          }}
        >
          <Badge
            variant="dot"
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: colors.secondary,
                top: 4,
                right: 4,
              },
            }}
          >
            <NotificationsOutlined sx={{ fontSize: 22 }} />
          </Badge>
        </IconButton>

        <Avatar
          src={avatarUrl}
          alt="User avatar"
          sx={{
            width: 32,
            height: 32,
            border: `1px solid ${colors.outlineVariant}`,
          }}
        />
      </Box>
    </Box>
  );
}
