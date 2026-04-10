'use client';

import { Box, Paper, Typography } from '@mui/material';
import { LightbulbOutlined } from '@mui/icons-material';

interface InsightBannerProps {
  title: string;
  body: string;
}

export function InsightBanner({ title, body }: InsightBannerProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeftWidth: 3,
        borderLeftColor: 'secondary.light',
        background:
          'linear-gradient(105deg, rgba(33, 150, 243, 0.05) 0%, rgba(255, 255, 255, 0.9) 42%, rgba(156, 39, 176, 0.04) 100%)',
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'warning.light',
            color: 'warning.dark',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LightbulbOutlined />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {body}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
