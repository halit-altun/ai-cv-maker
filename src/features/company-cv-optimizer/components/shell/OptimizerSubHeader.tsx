'use client';

import { Box, Button, IconButton, InputBase, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { OPTIMIZER_SUB_NAV } from '../../constants/optimizerConstants';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

interface OptimizerSubHeaderProps {
  activeStep: number;
}

const subNavStepMap = [0, 1, 2, 3];

export function OptimizerSubHeader({ activeStep }: OptimizerSubHeaderProps) {
  const { colors, fonts } = dashboardTokens;
  const activeSubNav = subNavStepMap[activeStep] ?? 0;

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        px: { xs: 2, md: 3 },
        py: 2,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        bgcolor: colors.surfaceContainerLowest,
        borderBottom: `1px solid ${colors.outlineVariant}80`,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: colors.primary,
          }}
        >
          CV Optimizer
        </Typography>
        <Box
          sx={{
            width: '1px',
            height: 16,
            bgcolor: colors.outlineVariant,
            display: { xs: 'none', sm: 'block' },
          }}
        />
        <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
          {OPTIMIZER_SUB_NAV.map((item, index) => {
            const isActive = index === activeSubNav;
            return (
              <Typography
                key={item.id}
                component="span"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? colors.secondary : colors.onSurfaceVariant,
                  borderBottom: isActive ? `2px solid ${colors.secondary}` : 'none',
                  pb: isActive ? 0.5 : 0,
                  cursor: 'default',
                  transition: 'color 0.2s',
                }}
              >
                {item.label}
              </Typography>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            position: 'relative',
            display: { xs: 'none', lg: 'block' },
          }}
        >
          <InputBase
            placeholder="Search files..."
            sx={{
              bgcolor: colors.surfaceContainerLow,
              borderRadius: 999,
              px: 3,
              py: 1,
              fontSize: '0.875rem',
              width: 256,
              '&:focus-within': {
                outline: `2px solid ${colors.secondary}`,
              },
            }}
          />
          <SearchIcon
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.onSurfaceVariant,
              fontSize: 20,
              pointerEvents: 'none',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            sx={{
              position: 'relative',
              '&:hover': { bgcolor: colors.surfaceContainerHigh },
            }}
          >
            <NotificationsNoneIcon />
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: colors.error,
              }}
            />
          </IconButton>
          <Button
            variant="contained"
            sx={{
              bgcolor: colors.primary,
              color: colors.onPrimary,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: '0.875rem',
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { opacity: 0.9, bgcolor: colors.primary },
            }}
          >
            Save Draft
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
