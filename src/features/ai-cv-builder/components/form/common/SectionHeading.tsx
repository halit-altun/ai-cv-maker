'use client';

import { Box, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

interface SectionHeadingProps {
  icon: SvgIconComponent;
  title: string;
  action?: React.ReactNode;
}

export function SectionHeading({ icon: Icon, title, action }: SectionHeadingProps) {
  const { colors, fonts } = dashboardTokens;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ color: colors.secondary, fontSize: 22 }} />
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: '16px',
            letterSpacing: '0.08em',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: colors.onSurfaceVariant,
          }}
        >
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}
