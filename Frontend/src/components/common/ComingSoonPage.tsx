'use client';

import { Box, Typography } from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

/** Henüz hazır olmayan rotalar için basit içerik sayfası. */
export function ComingSoonPage({
  title,
  description = 'Bu sayfa yakında eklenecek.',
}: ComingSoonPageProps) {
  const { colors, fonts } = dashboardTokens;

  return (
    <Box sx={{ py: 6, maxWidth: 560 }}>
      <Typography
        component="h1"
        sx={{
          fontFamily: fonts.display,
          fontSize: 28,
          lineHeight: '36px',
          fontWeight: 700,
          color: colors.onSurface,
          mb: 1.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: '22px',
          color: colors.onSurfaceVariant,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
}
