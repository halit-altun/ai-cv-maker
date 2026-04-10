'use client';

import { Box, Chip, Typography } from '@mui/material';
import { CalendarTodayOutlined } from '@mui/icons-material';

interface DashboardHeroProps {
  title: string;
  subtitle: string;
}

export function DashboardHero({ title, subtitle }: DashboardHeroProps) {
  const today = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <Box
      sx={{
        mb: 1,
        pl: { xs: 2, sm: 2.5 },
        py: { xs: 2, sm: 2.25 },
        pr: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeftWidth: 4,
        borderLeftColor: 'primary.main',
        bgcolor: 'rgba(25, 118, 210, 0.04)',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>
          {title}
        </Typography>
        <Chip
          icon={<CalendarTodayOutlined sx={{ '&&': { fontSize: 16 } }} />}
          label={today}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 600,
            borderColor: 'rgba(25, 118, 210, 0.25)',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
          }}
        />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.75 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
