'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Work,
  AddCircleOutline,
  DeleteOutline,
  AutoAwesome,
  DragIndicator,
} from '@mui/icons-material';
import AIPromptBox from '@/components/common/AIPromptBox';
import { CVMakerAIService } from '@/lib/cv-maker/service';
import type { WorkExperienceItem } from '@/components/cv-maker/WorkExperience';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { SectionHeading } from './common/SectionHeading';
import { EditorField } from './common/EditorField';
import { aiCvBuilderCopy } from '../../constants/copy';

interface WorkExperienceSectionProps {
  data: WorkExperienceItem[];
  onChange: (items: WorkExperienceItem[]) => void;
  aboutData: string;
  isEnglish: boolean;
}

export function WorkExperienceSection({
  data,
  onChange,
  aboutData,
  isEnglish: _isEnglish,
}: WorkExperienceSectionProps) {
  const { colors, fonts, radius } = dashboardTokens;
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addExperience = () => {
    onChange([
      ...data,
      {
        id: Date.now().toString(),
        position: '',
        company: '',
        startDate: '',
        endDate: '',
        country: '',
        city: '',
        bulletPoints: [''],
      },
    ]);
  };

  const removeExperience = (id: string) => {
    onChange(data.filter((e) => e.id !== id));
  };

  const update = (id: string, field: keyof WorkExperienceItem, value: unknown) => {
    onChange(data.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const updateBullet = (id: string, index: number, value: string) => {
    onChange(
      data.map((e) =>
        e.id === id
          ? {
              ...e,
              bulletPoints: e.bulletPoints.map((bp, i) => (i === index ? value : bp)),
            }
          : e
      )
    );
  };

  const addBullet = (id: string) => {
    onChange(
      data.map((e) =>
        e.id === id ? { ...e, bulletPoints: [...e.bulletPoints, ''] } : e
      )
    );
  };

  const removeBullet = (id: string, index: number) => {
    onChange(
      data.map((e) =>
        e.id === id
          ? { ...e, bulletPoints: e.bulletPoints.filter((_, i) => i !== index) }
          : e
      )
    );
  };

  const openAi = (id: string) => {
    setSelectedId(id);
    setAiOpen(true);
  };

  const handleAiSave = (result: string) => {
    if (!selectedId) return;
    const lines = result
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    update(selectedId, 'bulletPoints', lines.length ? lines : [result]);
  };

  return (
    <Box>
      <SectionHeading
        icon={Work}
        title={aiCvBuilderCopy.workExperience}
        action={
          <Button
            size="small"
            startIcon={<AddCircleOutline sx={{ fontSize: 18 }} />}
            onClick={addExperience}
            sx={{
              textTransform: 'none',
              color: colors.secondary,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 14,
              '&:hover': { textDecoration: 'underline', bgcolor: 'transparent' },
            }}
          >
            {aiCvBuilderCopy.add}
          </Button>
        }
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.map((exp) => (
          <Box
            key={exp.id}
            sx={{
              position: 'relative',
              bgcolor: colors.surfaceContainerLow,
              p: 2,
              borderRadius: radius.lg,
              border: `1px solid ${colors.outlineVariant}`,
              '&:hover .drag-handle': { opacity: 1 },
            }}
          >
            <Box
              className="drag-handle"
              sx={{
                position: 'absolute',
                left: -12,
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0,
                transition: 'opacity 0.2s',
                color: colors.outline,
                cursor: 'grab',
              }}
            >
              <DragIndicator />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <IconButton size="small" onClick={() => removeExperience(exp.id)} aria-label="Remove">
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <EditorField
                labelText={aiCvBuilderCopy.jobTitle}
                value={exp.position}
                onChange={(e) => update(exp.id, 'position', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                  },
                }}
              />
              <EditorField
                labelText={aiCvBuilderCopy.company}
                value={exp.company}
                onChange={(e) => update(exp.id, 'company', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                  },
                }}
              />
              <EditorField
                labelText={aiCvBuilderCopy.city}
                value={exp.city}
                onChange={(e) => update(exp.id, 'city', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                  },
                }}
              />
              <EditorField
                labelText={aiCvBuilderCopy.country}
                value={exp.country}
                onChange={(e) => update(exp.id, 'country', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                  },
                }}
              />
              <EditorField
                labelText={aiCvBuilderCopy.startDate}
                value={exp.startDate}
                onChange={(e) => update(exp.id, 'startDate', e.target.value)}
                placeholder="YYYY-MM"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                  },
                }}
              />
              <EditorField
                labelText={aiCvBuilderCopy.endDate}
                value={exp.endDate}
                onChange={(e) => update(exp.id, 'endDate', e.target.value)}
                placeholder="YYYY-MM or Present"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                  },
                }}
              />
            </Box>

            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 500,
                color: colors.onSurfaceVariant,
                mb: 0.5,
              }}
            >
              {aiCvBuilderCopy.description}
            </Typography>
            {exp.bulletPoints.map((bp, index) => (
              <Box key={index} sx={{ position: 'relative', mb: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={index === 0 ? 3 : 2}
                  value={bp}
                  onChange={(e) => updateBullet(exp.id, index, e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fff',
                      borderRadius: radius.md,
                      fontFamily: fonts.body,
                      pr: 5,
                      '& fieldset': { border: `1px solid ${colors.outlineVariant}` },
                      '&.Mui-focused fieldset': { border: `2px solid ${colors.secondary}` },
                    },
                  }}
                />
                {index === 0 && (
                  <Tooltip title={aiCvBuilderCopy.aiImprove}>
                    <IconButton
                      onClick={() => openAi(exp.id)}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        bgcolor: colors.secondaryContainer,
                        color: colors.onSecondaryContainer,
                        boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        '&:hover': {
                          bgcolor: colors.secondaryContainer,
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      <AutoAwesome sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {exp.bulletPoints.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => removeBullet(exp.id, index)}
                    sx={{ position: 'absolute', right: 8, top: 4 }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button
              size="small"
              onClick={() => addBullet(exp.id)}
              sx={{ textTransform: 'none', color: colors.secondary, fontWeight: 600 }}
            >
              + Bullet
            </Button>
          </Box>
        ))}
      </Box>

      <AIPromptBox
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={async (prompt) => {
          const enhanced = aboutData.trim()
            ? `${prompt}\n\nAbout: ${aboutData}`
            : prompt;
          const bullets = await CVMakerAIService.generateWorkExperienceBullets(enhanced);
          return bullets.join('\n');
        }}
        onSave={handleAiSave}
        title="AI Work Experience"
        placeholder="Describe achievements..."
        type="work-experience"
        aboutData={aboutData}
      />
    </Box>
  );
}
