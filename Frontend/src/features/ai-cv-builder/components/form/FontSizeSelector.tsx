'use client';

import {
  Box,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  CV_BODY_FONT_SIZES,
  CV_HEADING_FONT_SIZES,
  CV_JOB_TITLE_FONT_SIZES,
  CV_NAME_FONT_SIZES,
  CV_PROFILE_TITLE_FONT_SIZES,
  CV_SKILLS_FONT_SIZES,
  type CvBodyFontSize,
  type CvHeadingFontSize,
  type CvJobTitleFontSize,
  type CvNameFontSize,
  type CvProfileTitleFontSize,
  type CvSkillsFontSize,
} from '@/components/cv-maker/cvTypography';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';

interface FontSizeSelectorProps {
  nameValue: CvNameFontSize;
  profileTitleValue: CvProfileTitleFontSize;
  bodyValue: CvBodyFontSize;
  headingValue: CvHeadingFontSize;
  jobTitleValue: CvJobTitleFontSize;
  skillsValue: CvSkillsFontSize;
  onNameChange: (value: CvNameFontSize) => void;
  onProfileTitleChange: (value: CvProfileTitleFontSize) => void;
  onBodyChange: (value: CvBodyFontSize) => void;
  onHeadingChange: (value: CvHeadingFontSize) => void;
  onJobTitleChange: (value: CvJobTitleFontSize) => void;
  onSkillsChange: (value: CvSkillsFontSize) => void;
}

export function FontSizeSelector({
  nameValue,
  profileTitleValue,
  bodyValue,
  headingValue,
  jobTitleValue,
  skillsValue,
  onNameChange,
  onProfileTitleChange,
  onBodyChange,
  onHeadingChange,
  onJobTitleChange,
  onSkillsChange,
}: FontSizeSelectorProps) {
  const { colors, fonts } = dashboardTokens;

  const labelSx = {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: colors.onSurfaceVariant,
    mb: 1,
  } as const;

  return (
    <Box>
      <Typography sx={{ ...labelSx, mb: 1.5 }}>{aiCvBuilderCopy.fontSizeSelect}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <FormLabel sx={labelSx}>{aiCvBuilderCopy.fontSizeName}</FormLabel>
          <Select
            value={nameValue}
            onChange={(e) => onNameChange(Number(e.target.value) as CvNameFontSize)}
          >
            {CV_NAME_FONT_SIZES.map((size) => (
              <MenuItem key={size} value={size}>
                {size} pt
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <FormLabel sx={labelSx}>{aiCvBuilderCopy.fontSizeProfileTitle}</FormLabel>
          <Select
            value={profileTitleValue}
            onChange={(e) =>
              onProfileTitleChange(Number(e.target.value) as CvProfileTitleFontSize)
            }
          >
            {CV_PROFILE_TITLE_FONT_SIZES.map((size) => (
              <MenuItem key={size} value={size}>
                {size} pt
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <FormLabel sx={labelSx}>{aiCvBuilderCopy.fontSizeBody}</FormLabel>
          <Select
            value={bodyValue}
            onChange={(e) => onBodyChange(Number(e.target.value) as CvBodyFontSize)}
          >
            {CV_BODY_FONT_SIZES.map((size) => (
              <MenuItem key={size} value={size}>
                {size} pt
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <FormLabel sx={labelSx}>{aiCvBuilderCopy.fontSizeSkills}</FormLabel>
          <Select
            value={skillsValue}
            onChange={(e) => onSkillsChange(Number(e.target.value) as CvSkillsFontSize)}
          >
            {CV_SKILLS_FONT_SIZES.map((size) => (
              <MenuItem key={size} value={size}>
                {size} pt
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <FormLabel sx={labelSx}>{aiCvBuilderCopy.fontSizeJobTitle}</FormLabel>
          <Select
            value={jobTitleValue}
            onChange={(e) => onJobTitleChange(Number(e.target.value) as CvJobTitleFontSize)}
          >
            {CV_JOB_TITLE_FONT_SIZES.map((size) => (
              <MenuItem key={size} value={size}>
                {size} pt
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <FormLabel sx={labelSx}>{aiCvBuilderCopy.fontSizeHeading}</FormLabel>
          <Select
            value={headingValue}
            onChange={(e) => onHeadingChange(Number(e.target.value) as CvHeadingFontSize)}
          >
            {CV_HEADING_FONT_SIZES.map((size) => (
              <MenuItem key={size} value={size}>
                {size} pt
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Typography
        sx={{
          mt: 1,
          fontSize: 11,
          color: colors.onSurfaceVariant,
        }}
      >
        {aiCvBuilderCopy.fontSizeHint}
      </Typography>
    </Box>
  );
}
