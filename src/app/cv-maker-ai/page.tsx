'use client';

import React, { useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import PersonalInfo from '@/components/cv-maker/PersonalInfo';
import About from '@/components/cv-maker/About';
import WorkExperience, { WorkExperienceItem } from '@/components/cv-maker/WorkExperience';
import Education, { EducationItem } from '@/components/cv-maker/Education';
import Skills from '@/components/cv-maker/Skills';
import Languages, { LanguageItem } from '@/components/cv-maker/Languages';
import CVPreview from '@/components/cv-maker/CVPreview';

export default function CVMakerAI() {
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    title: '',
    country: '',
    city: '',
    phone: '',
    email: '',
    portfolio: '',
    github: '',
    linkedin: ''
  });

  const [about, setAbout] = useState('');
  const [workExperience, setWorkExperience] = useState<WorkExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  const handlePersonalInfoChange = (field: string, value: string) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  const cvData = {
    personalInfo,
    about,
    workExperience,
    education,
    skills,
    languages
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="xl">
        <Typography
          variant="h3"
          sx={{
            textAlign: 'center',
            mb: 4,
            fontWeight: 700,
            color: '#1a1a1a',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}
        >
          CV Maker AI
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
            gap: 3
          }}
        >
          {/* Sol Taraf - Form Alanları */}
          <Box>
            <PersonalInfo
              data={personalInfo}
              onChange={handlePersonalInfoChange}
            />

            <About
              data={about}
              onChange={setAbout}
            />

            <WorkExperience
              data={workExperience}
              onChange={setWorkExperience}
              aboutData={about}
            />

            <Education
              data={education}
              onChange={setEducation}
            />

            <Skills
              data={skills}
              onChange={setSkills}
              workExperienceData={workExperience}
            />

            <Languages
              data={languages}
              onChange={setLanguages}
            />
          </Box>

          {/* Sağ Taraf - CV Önizleme */}
          <Box>
            <CVPreview data={cvData} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
