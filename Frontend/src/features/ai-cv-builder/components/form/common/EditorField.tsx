'use client';

import { Box, TextField, Typography, type TextFieldProps } from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

interface EditorFieldProps extends Omit<TextFieldProps, 'variant'> {
  labelText: string;
}

/** CareerAI editor input stili */
export function EditorField({ labelText, sx, ...props }: EditorFieldProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box>
      <Typography
        component="label"
        sx={{
          display: 'block',
          mb: 0.5,
          fontFamily: fonts.body,
          fontSize: 12,
          lineHeight: '14px',
          letterSpacing: '0.02em',
          fontWeight: 500,
          color: colors.onSurfaceVariant,
        }}
      >
        {labelText}
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        {...props}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: '#F1F5F9',
            borderRadius: radius.md,
            fontFamily: fonts.body,
            fontSize: 16,
            '& fieldset': { border: 'none' },
            '&.Mui-focused': {
              bgcolor: colors.surfaceContainerLowest,
              '& fieldset': {
                border: `2px solid ${colors.secondary}`,
              },
            },
          },
          ...((sx as object) || {}),
        }}
      />
    </Box>
  );
}
