'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { DashboardSidebarLink } from '../../types';
import { dashboardCopy } from '../../constants/copy';

interface SidebarNavProps {
  items: DashboardSidebarLink[];
  onNavigate?: () => void;
}

function isActivePath(pathname: string, item: DashboardSidebarLink): boolean {
  if (item.matchPath) {
    return pathname === item.matchPath || pathname.startsWith(`${item.matchPath}/`);
  }
  if (item.href === '/') {
    return pathname === '/';
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <Box sx={{ px: 1.5, py: 2 }}>
      <Typography
        variant="overline"
        sx={{ px: 1.5, display: 'block', color: 'text.disabled', letterSpacing: 1.2, mb: 1 }}
      >
        {dashboardCopy.sidebarSection}
      </Typography>
      <List disablePadding>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item);
          return (
            <ListItemButton
              key={item.id}
              component={Link}
              href={item.href}
              selected={active}
              onClick={onNavigate}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.25,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'inherit' : 'text.secondary' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.9rem',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
