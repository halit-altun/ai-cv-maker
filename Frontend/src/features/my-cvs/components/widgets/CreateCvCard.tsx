'use client';

import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { myCvsCopy } from '../../constants/copy';

export function CreateCvCard() {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      component={Link}
      href={appRoutes.createCv}
      sx={{
        textDecoration: 'none',
        border: `2px dashed ${colors.outlineVariant}`,
        borderRadius: radius.lg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 8,
        minHeight: 360,
        transition: 'all 0.3s',
        color: 'inherit',
        '&:hover': {
          borderColor: colors.secondary,
          bgcolor: 'rgba(70, 72, 212, 0.05)',
          '& .create-icon-wrap': {
            bgcolor: 'rgba(70, 72, 212, 0.1)',
            color: colors.secondary,
          },
        },
      }}
    >
      <Box
        className="create-icon-wrap"
        sx={{
          width: 64,
          height: 64,
          borderRadius: radius.full,
          bgcolor: colors.surfaceContainerLow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s, color 0.2s',
          color: colors.onSurfaceVariant,
        }}
      >
        <Add sx={{ fontSize: 36 }} />
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="h3"
          sx={{
            fontFamily: fonts.display,
            fontSize: 20,
            lineHeight: '28px',
            fontWeight: 600,
            color: colors.primary,
          }}
        >
          {myCvsCopy.createNewTitle}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 400,
            color: colors.onSurfaceVariant,
            mt: 0.5,
          }}
        >
          {myCvsCopy.createNewHint}
        </Typography>
      </Box>
    </Box>
  );
}
