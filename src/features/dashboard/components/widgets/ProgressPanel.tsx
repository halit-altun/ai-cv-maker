'use client';

import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import type { DashboardTaskProgress } from '../../types';
import { SectionHeading } from '../common/SectionHeading';

interface ProgressPanelProps {
  title: string;
  kicker?: string;
  tasks: DashboardTaskProgress[];
}

export function ProgressPanel({ title, kicker, tasks }: ProgressPanelProps) {
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
          {tasks.map((task, idx) => (
            <Box key={task.id} sx={{ mb: idx < tasks.length - 1 ? 2.5 : 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {task.label}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                  %{task.percent}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={task.percent}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': { borderRadius: 4 },
                }}
              />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
