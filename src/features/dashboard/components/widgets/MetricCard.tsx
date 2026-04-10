'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { DashboardMetric } from '../../types';

interface MetricCardProps {
  metric: DashboardMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const theme = useTheme();
  const Icon = metric.icon;
  const main = theme.palette[metric.tone].main;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'rgba(15, 23, 42, 0.08)',
        borderRadius: 2,
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease',
        '&:hover': {
          borderColor: alpha(main, 0.35),
          boxShadow: `0 10px 28px ${alpha(main, 0.12)}`,
          transform: 'translateY(-3px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(main, 0.12),
              color: main,
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5 }}>
          {metric.value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.25 }}>
          {metric.label}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {metric.hint}
        </Typography>
      </CardContent>
    </Card>
  );
}
