'use client';

import { useState } from 'react';
import { Box, Button, IconButton, TextField, Tooltip } from '@mui/material';
import { Subject, AutoAwesome } from '@mui/icons-material';
import AIPromptBox from '@/components/common/AIPromptBox';
import { CVMakerAIService } from '@/lib/cv-maker/service';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { SectionHeading } from './common/SectionHeading';
import { aiCvBuilderCopy } from '../../constants/copy';

interface AboutSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function AboutSection({ value, onChange }: AboutSectionProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box>
      <SectionHeading
        icon={Subject}
        title={aiCvBuilderCopy.about}
        action={
          <Button
            size="small"
            startIcon={<AutoAwesome sx={{ fontSize: 18 }} />}
            onClick={() => setAiOpen(true)}
            sx={{
              textTransform: 'none',
              color: colors.secondary,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {aiCvBuilderCopy.aboutAi}
          </Button>
        }
      />
      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#F1F5F9',
              borderRadius: radius.md,
              fontFamily: fonts.body,
              pr: 5,
              '& fieldset': { border: 'none' },
              '&.Mui-focused': {
                bgcolor: '#fff',
                '& fieldset': { border: `2px solid ${colors.secondary}` },
              },
            },
          }}
        />
        <Tooltip title={aiCvBuilderCopy.aiImprove}>
          <IconButton
            onClick={() => setAiOpen(true)}
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              bgcolor: colors.secondaryContainer,
              color: colors.onSecondaryContainer,
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              '&:hover': { bgcolor: colors.secondaryContainer, transform: 'scale(1.05)' },
            }}
          >
            <AutoAwesome sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <AIPromptBox
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={async (prompt) => CVMakerAIService.generateAboutSection(prompt)}
        onSave={onChange}
        title="AI About"
        placeholder="Describe your background..."
        type="about"
      />
    </Box>
  );
}
