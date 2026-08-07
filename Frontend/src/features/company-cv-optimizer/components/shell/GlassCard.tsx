'use client';

import { Box, type SxProps, type Theme } from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

interface GlassCardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
  id?: string;
}

/** CareerAI glass-card / glass-panel stili */
export function GlassCard({ children, sx, className, id }: GlassCardProps) {
  const { colors } = dashboardTokens;

  return (
    <Box
      id={id}
      className={className}
      sx={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: '1rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
