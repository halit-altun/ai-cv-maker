'use client';

import { Box } from '@mui/material';
import { Person } from '@mui/icons-material';
import { SectionHeading } from './common/SectionHeading';
import { EditorField } from './common/EditorField';
import { aiCvBuilderCopy } from '../../constants/copy';
import type { PersonalInfoState } from '../../utils/cvFormUtils';

interface PersonalInfoSectionProps {
  data: PersonalInfoState;
  onChange: (field: string, value: string) => void;
}

export function PersonalInfoSection({ data, onChange }: PersonalInfoSectionProps) {
  return (
    <Box>
      <SectionHeading icon={Person} title={aiCvBuilderCopy.personalInformation} />
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
