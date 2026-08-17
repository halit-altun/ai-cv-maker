'use client';

import { Box, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import {
  ABOUT_CHAR_MAX,
  ABOUT_CHAR_MIN,
  BULLET_CHAR_MAX,
  BULLET_CHAR_MIN,
  type CvSectionLengthMode,
} from '@/lib/company-based-cv-editor/cvSectionLength';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type CvSectionLengthModeFieldsProps = {
  value: CvSectionLengthMode;
  onChange: (mode: CvSectionLengthMode) => void;
  aboutEnabled: boolean;
  workExperienceEnabled: boolean;
  compact?: boolean;
};

export function CvSectionLengthModeFields({
  value,
  onChange,
  aboutEnabled,
  workExperienceEnabled,
  compact = false,
}: CvSectionLengthModeFieldsProps) {
  const { colors } = dashboardTokens;
  if (!aboutEnabled && !workExperienceEnabled) return null;

  const targets: string[] = [];
  if (aboutEnabled) {
    targets.push(`Hakkımda ${ABOUT_CHAR_MIN}–${ABOUT_CHAR_MAX} karakter`);
  }
  if (workExperienceEnabled) {
    targets.push(`her deneyim maddesi ${BULLET_CHAR_MIN}–${BULLET_CHAR_MAX} karakter`);
  }

  return (
    <Box
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: colors.surfaceContainerLow,
        border: `1px solid ${colors.outlineVariant}`,
      }}
    >
      <Typography fontWeight={600} fontSize={compact ? 14 : 15} sx={{ mb: 0.5 }}>
        Analiz öncesi uzunluk modu
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1.5 }}
      >
        Seçili alanlar: {targets.join('; ')}. Kısa metin min tavana (biraz üstü)
        yaklaşır, uzun metin max tavana (biraz altı) iner; karşı uca çekilmez.
      </Typography>
      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as CvSectionLengthMode)}
      >
        <FormControlLabel
          value="fit_range"
          control={<Radio size="small" />}
          sx={{ alignItems: 'flex-start', mb: 1 }}
          label={
            <Box>
              <Typography fontWeight={600} fontSize={compact ? 13 : 14}>
                Karakter aralığına çek
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                KW eklenebilse de eklenemese de seçili bölümleri bu aralığa çeker.
                Orijinallik, anlam ve mantık korunur; uydurma eklenmez.
              </Typography>
            </Box>
          }
        />
        <FormControlLabel
          value="keywords_only"
          control={<Radio size="small" />}
          sx={{ alignItems: 'flex-start' }}
          label={
            <Box>
              <Typography fontWeight={600} fontSize={compact ? 13 : 14}>
                Karakter kontrolü yok (yalnızca KW)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Mevcut yapı: aralığa bakılmaz. KW doğal uyuyorsa entegre edilir.
              </Typography>
            </Box>
          }
        />
      </RadioGroup>
    </Box>
  );
}
