'use client';

import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { Person } from '@mui/icons-material';
import { SectionHeading } from './common/SectionHeading';
import { EditorField } from './common/EditorField';
import { aiCvBuilderCopy } from '../../constants/copy';
import type { PersonalInfoState } from '../../utils/cvFormUtils';
import { CV_PHOTO_SIZE_PT } from '@/components/cv-maker/cvPhoto';

interface PersonalInfoSectionProps {
  data: PersonalInfoState;
  onChange: (field: string, value: string | boolean | number) => void;
  profilePhotoUrl?: string;
}

export function PersonalInfoSection({ data, onChange, profilePhotoUrl }: PersonalInfoSectionProps) {
  const hasProfilePhoto = Boolean(profilePhotoUrl || data.photoUrl);
  const photoOn = Boolean(data.includePhoto) && hasProfilePhoto;

  return (
    <Box>
      <SectionHeading icon={Person} title={aiCvBuilderCopy.personalInformation} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Profilim’deki bilgiler varsayılan olarak gelir; bu CV için istediğiniz gibi
        değiştirebilirsiniz.
      </Typography>

      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(44, 90, 160, 0.04)',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={photoOn}
              disabled={!hasProfilePhoto}
              onChange={(e) => {
                const on = e.target.checked;
                onChange('includePhoto', on);
                if (on && profilePhotoUrl) {
                  onChange('photoUrl', profilePhotoUrl);
                  onChange('photoSizePt', CV_PHOTO_SIZE_PT);
                }
                if (!on) onChange('photoUrl', '');
              }}
            />
          }
          label="CV’ye profil fotoğrafı ekle (sol üst, oval · 3.5 cm)"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          {hasProfilePhoto
            ? 'Profilim’deki fotoğraf info bloğunun sol üstüne 3.5 cm vesikalık boyutta eklenir; isim ve iletişim ortalı kalır.'
            : 'Önce Profilim’den fotoğraf yükleyin.'}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <EditorField
            labelText={aiCvBuilderCopy.firstName}
            value={data.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
          />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <EditorField
            labelText={aiCvBuilderCopy.lastName}
            value={data.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
          />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <EditorField
            labelText={aiCvBuilderCopy.title}
            value={data.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="e.g. Senior UX Designer"
          />
        </Box>
        <EditorField
          labelText={aiCvBuilderCopy.email}
          type="email"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
        <EditorField
          labelText={aiCvBuilderCopy.phone}
          value={data.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
        <EditorField
          labelText={aiCvBuilderCopy.country}
          value={data.country}
          onChange={(e) => onChange('country', e.target.value)}
        />
        <EditorField
          labelText={aiCvBuilderCopy.city}
          value={data.city}
          onChange={(e) => onChange('city', e.target.value)}
        />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <EditorField
            labelText={aiCvBuilderCopy.portfolio}
            value={data.portfolio}
            onChange={(e) => onChange('portfolio', e.target.value)}
          />
        </Box>
        <EditorField
          labelText={aiCvBuilderCopy.github}
          value={data.github}
          onChange={(e) => onChange('github', e.target.value)}
        />
        <EditorField
          labelText={aiCvBuilderCopy.linkedin}
          value={data.linkedin}
          onChange={(e) => onChange('linkedin', e.target.value)}
        />
      </Box>
    </Box>
  );
}
