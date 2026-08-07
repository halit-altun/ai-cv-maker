'use client';

import { Box, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

/** Preview HTML tasarımındaki step progress (Analiz → Uyarlama → Onay → Önizleme) */
const PREVIEW_STEPS = ['Analiz', 'Uyarlama', 'Onay', 'Önizleme'] as const;

export function PreviewStepper() {
  const { colors, fonts } = dashboardTokens;
  const activeIndex = 3;

  return (
    <Box sx={{ mb: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 672 }}>
        {PREVIEW_STEPS.map((label, index) => {
          const isActive = index === activeIndex;
          const isCompleted = index < activeIndex;
          const showConnector = index < PREVIEW_STEPS.length - 1;

          return (
            <Box
              key={label}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  width: isActive ? 40 : 32,
                  height: isActive ? 40 : 32,
                  borderRadius: '50%',
                  bgcolor: colors.secondary,
                  color: colors.onSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  mb: 0.5,
                  zIndex: 1,
                  border: isActive ? `4px solid ${colors.secondaryFixed}` : 'none',
                  boxShadow: isActive ? '0 8px 24px rgba(70, 72, 212, 0.25)' : 'none',
                }}
              >
                {isCompleted ? (
                  <CheckIcon sx={{ fontSize: 18 }} />
                ) : (
                  <Typography sx={{ fontWeight: 700, fontSize: isActive ? '1rem' : '0.875rem' }}>
                    {index + 1}
                  </Typography>
                )}
              </Box>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: isActive ? '0.875rem' : '0.75rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? colors.primary : colors.onSurfaceVariant,
                  zIndex: 1,
                }}
              >
                {label}
              </Typography>
              {showConnector && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 16,
                    width: '100%',
                    height: '2px',
                    bgcolor: colors.secondary,
                    zIndex: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
