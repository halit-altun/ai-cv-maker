'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorkExperienceItem } from '@/components/cv-maker/WorkExperience';
import type { EducationItem } from '@/components/cv-maker/Education';
import type { LanguageItem } from '@/components/cv-maker/Languages';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';
import { getCvById } from '../data/cvRepository';
import {
  computeCvStrength,
  emptyPersonalInfo,
  normalizeEducation,
  normalizeLanguages,
  normalizeWorkExperience,
  type PersonalInfoState,
} from '../utils/cvFormUtils';
import { aiCvBuilderCopy } from '../constants/copy';

export function useAiCvBuilderState(cvId?: string) {
  const isEditMode = Boolean(cvId);

  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoState>(emptyPersonalInfo);
  const [about, setAbout] = useState('');
  const [workExperience, setWorkExperience] = useState<WorkExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  useEffect(() => {
    if (!cvId) return;
    const data = getCvById(cvId);
    if (!data) {
      setLoadError(aiCvBuilderCopy.notFound);
      return;
    }
    setLoadError('');
    setPersonalInfo({
      firstName: data.personalInfo.firstName ?? '',
      lastName: data.personalInfo.lastName ?? '',
      title: data.personalInfo.title ?? '',
      country: data.personalInfo.country ?? '',
      city: data.personalInfo.city ?? '',
      phone: data.personalInfo.phone ?? '',
      email: data.personalInfo.email ?? '',
      portfolio: data.personalInfo.portfolio ?? '',
      github: data.personalInfo.github ?? '',
      linkedin: data.personalInfo.linkedin ?? '',
    });
    setAbout(data.about ?? '');
    setWorkExperience(normalizeWorkExperience(data.workExperience ?? []));
    setEducation(normalizeEducation(data.education ?? []));
    setSkills(Array.isArray(data.skills) ? data.skills.map(String) : []);
    setLanguages(normalizeLanguages(data.languages ?? []));
  }, [cvId]);

  const handlePersonalInfoChange = useCallback((field: string, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMessage('');
    setUploadError('');
  }, []);

  const handleAnalyzeUploadedCV = useCallback(async () => {
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
          linkedin: parsedData.personalInfo.linkedin ?? '',
        });
      }
      setAbout(parsedData.about ?? '');
      setWorkExperience(normalizeWorkExperience(parsedData.workExperience ?? []));
      setEducation(normalizeEducation(parsedData.education ?? []));
      setSkills(
        Array.isArray(parsedData.skills)
          ? parsedData.skills.map((s: string) => String(s ?? ''))
          : []
      );
      setLanguages(normalizeLanguages(parsedData.languages ?? []));
      setUploadMessage('CV başarıyla analiz edildi. Form alanları otomatik dolduruldu.');
    } catch (error) {
      console.error('CV upload/analyze error:', error);
      setUploadError(
        'CV analiz edilirken bir hata oluştu. Lütfen farklı bir dosya ile tekrar deneyin.'
      );
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, language]);

  const strengthPercent = useMemo(
    () =>
      computeCvStrength({
        personalInfo,
        about,
        workExperience,
        education,
        skills,
        languages,
      }),
    [personalInfo, about, workExperience, education, skills, languages]
  );

  const cvData = useMemo(
    () => ({
      personalInfo,
      about,
      workExperience,
      education,
      skills,
      languages,
    }),
    [personalInfo, about, workExperience, education, skills, languages]
  );

  return {
    isEditMode,
    language,
    setLanguage,
    selectedFile,
    isUploading,
    uploadMessage,
    uploadError,
    loadError,
    personalInfo,
    handlePersonalInfoChange,
    about,
    setAbout,
    workExperience,
    setWorkExperience,
    education,
    setEducation,
    skills,
    setSkills,
    languages,
    setLanguages,
    handleFileChange,
    handleAnalyzeUploadedCV,
    strengthPercent,
    cvData,
    isEnglish: language === 'en',
  };
}

export type AiCvBuilderState = ReturnType<typeof useAiCvBuilderState>;
