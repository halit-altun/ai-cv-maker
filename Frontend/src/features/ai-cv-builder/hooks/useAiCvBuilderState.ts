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
import type {
  CvBadgeStyle,
  CvBodyFontSize,
  CvHeadingFontSize,
  CvJobTitleFontSize,
  CvNameFontSize,
  CvProfileTitleFontSize,
  CvSkillsFontSize,
} from '@/components/cv-maker/cvTypography';
import {
  DEFAULT_CV_BODY_FONT_SIZE,
  DEFAULT_CV_HEADING_FONT_SIZE,
  DEFAULT_CV_JOB_TITLE_FONT_SIZE,
  DEFAULT_CV_NAME_FONT_SIZE,
  DEFAULT_CV_PROFILE_TITLE_FONT_SIZE,
  DEFAULT_CV_SKILLS_FONT_SIZE,
} from '@/components/cv-maker/cvTypography';
import { authFetch } from '@/lib/auth/authFetch';
import type { AuthUser } from '@/lib/auth/types';

function personalInfoFromProfile(user: AuthUser): PersonalInfoState {
  const fullParts = String(user.fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: user.firstName || fullParts[0] || '',
    lastName: user.lastName || (fullParts.length > 1 ? fullParts.slice(1).join(' ') : ''),
    title: user.title || '',
    country: user.country || '',
    city: user.city || '',
    phone: user.phone || '',
    email: user.contactEmail || user.email || '',
    portfolio: user.portfolioUrl || '',
    github: user.githubUrl || '',
    linkedin: user.linkedinUrl || '',
    photoUrl: user.profileImageUrl || '',
    includePhoto: false,
  };
}

function mergeEmptyPersonalInfo(
  current: PersonalInfoState,
  defaults: PersonalInfoState
): PersonalInfoState {
  const next = { ...current };
  (Object.keys(defaults) as Array<keyof PersonalInfoState>).forEach((key) => {
    if (key === 'includePhoto') return;
    if (typeof defaults[key] === 'boolean') return;
    const currentVal = String(current[key] || '').trim();
    const defaultVal = String(defaults[key] || '').trim();
    if (!currentVal && defaultVal) {
      next[key] = defaults[key] as never;
    }
  });
  if (!current.photoUrl && defaults.photoUrl) {
    next.photoUrl = defaults.photoUrl;
  }
  return next;
}

export function useAiCvBuilderState(cvId?: string) {
  const isEditMode = Boolean(cvId);

  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [nameFontSize, setNameFontSize] = useState<CvNameFontSize>(DEFAULT_CV_NAME_FONT_SIZE);
  const [profileTitleFontSize, setProfileTitleFontSize] = useState<CvProfileTitleFontSize>(
    DEFAULT_CV_PROFILE_TITLE_FONT_SIZE
  );
  const [bodyFontSize, setBodyFontSize] = useState<CvBodyFontSize>(DEFAULT_CV_BODY_FONT_SIZE);
  const [headingFontSize, setHeadingFontSize] = useState<CvHeadingFontSize>(
    DEFAULT_CV_HEADING_FONT_SIZE
  );
  const [jobTitleFontSize, setJobTitleFontSize] = useState<CvJobTitleFontSize>(
    DEFAULT_CV_JOB_TITLE_FONT_SIZE
  );
  const [skillsFontSize, setSkillsFontSize] = useState<CvSkillsFontSize>(
    DEFAULT_CV_SKILLS_FONT_SIZE
  );
  const [skillsStyle, setSkillsStyle] = useState<CvBadgeStyle>('plain');
  const [languagesStyle, setLanguagesStyle] = useState<CvBadgeStyle>('plain');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoState>(emptyPersonalInfo);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [about, setAbout] = useState('');
  const [workExperience, setWorkExperience] = useState<WorkExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  // Yeni CV: Profilim alanlarını varsayılan doldur (dolu alanlara dokunma)
  useEffect(() => {
    if (cvId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch('/api/auth/me');
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: AuthUser;
        };
        if (cancelled || !res.ok || !data.user) return;
        const defaults = personalInfoFromProfile(data.user);
        setProfilePhotoUrl(data.user.profileImageUrl || '');
        setPersonalInfo((prev) => mergeEmptyPersonalInfo(prev, defaults));
      } catch {
        // profil yoksa sessiz
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cvId]);

  useEffect(() => {
    if (!cvId) return;

    let cancelled = false;

    async function load() {
      try {
        const data = await getCvById(cvId!);
        if (cancelled) return;
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
          photoUrl: (data.personalInfo as { photoUrl?: string }).photoUrl ?? '',
          includePhoto: Boolean((data.personalInfo as { includePhoto?: boolean }).includePhoto),
        });
        setAbout(data.about ?? '');
        setWorkExperience(normalizeWorkExperience(data.workExperience ?? []));
        setEducation(normalizeEducation(data.education ?? []));
        setSkills(Array.isArray(data.skills) ? data.skills.map(String) : []);
        setLanguages(normalizeLanguages(data.languages ?? []));
      } catch {
        if (!cancelled) setLoadError(aiCvBuilderCopy.notFound);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const handlePersonalInfoChange = useCallback((field: string, value: string | boolean) => {
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
          photoUrl: personalInfo.photoUrl || profilePhotoUrl || '',
          includePhoto: personalInfo.includePhoto,
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
    nameFontSize,
    setNameFontSize,
    profileTitleFontSize,
    setProfileTitleFontSize,
    bodyFontSize,
    setBodyFontSize,
    headingFontSize,
    setHeadingFontSize,
    jobTitleFontSize,
    setJobTitleFontSize,
    skillsFontSize,
    setSkillsFontSize,
    skillsStyle,
    setSkillsStyle,
    languagesStyle,
    setLanguagesStyle,
    selectedFile,
    isUploading,
    uploadMessage,
    uploadError,
    loadError,
    personalInfo,
    profilePhotoUrl,
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
