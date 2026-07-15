'use client';

import Link from 'next/link';
import {
  Box,
  Button,
  IconButton,
  Typography,
} from '@mui/material';
import {
  EditOutlined,
  DownloadOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import type { DashboardActivityAction, DashboardActivityItem } from '../../types';
import { dashboardCopy } from '../../constants/copy';
import { dashboardTokens } from '../../styles/dashboardTokens';

interface RecentActivityCardProps {
  items: DashboardActivityItem[];
  onViewAll?: () => void;
}

const actionIconMap: Record<DashboardActivityAction, typeof EditOutlined> = {
  edit: EditOutlined,
  download: DownloadOutlined,
  visibility: VisibilityOutlined,
};

export function RecentActivityCard({ items, onViewAll }: RecentActivityCardProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        gridColumn: { xs: 'span 1', lg: 'span 3' },
        bgcolor: colors.surfaceContainerLowest,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${colors.outlineVariant}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          component="h3"
          sx={{
            fontFamily: fonts.display,
            fontSize: 20,
            lineHeight: '28px',
            fontWeight: 700,
            color: colors.onSurface,
          }}
        >
          {dashboardCopy.recentActivityTitle}
        </Typography>
        <Button
          onClick={onViewAll}
          sx={{
            p: 0,
            minWidth: 0,
            textTransform: 'none',
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
            color: colors.secondary,
            '&:hover': { bgcolor: 'transparent', opacity: 0.85 },
          }}
        >
          {dashboardCopy.viewAll}
        </Button>
      </Box>

      <Box>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Box
              key={item.id}
              component={item.href ? Link : 'div'}
              href={item.href}
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                borderBottom:
                  index < items.length - 1 ? `1px solid ${colors.outlineVariant}` : 'none',
                transition: 'background-color 0.2s',
                '&:hover': {
                  bgcolor: colors.surfaceContainerLow,
                  '& .activity-actions': { opacity: 1 },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.md,
                    bgcolor: colors.surfaceContainerHigh,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon sx={{ color: colors.onSurfaceVariant, fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      lineHeight: '16px',
                      letterSpacing: '0.01em',
                      fontWeight: 600,
                      color: colors.primary,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      lineHeight: '20px',
                      fontWeight: 400,
                      color: colors.onSurfaceVariant,
                      mt: 0.25,
                    }}
                  >
                    {item.detail}
                  </Typography>
                </Box>
              </Box>

              <Box
                className="activity-actions"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  opacity: { xs: 1, md: 0 },
                  transition: 'opacity 0.2s',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {item.actions.map((action) => {
                  const ActionIcon = actionIconMap[action];
                  return (
                    <IconButton
                      key={action}
                      size="small"
                      aria-label={action}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      sx={{
                        borderRadius: 1,
                        color: colors.onSurfaceVariant,
                        '&:hover': { bgcolor: colors.surfaceContainerHighest },
                      }}
                    >
                      <ActionIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
