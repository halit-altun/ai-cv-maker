'use client';

import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import type { CvBadgeStyle } from '@/components/cv-maker/cvTypography';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';

interface BadgeStyleSelectorProps {
  label: string;
  value: CvBadgeStyle;
  onChange: (value: CvBadgeStyle) => void;
}

export function BadgeStyleSelector({ label, value, onChange }: BadgeStyleSelectorProps) {
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
        {label}
      </FormLabel>
      <RadioGroup
        row
        value={value}
        onChange={(e) => onChange(e.target.value as CvBadgeStyle)}
      >
        <FormControlLabel
          value="plain"
          control={<Radio size="small" />}
          label={aiCvBuilderCopy.badgeStylePlain}
        />
        <FormControlLabel
          value="badge"
          control={<Radio size="small" />}
          label={aiCvBuilderCopy.badgeStyleBadge}
        />
      </RadioGroup>
    </FormControl>
  );
}
