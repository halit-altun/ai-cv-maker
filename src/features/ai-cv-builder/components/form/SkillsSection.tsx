'use client';

import { useState } from 'react';
import { Box, Button, Chip, TextField } from '@mui/material';
import { Verified, AutoAwesome, Close } from '@mui/icons-material';
import AIPromptBox from '@/components/common/AIPromptBox';
import { CVMakerAIService } from '@/lib/cv-maker/service';
import type { WorkExperienceItem } from '@/components/cv-maker/WorkExperience';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { SectionHeading } from './common/SectionHeading';
import { aiCvBuilderCopy } from '../../constants/copy';

interface SkillsSectionProps {
  data: string[];
  onChange: (skills: string[]) => void;
  workExperience: WorkExperienceItem[];
}

export function SkillsSection({ data, onChange, workExperience }: SkillsSectionProps) {
  const { colors, fonts, radius } = dashboardTokens;
  const [draft, setDraft] = useState('');
  const [aiOpen, setAiOpen] = useState(false);

  const addSkill = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...data, v]);
    setDraft('');
  };

  return (
    <Box>
      <SectionHeading
        icon={Verified}
        title={aiCvBuilderCopy.skills}
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
            {aiCvBuilderCopy.skillsAi}
          </Button>
        }
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {data.map((skill, index) => (
          <Chip
            key={`${skill}-${index}`}
            label={skill}
            onDelete={() => onChange(data.filter((_, i) => i !== index))}
            deleteIcon={<Close sx={{ fontSize: 14 }} />}
            sx={{
              bgcolor: colors.surfaceContainerHigh,
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 500,
              borderRadius: radius.full,
            }}
          />
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder={aiCvBuilderCopy.addSkill}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            sx={{
              minWidth: 120,
              '& .MuiOutlinedInput-root': {
                borderRadius: radius.full,
                fontSize: 12,
                bgcolor: 'transparent',
                border: `1px dashed ${colors.outline}`,
                '& fieldset': { border: 'none' },
              },
            }}
          />
          <Button
            size="small"
            onClick={addSkill}
            sx={{
              textTransform: 'none',
              borderRadius: radius.full,
              border: `1px dashed ${colors.outline}`,
              color: colors.onSurfaceVariant,
              fontSize: 12,
              fontWeight: 500,
              px: 2,
            }}
          >
            {aiCvBuilderCopy.addSkill}
          </Button>
        </Box>
      </Box>

      <AIPromptBox
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={async () => {
          const skills = await CVMakerAIService.generateSkillsFromExperience(workExperience);
          return skills.join('\n');
        }}
        onSave={(result) => {
          onChange(result.split('\n').filter((s) => s.trim()));
        }}
        title="AI Skills"
        placeholder="Optional notes..."
        type="skills"
        workExperienceData={workExperience}
      />
    </Box>
  );
}
