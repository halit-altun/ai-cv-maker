'use client';

import { Box, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { OPTIMIZER_STEPS } from '../../constants/optimizerConstants';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

interface OptimizerStepperProps {
  activeStep: number;
}

export function OptimizerStepper({ activeStep }: OptimizerStepperProps) {
  const { colors, fonts } = dashboardTokens;
  const progressPercent = activeStep === 0 ? 5 : ((activeStep / (OPTIMIZER_STEPS.length - 1)) * 80 + 10);

  return (
    <Box
      sx={{
        mb: { xs: 4, md: 6 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        px: { xs: 1, md: 4 },
        maxWidth: 720,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 18,
          left: '10%',
          right: '10%',
          height: 2,
          bgcolor: colors.outlineVariant,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 18,
          left: '10%',
          width: `${progressPercent}%`,
          maxWidth: '80%',
          height: 2,
          bgcolor: colors.secondary,
          zIndex: 0,
          transition: 'width 0.5s ease',
        }}
      />

      {OPTIMIZER_STEPS.map((label, index) => {
        const isCompleted = index < activeStep;
        const isActive = index === activeStep;

        return (
          <Box
            key={label}
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              opacity: !isActive && !isCompleted ? 0.5 : 1,
            }}
          >
            <Box
              sx={{
                width: isActive ? 40 : 32,
                height: isActive ? 40 : 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontFamily: fonts.display,
                fontSize: isActive ? '1.125rem' : '0.875rem',
                color: isCompleted || isActive ? colors.onSecondary : colors.onSurfaceVariant,
                bgcolor:
                  isCompleted || isActive
                    ? isActive && index === 2
                      ? colors.secondaryContainer
                      : colors.secondary
                    : colors.surfaceContainerHighest,
                border: isActive
                  ? `4px solid ${colors.secondary}`
                  : `2px solid ${colors.outlineVariant}`,
                boxShadow: isActive ? '0 8px 24px rgba(70, 72, 212, 0.2), 0 0 0 4px rgba(70, 72, 212, 0.1)' : 'none',
              }}
            >
              {isCompleted ? (
                <CheckIcon sx={{ fontSize: 20 }} />
              ) : (
                index + 1
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: isActive ? '0.875rem' : '0.75rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? colors.secondary : colors.onSurfaceVariant,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
