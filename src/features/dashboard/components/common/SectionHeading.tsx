'use client';

import { Box, Typography } from '@mui/material';

interface SectionHeadingProps {
  title: string;
  kicker?: string;
}

export function SectionHeading({ title, kicker }: SectionHeadingProps) {
  return (
    <Box sx={{ mb: 2.25 }}>
      {kicker ? (
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            letterSpacing: 1.15,
            display: 'block',
            mb: 0.5,
            fontSize: '0.68rem',
          }}
        >
          {kicker}
        </Typography>
      ) : null}
      <Typography
        variant="h6"
        component="h2"
        sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          width: 40,
          height: 3,
          borderRadius: 10,
          mt: 1.15,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          opacity: 0.85,
        }}
      />
    </Box>
  );
}
