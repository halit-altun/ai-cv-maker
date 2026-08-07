'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Fab, Paper, Typography, ButtonBase } from '@mui/material';
import {
  AutoAwesome,
  EditNote,
  Psychology,
  Spellcheck,
} from '@mui/icons-material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';

export function AiWritingAssistantFab() {
  const { colors, fonts, radius, gradients } = dashboardTokens;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const actions = [
    { icon: EditNote, label: aiCvBuilderCopy.improveBullet },
    { icon: Psychology, label: aiCvBuilderCopy.suggestSummary },
    { icon: Spellcheck, label: aiCvBuilderCopy.fixGrammar },
  ];

  return (
    <Box ref={rootRef} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}>
      <Fab
        onClick={() => setOpen((v) => !v)}
        aria-label={aiCvBuilderCopy.aiAssistant}
        sx={{
          width: 56,
          height: 56,
          background: gradients.aiFab,
          color: colors.onSecondary,
          boxShadow: '0 12px 40px rgba(70, 72, 212, 0.45)',
          '&:hover': { background: gradients.aiFab, opacity: 0.95 },
          '&:active': { transform: 'scale(0.95)' },
        }}
      >
        <AutoAwesome sx={{ fontSize: 28 }} />
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: colors.error,
            border: '2px solid #fff',
          }}
        />
      </Fab>

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 0,
            width: 320,
            p: 2,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              pb: 1,
              borderBottom: `1px solid ${colors.outlineVariant}`,
            }}
          >
            <AutoAwesome sx={{ color: colors.secondary, fontSize: 20 }} />
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              {aiCvBuilderCopy.aiAssistant}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {actions.map(({ icon: Icon, label }) => (
              <ButtonBase
                key={label}
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  p: 1,
                  borderRadius: radius.md,
                  gap: 1,
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.onSurface,
                  border: '1px solid transparent',
                  '&:hover': {
                    bgcolor: '#fff',
                    borderColor: colors.outlineVariant,
                  },
                }}
              >
                <Icon sx={{ fontSize: 18, color: colors.secondary }} />
                {label}
              </ButtonBase>
            ))}

            <Box
              sx={{
                mt: 2,
                p: 1,
                borderRadius: radius.md,
                bgcolor: 'rgba(96, 99, 238, 0.1)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.secondary,
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                {aiCvBuilderCopy.currentSuggestion}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  fontStyle: 'italic',
                  color: colors.onSurfaceVariant,
                }}
              >
                {aiCvBuilderCopy.suggestionText}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
