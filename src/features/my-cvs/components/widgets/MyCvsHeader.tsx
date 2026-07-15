'use client';

import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import { Add, FilterList } from '@mui/icons-material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { myCvsCopy } from '../../constants/copy';

interface MyCvsHeaderProps {
  onFilterClick?: () => void;
}

export function MyCvsHeader({ onFilterClick }: MyCvsHeaderProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 8,
      }}
    >
      <Box>
        <Typography
          component="h1"
          sx={{
            fontFamily: fonts.display,
            fontSize: 24,
            lineHeight: '32px',
            fontWeight: 600,
            color: colors.primary,
            mb: 0.5,
          }}
        >
          {myCvsCopy.pageTitle}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: '24px',
            fontWeight: 400,
            color: colors.onSurfaceVariant,
          }}
        >
          {myCvsCopy.pageSubtitle}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          onClick={onFilterClick}
          startIcon={<FilterList />}
          sx={{
            px: 3,
            py: 2,
            borderRadius: radius.md,
            bgcolor: colors.surfaceContainerLowest,
            border: `1px solid ${colors.outlineVariant}`,
            color: colors.onSurface,
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: colors.surfaceContainerLow },
          }}
        >
          {myCvsCopy.filter}
        </Button>
        <Button
          component={Link}
          href={appRoutes.createCv}
          startIcon={<Add />}
          sx={{
            px: 3,
            py: 2,
            borderRadius: radius.md,
            bgcolor: colors.secondary,
            color: colors.onSecondary,
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.01em',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(70, 72, 212, 0.25)',
            '&:hover': { bgcolor: colors.secondary, opacity: 0.9 },
            '&:active': { transform: 'scale(0.95)' },
          }}
        >
          {myCvsCopy.createNewCv}
        </Button>
      </Box>
    </Box>
  );
}
