'use client';

import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { Translate, AddCircleOutline, DeleteOutline } from '@mui/icons-material';
import type { LanguageItem } from '@/components/cv-maker/Languages';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { SectionHeading } from './common/SectionHeading';
import { EditorField } from './common/EditorField';
import { aiCvBuilderCopy } from '../../constants/copy';

const LEVELS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'Ana Dil', label: 'Ana Dil / Native' },
];

interface LanguagesSectionProps {
  data: LanguageItem[];
  onChange: (items: LanguageItem[]) => void;
}

export function LanguagesSection({ data, onChange }: LanguagesSectionProps) {
  const { colors, fonts, radius } = dashboardTokens;

  const add = () => {
    onChange([...data, { id: Date.now().toString(), language: '', level: 'B1' }]);
  };

  const remove = (id: string) => onChange(data.filter((l) => l.id !== id));

  const update = (id: string, field: keyof LanguageItem, value: string) => {
    onChange(data.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  return (
    <Box>
      <SectionHeading
        icon={Translate}
        title={aiCvBuilderCopy.languages}
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
            {aiCvBuilderCopy.addLanguage}
          </Button>
        }
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.map((lang) => (
          <Box
            key={lang.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: 2,
              alignItems: 'end',
              bgcolor: colors.surfaceContainerLow,
              p: 2,
              borderRadius: radius.lg,
              border: `1px solid ${colors.outlineVariant}`,
            }}
          >
            <EditorField
              labelText={aiCvBuilderCopy.language}
              value={lang.language}
              onChange={(e) => update(lang.id, 'language', e.target.value)}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>{aiCvBuilderCopy.level}</InputLabel>
              <Select
                label={aiCvBuilderCopy.level}
                value={lang.level}
                onChange={(e) => update(lang.id, 'level', e.target.value)}
                sx={{ bgcolor: '#F1F5F9', borderRadius: radius.md }}
              >
                {LEVELS.map((l) => (
                  <MenuItem key={l.value} value={l.value}>
                    {l.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={() => remove(lang.id)} sx={{ mb: 0.5 }}>
              <DeleteOutline />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
