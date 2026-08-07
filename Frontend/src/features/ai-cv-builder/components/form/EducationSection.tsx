'use client';

import { Box, Button, IconButton } from '@mui/material';
import { School, AddCircleOutline, DeleteOutline } from '@mui/icons-material';
import type { EducationItem } from '@/components/cv-maker/Education';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { SectionHeading } from './common/SectionHeading';
import { EditorField } from './common/EditorField';
import { aiCvBuilderCopy } from '../../constants/copy';

interface EducationSectionProps {
  data: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export function EducationSection({ data, onChange }: EducationSectionProps) {
  const { colors, fonts, radius } = dashboardTokens;

  const add = () => {
    onChange([
      ...data,
      {
        id: Date.now().toString(),
        university: '',
        department: '',
        startDate: '',
        endDate: '',
      },
    ]);
  };

  const remove = (id: string) => onChange(data.filter((e) => e.id !== id));

  const update = (id: string, field: keyof EducationItem, value: string) => {
    onChange(data.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  return (
    <Box>
      <SectionHeading
        icon={School}
        title={aiCvBuilderCopy.education}
        action={
          <Button
            size="small"
            startIcon={<AddCircleOutline sx={{ fontSize: 18 }} />}
            onClick={add}
            sx={{
              textTransform: 'none',
              color: colors.secondary,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {aiCvBuilderCopy.add}
          </Button>
        }
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.map((edu) => (
          <Box
            key={edu.id}
            sx={{
              bgcolor: colors.surfaceContainerLow,
              p: 2,
              borderRadius: radius.lg,
              border: `1px solid ${colors.outlineVariant}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton size="small" onClick={() => remove(edu.id)}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <EditorField
                  labelText={aiCvBuilderCopy.university}
                  value={edu.university}
                  onChange={(e) => update(edu.id, 'university', e.target.value)}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <EditorField
                  labelText={aiCvBuilderCopy.department}
                  value={edu.department}
                  onChange={(e) => update(edu.id, 'department', e.target.value)}
                />
              </Box>
              <EditorField
                labelText={aiCvBuilderCopy.startDate}
                value={edu.startDate}
                onChange={(e) => update(edu.id, 'startDate', e.target.value)}
                placeholder="YYYY-MM"
              />
              <EditorField
                labelText={aiCvBuilderCopy.endDate}
                value={edu.endDate}
                onChange={(e) => update(edu.id, 'endDate', e.target.value)}
                placeholder="YYYY-MM"
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
