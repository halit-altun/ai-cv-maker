'use client';

import Link from 'next/link';
import { Box, Card, CardActionArea, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { DashboardQuickAction } from '../../types';
import { SectionHeading } from '../common/SectionHeading';

interface QuickActionsSectionProps {
  title: string;
  kicker?: string;
  actions: DashboardQuickAction[];
}

export function QuickActionsSection({ title, kicker, actions }: QuickActionsSectionProps) {
  const theme = useTheme();

  return (
    <Box component="section">
      <SectionHeading title={title} kicker={kicker} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const main = theme.palette[action.tone].main;
          return (
            <Card
              key={action.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'rgba(15, 23, 42, 0.08)',
                borderRadius: 2,
                overflow: 'hidden',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  borderColor: alpha(main, 0.28),
                  boxShadow: `0 8px 22px ${alpha(main, 0.1)}`,
                },
              }}
            >
              <CardActionArea
                component={Link}
                href={action.href}
                sx={{
                  alignItems: 'stretch',
                  p: 2,
                  display: 'block',
                  textAlign: 'left',
                  '&:hover': {
                    bgcolor: alpha(main, 0.08),
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: alpha(main, 0.15),
                      color: main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
