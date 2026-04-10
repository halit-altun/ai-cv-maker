'use client';

import { Box } from '@mui/material';
import type { DashboardMetric } from '../../types';
import { SectionHeading } from '../common/SectionHeading';
import { MetricCard } from './MetricCard';

interface MetricsSectionProps {
  title: string;
  kicker?: string;
  metrics: DashboardMetric[];
}

export function MetricsSection({ title, kicker, metrics }: MetricsSectionProps) {
  return (
    <Box component="section">
      <SectionHeading title={title} kicker={kicker} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}
      >
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </Box>
    </Box>
  );
}
