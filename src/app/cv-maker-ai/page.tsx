'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material';
import PersonalInfo from '@/components/cv-maker/PersonalInfo';
import About from '@/components/cv-maker/About';
import WorkExperience, { WorkExperienceItem } from '@/components/cv-maker/WorkExperience';
import Education, { EducationItem } from '@/components/cv-maker/Education';
import Skills from '@/components/cv-maker/Skills';
import Languages, { LanguageItem } from '@/components/cv-maker/Languages';
import CVPreview from '@/components/cv-maker/CVPreview';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';

export default function CVMakerAI() {
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
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

  const normalizeWorkExperience = (items: any[]): WorkExperienceItem[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => ({
      id: item?.id ? String(item.id) : `${Date.now()}-exp-${index}`,
      position: item?.position ?? '',
      company: item?.company ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      country: item?.country ?? '',
      city: item?.city ?? '',
      bulletPoints: Array.isArray(item?.bulletPoints) && item.bulletPoints.length > 0
        ? item.bulletPoints.map((bp: string) => String(bp ?? ''))
        : ['']
    }));
  };

  const normalizeEducation = (items: any[]): EducationItem[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => ({
      id: item?.id ? String(item.id) : `${Date.now()}-edu-${index}`,
      university: item?.university ?? '',
      department: item?.department ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? ''
    }));
  };

  const normalizeLanguages = (items: any[]): LanguageItem[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => ({
      id: item?.id ? String(item.id) : `${Date.now()}-lang-${index}`,
      language: item?.language ?? '',
      level: item?.level ?? ''
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMessage('');
    setUploadError('');
  };

  const handleAnalyzeUploadedCV = async () => {
    if (!selectedFile) {
      setUploadError('Lütfen önce bir CV dosyası seçin.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadMessage('');

    try {
      const cvText = await CompanyBasedCVService.extractTextFromPDF(selectedFile);
      const parsedData = await CompanyBasedCVService.parseCVDataWithAI(
        cvText,
        language === 'en' ? 'english' : 'turkish'
      );

      if (parsedData.personalInfo) {
        setPersonalInfo({
          firstName: parsedData.personalInfo.firstName ?? '',
          lastName: parsedData.personalInfo.lastName ?? '',
          title: parsedData.personalInfo.title ?? '',
          country: parsedData.personalInfo.country ?? '',
          city: parsedData.personalInfo.city ?? '',
          phone: parsedData.personalInfo.phone ?? '',
          email: parsedData.personalInfo.email ?? '',
          portfolio: parsedData.personalInfo.portfolio ?? '',
          github: parsedData.personalInfo.github ?? '',
          linkedin: parsedData.personalInfo.linkedin ?? ''
        });
      }

      setAbout(parsedData.about ?? '');
      setWorkExperience(normalizeWorkExperience(parsedData.workExperience ?? []));
      setEducation(normalizeEducation(parsedData.education ?? []));
      setSkills(Array.isArray(parsedData.skills) ? parsedData.skills.map((skill: string) => String(skill ?? '')) : []);
      setLanguages(normalizeLanguages(parsedData.languages ?? []));

      setUploadMessage('CV başarıyla analiz edildi. Form alanları otomatik dolduruldu.');
    } catch (error) {
      console.error('CV upload/analyze error:', error);
      setUploadError('CV analiz edilirken bir hata oluştu. Lütfen farklı bir dosya ile tekrar deneyin.');
    } finally {
      setIsUploading(false);
    }
  };

  const cvData = {
    personalInfo,
    about,
    workExperience,
    education,
    skills,
    languages
  };

  const isEnglish = language === 'en';

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

        {/* Dil Seçimi */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              Dil Seçimi / Language Selection
            </FormLabel>
            <RadioGroup
              row
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'tr' | 'en')}
            >
              <FormControlLabel value="tr" control={<Radio />} label="Türkçe" />
              <FormControlLabel value="en" control={<Radio />} label="English" />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* CV Upload + AI Analiz */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            CV Yükle ve Otomatik Doldur
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            CV dosyanı yükle, AI içeriği analiz edip form alanlarını otomatik doldursun.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Button variant="outlined" component="label" disabled={isUploading}>
              Dosya Seç
              <input hidden type="file" accept=".pdf" onChange={handleFileChange} />
            </Button>

            <Button
              variant="contained"
              onClick={handleAnalyzeUploadedCV}
              disabled={!selectedFile || isUploading}
              startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isUploading ? 'AI analiz ediyor...' : 'AI ile otomatik doldur'}
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                Seçilen dosya: {selectedFile.name}
              </Typography>
            )}
          </Box>

          {uploadMessage && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {uploadMessage}
            </Alert>
          )}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
        </Paper>

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
              isEnglish={isEnglish}
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
            <CVPreview data={cvData} isEnglish={isEnglish} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
