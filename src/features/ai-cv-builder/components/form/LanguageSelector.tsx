'use client';

import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';

interface LanguageSelectorProps {
  value: 'tr' | 'en';
  onChange: (value: 'tr' | 'en') => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const { colors, fonts } = dashboardTokens;

  return (
    <FormControl component="fieldset">
      <FormLabel
        sx={{
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: 600,
          color: colors.onSurfaceVariant,
          mb: 1,
        }}
      >
        {aiCvBuilderCopy.languageSelect}
      </FormLabel>
      <RadioGroup
        row
        value={value}
        onChange={(e) => onChange(e.target.value as 'tr' | 'en')}
      >
        <FormControlLabel value="tr" control={<Radio size="small" />} label="Türkçe" />
        <FormControlLabel value="en" control={<Radio size="small" />} label="English" />
      </RadioGroup>
    </FormControl>
  );
}
