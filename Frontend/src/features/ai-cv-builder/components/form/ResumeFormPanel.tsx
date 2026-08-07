'use client';

import { Alert, Box, Typography } from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';
import type { AiCvBuilderState } from '../../hooks/useAiCvBuilderState';
import { CvStrengthBadge } from './common/CvStrengthBadge';
import { LanguageSelector } from './LanguageSelector';
import { FontSizeSelector } from './FontSizeSelector';
import { BadgeStyleSelector } from './BadgeStyleSelector';
import { CvUploadSection } from './CvUploadSection';
import { PersonalInfoSection } from './PersonalInfoSection';
import { AboutSection } from './AboutSection';
import { WorkExperienceSection } from './WorkExperienceSection';
import { EducationSection } from './EducationSection';
import { SkillsSection } from './SkillsSection';
import { LanguagesSection } from './LanguagesSection';

interface ResumeFormPanelProps {
  state: AiCvBuilderState;
}

export function ResumeFormPanel({ state }: ResumeFormPanelProps) {
  const { colors, fonts } = dashboardTokens;

  return (
    <Box
      component="section"
      sx={{
        width: { xs: '100%', lg: '50%', xl: 450 },
        flexShrink: 0,
        bgcolor: '#fff',
        borderRight: `1px solid ${colors.outlineVariant}`,
        p: 3,
        height: { xs: 'auto', lg: 'calc(100vh - 64px)' },
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#E2E8F0',
          borderRadius: 10,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 5,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: 20,
            lineHeight: '28px',
            fontWeight: 600,
            color: colors.primary,
          }}
        >
          {aiCvBuilderCopy.resumeDetails}
        </Typography>
        <CvStrengthBadge percent={state.strengthPercent} />
      </Box>

      {state.loadError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {state.loadError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <LanguageSelector value={state.language} onChange={state.setLanguage} />
        <FontSizeSelector
          bodyValue={state.bodyFontSize}
          headingValue={state.headingFontSize}
          jobTitleValue={state.jobTitleFontSize}
          skillsValue={state.skillsFontSize}
          onBodyChange={state.setBodyFontSize}
          onHeadingChange={state.setHeadingFontSize}
          onJobTitleChange={state.setJobTitleFontSize}
          onSkillsChange={state.setSkillsFontSize}
        />
        <BadgeStyleSelector
          label={aiCvBuilderCopy.skillsStyleSelect}
          value={state.skillsStyle}
          onChange={state.setSkillsStyle}
        />
        <BadgeStyleSelector
          label={aiCvBuilderCopy.languagesStyleSelect}
          value={state.languagesStyle}
          onChange={state.setLanguagesStyle}
        />
        <CvUploadSection
          selectedFile={state.selectedFile}
          isUploading={state.isUploading}
          uploadMessage={state.uploadMessage}
          uploadError={state.uploadError}
          onFileChange={state.handleFileChange}
          onAnalyze={state.handleAnalyzeUploadedCV}
        />
        <PersonalInfoSection
          data={state.personalInfo}
          onChange={state.handlePersonalInfoChange}
          profilePhotoUrl={state.profilePhotoUrl}
        />
        <AboutSection value={state.about} onChange={state.setAbout} />
        <WorkExperienceSection
          data={state.workExperience}
          onChange={state.setWorkExperience}
          aboutData={state.about}
          isEnglish={state.isEnglish}
        />
        <EducationSection data={state.education} onChange={state.setEducation} />
        <SkillsSection
          data={state.skills}
          onChange={state.setSkills}
          workExperience={state.workExperience}
        />
        <LanguagesSection data={state.languages} onChange={state.setLanguages} />
      </Box>
    </Box>
  );
}
