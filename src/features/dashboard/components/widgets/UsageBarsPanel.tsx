'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import type { DashboardUsageBar } from '../../types';
import { SectionHeading } from '../common/SectionHeading';

interface UsageBarsPanelProps {
  title: string;
  kicker?: string;
  bars: DashboardUsageBar[];
}

export function UsageBarsPanel({ title, kicker, bars }: UsageBarsPanelProps) {
  return (
    <Box component="section">
      <SectionHeading title={title} kicker={kicker} />
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'rgba(15, 23, 42, 0.08)',
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 1,
              minHeight: 120,
            }}
          >
            {bars.map((bar) => (
              <Box
                key={bar.id}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 36,
                    height: 100,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: `${bar.percent}%`,
                      minHeight: 4,
                      borderRadius: '4px 4px 0 0',
                      background: 'linear-gradient(180deg, #42a5f5 0%, #7b1fa2 100%)',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {bar.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
