'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
  LinearProgress,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch
} from '@mui/material';
import {
  Upload as UploadIcon,
  Link as LinkIcon,
  AutoAwesome as AutoAwesomeIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  ContentCopy as ContentCopyIcon,
  Autorenew as AutorenewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import CompanyBasedCVPreview from '@/components/company-based-cv-editor/CompanyBasedCVPreview';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';
import {
  clearCachedCompanyCvPdf,
  loadCachedCompanyCvPdf,
  saveCachedCompanyCvPdf
} from '@/lib/company-based-cv-editor/cachedCvFile';
import { CompanyBasedCVData, CompanyInfo, CVAnalysisResponse, CompanyLink } from '@/lib/company-based-cv-editor/types';

const steps = [
  'CV Yükle',
  'Şirket Linkleri Gir',
  'Analiz Et',
  'Önizleme'
];

interface AIAdaptationSettings {
  about: boolean;
  workExperience: boolean;
  skills: boolean;
}

const defaultAISettings: AIAdaptationSettings = {
  about: true,
  workExperience: false,
  skills: false
};

const ANALYSIS_PREFS_STORAGE_KEY = 'company_based_cv_editor_analysis_preferences_v1';
const GEMINI_MODE_STORAGE_KEY = 'company_based_cv_editor_gemini_mode_v1';

const readGeminiModeFromStorage = (): { single: boolean } => {
  if (typeof window === 'undefined') return { single: true };
  try {
    const raw = localStorage.getItem(GEMINI_MODE_STORAGE_KEY);
    if (!raw) return { single: true };
    const p = JSON.parse(raw) as { useSingleGeminiRequest?: boolean };
    const single = typeof p.useSingleGeminiRequest === 'boolean' ? p.useSingleGeminiRequest : true;
    return { single };
  } catch {
    return { single: true };
  }
};

export default function CompanyBasedCVEditor() {
  const [activeStep, setActiveStep] = useState(0);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [companyLinks, setCompanyLinks] = useState<CompanyLink[]>([{ url: '', description: '' }]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [cvData, setCvData] = useState<CompanyBasedCVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResponse | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterLanguage, setCoverLetterLanguage] = useState<'turkish' | 'english'>('turkish');
  const [shouldGenerateCoverLetter, setShouldGenerateCoverLetter] = useState(true);
  const [cvAdaptationSource, setCvAdaptationSource] = useState<'company' | 'text'>('company');
  const [coverLetterSource, setCoverLetterSource] = useState<'company' | 'text'>('company');
  const [coverLetterRecipientName, setCoverLetterRecipientName] = useState<string>('');
  const [coverLetterCompanyName, setCoverLetterCompanyName] = useState<string>('');
  const [linkedinMessage, setLinkedinMessage] = useState('');
  const [linkedinMessageLanguage, setLinkedinMessageLanguage] = useState<'turkish' | 'english'>('turkish');
  const [shouldGenerateLinkedInMessage, setShouldGenerateLinkedInMessage] = useState(false);
  const [linkedinMessageSource, setLinkedinMessageSource] = useState<'company' | 'text'>('company');
  const [targetPosition, setTargetPosition] = useState<string>('');
  const [manualMustMentionTopicsText, setManualMustMentionTopicsText] = useState<string>('');
  const [manualMustNotMentionTopicsText, setManualMustNotMentionTopicsText] = useState<string>('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AIAdaptationSettings>(defaultAISettings);
  const [isEditing, setIsEditing] = useState(false);
  const [editableCVData, setEditableCVData] = useState<CompanyBasedCVData | null>(null);
  const [cvLanguage, setCvLanguage] = useState<'turkish' | 'english'>('turkish');
  const [cvRestoredFromCache, setCvRestoredFromCache] = useState(false);
  const [useSingleGeminiRequest, setUseSingleGeminiRequest] = useState(
    () => readGeminiModeFromStorage().single
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sayfa yenilense bile son yüklenen PDF (IndexedDB)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached = await loadCachedCompanyCvPdf();
        if (cancelled || !cached) return;
        setCvFile(cached.file);
        setCvLanguage(cached.cvLanguage);
        setCvRestoredFromCache(true);
      } catch (err) {
        console.warn('Kayıtlı CV yüklenemedi:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cvFile) return;
    void saveCachedCompanyCvPdf(cvFile, cvLanguage).catch((err) => {
      console.warn('CV tarayıcı önbelleğine yazılamadı:', err);
    });
  }, [cvFile, cvLanguage]);

  // Geçici DB (localStorage): analiz tercihlerini her yeni analizde hazır tutar.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ANALYSIS_PREFS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        targetPosition?: string;
        manualMustMentionTopicsText?: string;
        manualMustNotMentionTopicsText?: string;
        coverLetterRecipientName?: string;
        coverLetterCompanyName?: string;
      };

      if (typeof parsed.targetPosition === 'string') {
        setTargetPosition(parsed.targetPosition);
      }
      if (typeof parsed.manualMustMentionTopicsText === 'string') {
        setManualMustMentionTopicsText(parsed.manualMustMentionTopicsText);
      }
      if (typeof parsed.manualMustNotMentionTopicsText === 'string') {
        setManualMustNotMentionTopicsText(parsed.manualMustNotMentionTopicsText);
      }
      if (typeof parsed.coverLetterRecipientName === 'string') {
        setCoverLetterRecipientName(parsed.coverLetterRecipientName);
      }
      if (typeof parsed.coverLetterCompanyName === 'string') {
        setCoverLetterCompanyName(parsed.coverLetterCompanyName);
      }
    } catch (err) {
      console.warn('Analiz tercihleri localStorage yüklenemedi:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        GEMINI_MODE_STORAGE_KEY,
        JSON.stringify({
          useSingleGeminiRequest
        })
      );
    } catch (err) {
      console.warn('Gemini istek modu kaydedilemedi:', err);
    }
  }, [useSingleGeminiRequest]);

  useEffect(() => {
    try {
      localStorage.setItem(
        ANALYSIS_PREFS_STORAGE_KEY,
        JSON.stringify({
          targetPosition,
          manualMustMentionTopicsText,
          manualMustNotMentionTopicsText,
          coverLetterRecipientName,
          coverLetterCompanyName
        })
      );
    } catch (err) {
      console.warn('Analiz tercihleri localStorage kaydedilemedi:', err);
    }
  }, [
    targetPosition,
    manualMustMentionTopicsText,
    manualMustNotMentionTopicsText,
    coverLetterRecipientName,
    coverLetterCompanyName
  ]);

  const sanitizeRoleTitle = (input: string) => {
    let role = (input || '').trim();
    role = role.replace(/^[\-\s:]+|[\-\s:]+$/g, '');
    role = role.replace(/\s+/g, ' ');
    // "Founding" çoğu zaman rolün çekirdeği değil, stage bilgisidir.
    role = role.replace(/^founding\s+/i, '');
    return role.trim();
  };

  /** Cover letter açıksa onun kaynağı; değilse yalnızca LinkedIn mesajı kaynağı. */
  const resolveOutreachSource = (): 'company' | 'text' | null => {
    if (shouldGenerateCoverLetter) return coverLetterSource;
    if (shouldGenerateLinkedInMessage) return linkedinMessageSource;
    return null;
  };

  const extractTargetPositionFromJobText = (jobText: string) => {
    const text = (jobText || '').trim();
    if (!text) return '';

    const patterns: RegExp[] = [
      /(?:position|role)\s+(?:at|for)?\s*(?:an?|the)?\s*([A-Za-z0-9+\/\-\s]{3,80}(?:Engineer|Developer|Manager|Specialist|Architect))/i,
      /looking for\s+(?:an?|the)?\s*([A-Za-z0-9+\/\-\s]{3,80}(?:Engineer|Developer|Manager|Specialist|Architect))/i,
      /^([A-Za-z][A-Za-z0-9+\/\-\s]{3,80}(?:Engineer|Developer|Manager|Specialist|Architect))$/im
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const captured = match?.[1] || match?.[0] || '';
      const normalized = sanitizeRoleTitle(captured);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return '';
  };

  // AI'dan gelen metinleri parse et - sadece bullet point'leri uyarla
  const parseWorkExperienceFromText = (text: string) => {
    if (!text) return [];
    
    console.log('AI Work Experience Text:', text);
    
    // AI'dan gelen metni iş deneyimlerine böl - daha akıllı parsing
    // Önce \n\n ile böl, sonra her bölümü kontrol et
    let workExperienceSections = text.split('\n\n').filter(section => section.trim().length > 0);
    
    // Eğer sadece 1 bölüm varsa, orijinal CV'den 2 iş deneyimi olduğunu biliyoruz
    // AI metnini manuel olarak 2 parçaya böl
    if (workExperienceSections.length === 1) {
      console.log('AI returned only 1 experience, splitting manually...');
      const lines = workExperienceSections[0].split('\n');
      
      // İkinci iş deneyiminin başlangıcını bul (genellikle "Stajyer" veya benzeri kelimelerle başlar)
      let secondExpStartIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Stajyer') || lines[i].includes('Backend') || lines[i].includes('Developer')) {
          secondExpStartIndex = i;
          break;
        }
      }
      
      if (secondExpStartIndex > 0) {
        const firstExp = lines.slice(0, secondExpStartIndex).join('\n');
        const secondExp = lines.slice(secondExpStartIndex).join('\n');
        workExperienceSections = [firstExp, secondExp];
        console.log('Manually split into 2 experiences');
      }
    }
    
    console.log('Work Experience Sections:', workExperienceSections.length);
    
    // Her iş deneyimi için bullet point'leri çıkar
    const parsedExperiences = workExperienceSections.map((section, index) => {
      const lines = section.split('\n');
      const headerLine = lines[0]; // İlk satır: pozisyon, şirket, tarih
      const bulletLines = lines.slice(1).filter(line => 
        line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')
      );
      
      // Bullet point'leri temizle
      const bulletPoints = bulletLines.map(line => 
        line.replace(/^[•\-\*]\s*/, '').trim()
      ).filter(point => point.length > 0);
      
      console.log(`Experience ${index + 1}:`, {
        header: headerLine,
        bulletCount: bulletPoints.length,
        bullets: bulletPoints
      });
      
      // Orijinal CV'den pozisyon ve şirket bilgilerini al
      // AI sadece bullet point'leri uyarlar, diğer bilgiler orijinal CV'den gelir
      const originalWorkExperience = cvData?.workExperience || [];
      const originalExp = originalWorkExperience[index];
      
      console.log(`Experience ${index + 1} - Original:`, originalExp);
      
      // Eğer orijinal CV'den bilgi yoksa, AI'dan gelen header'ı parse et
      let position = originalExp?.position || '';
      let company = originalExp?.company || '';
      let startDate = originalExp?.startDate || '2025-01';
      let endDate = originalExp?.endDate || 'Present';
      let city = originalExp?.city || 'İstanbul';
      let country = originalExp?.country || 'Türkiye';
      
      // AI metninden tarih bilgilerini parse et
      const sectionLines = section.split('\n');
      console.log(`Experience ${index + 1} - AI Section Lines:`, sectionLines);
      
      // Tarih bilgilerini AI metninden bul
      for (const line of sectionLines) {
        // Tarih formatlarını ara: "01/2025 - Present", "08/2023 - 10/2023"
        const dateMatch = line.match(/(\d{2}\/\d{4})\s*-\s*(Present|\d{2}\/\d{4})/);
        if (dateMatch) {
          const [, startDateStr, endDateStr] = dateMatch;
          console.log(`Found date in line: ${line}`);
          console.log(`Start: ${startDateStr}, End: ${endDateStr}`);
          
          // Tarih formatını dönüştür: "01/2025" -> "2025-01"
          const [month, year] = startDateStr.split('/');
          startDate = `${year}-${month.padStart(2, '0')}`;
          
          if (endDateStr === 'Present') {
            endDate = 'Present';
          } else {
            const [endMonth, endYear] = endDateStr.split('/');
            endDate = `${endYear}-${endMonth.padStart(2, '0')}`;
          }
          
          console.log(`Parsed dates - Start: ${startDate}, End: ${endDate}`);
          break;
        }
      }
      
      // Eğer orijinal CV'den bilgi yoksa, AI header'ından parse et
      if (!position || !company) {
        console.log('Parsing from AI header:', headerLine);
        
        // Basit parsing - ilk satır genellikle pozisyon, ikinci satır şirket
        const lines = section.split('\n');
        if (lines.length >= 2) {
          position = position || lines[0].trim();
          company = company || lines[1].trim();
        }
      }
      
      console.log(`Parsed Experience ${index + 1}:`, {
        position: position,
        company: company,
        startDate,
        endDate
      });
      
      return {
        id: originalExp?.id || (index + 1).toString(),
        position: position || `İş Deneyimi ${index + 1}`,
        company: company || `Şirket ${index + 1}`,
        city: city,
        country: country,
        startDate: startDate,
        endDate: endDate,
        bulletPoints: bulletPoints.length > 0 ? bulletPoints : originalExp?.bulletPoints || ['AI tarafından uyarlanmış iş deneyimi']
      };
    });
    
    console.log('Parsed Work Experiences:', parsedExperiences);
    return parsedExperiences;
  };

  const parseSkillsFromText = (text: string, existingSkills: string[] = []) => {
    const normalizedExisting = (existingSkills || [])
      .map((skill) => String(skill || '').trim())
      .filter(Boolean);
    if (!text) return normalizedExisting;

    // AI'dan gelen metni temizle ve kısa beceri isimlerine dönüştür
    const aiSkills = text
      .split(',')
      .map((skill) => {
        // Uzun açıklamaları temizle, sadece ilk 2 kelimeyi al
        const words = skill.trim().split(' ');
        if (words.length > 2) {
          return words.slice(0, 2).join(' ');
        }
        return skill.trim();
      })
      .filter((skill) => skill.length > 0 && skill.length < 50); // Çok uzun becerileri filtrele

    // Mevcut CV becerilerini KORU, AI'dan gelenleri unique olarak ekle.
    const mergedSkills = Array.from(new Set([...normalizedExisting, ...aiSkills]));
    console.log('Parsed Skills (merged):', mergedSkills);
    return mergedSkills;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setCvFile(file);
      setCvRestoredFromCache(false);
      setError(null);
      setActiveStep(1);
    } else {
      setError('Lütfen geçerli bir PDF dosyası seçin.');
    }
    event.target.value = '';
  };

  const handleClearStoredCv = async () => {
    await clearCachedCompanyCvPdf();
    setCvFile(null);
    setCvRestoredFromCache(false);
    setActiveStep(0);
    setError(null);
  };

  /** Aynı PDF ile ilan/şirket hedefini değiştirip yeniden analiz (sonuçları sıfırlar, CV kalır). */
  const handlePrepareNewAnalysisSameCv = () => {
    setAnalysisResult(null);
    setCvData(null);
    setEditableCVData(null);
    setCoverLetter('');
    setLinkedinMessage('');
    setCompanyInfo(null);
    setIsEditing(false);
    setError(null);
    setActiveStep(1);
  };

  // Company link ekleme fonksiyonları
  const addCompanyLink = () => {
    if (companyLinks.length >= 3) {
      setError('Maksimum 3 link ekleyebilirsiniz.');
      return;
    }
    
    setCompanyLinks(prev => [...prev, { url: '', description: '' }]);
  };

  const removeCompanyLink = (index: number) => {
    setCompanyLinks(prev => prev.filter((_, i) => i !== index));
  };

  const updateCompanyLink = (index: number, field: keyof CompanyLink, value: string) => {
    setCompanyLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ));
  };

  const handleCompanyLinksSubmit = async () => {
    const outreachSource = resolveOutreachSource();
    const needsCompanyInfo =
      cvAdaptationSource === 'company' || outreachSource === 'company';
    const needsJobText =
      cvAdaptationSource === 'text' || outreachSource === 'text';

    // Validation - Job description text
    if (needsJobText && jobDescriptionText.trim().length < 30) {
      setError('İlan metni boş olamaz (en az 30 karakter).');
      return;
    }

    // Validation - Company links (only if needed)
    if (!needsCompanyInfo) {
      setCompanyInfo(null);
      setActiveStep(2);
      return;
    }

    if (companyLinks.length === 0) {
      setError('En az 1 link eklemelisiniz.');
      return;
    }

    for (let i = 0; i < companyLinks.length; i++) {
      const link = companyLinks[i];
      if (!link.url.trim()) {
        setError(`Link ${i + 1}: URL boş olamaz.`);
        return;
      }
      if (!link.description.trim() || link.description.trim().length < 5) {
        setError(`Link ${i + 1}: Açıklama en az 5 karakter olmalıdır.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting company analysis with links:', companyLinks);
      const company = await CompanyBasedCVService.analyzeCompany(companyLinks);
      setCompanyInfo(company);
      setActiveStep(2);
    } catch (err) {
      setError('Şirket bilgileri analiz edilirken bir hata oluştu.');
      console.error('Company analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisPrerequisiteError = (): string | null => {
    const outreachSource = resolveOutreachSource();
    const needsCompanyInfoForCV = cvAdaptationSource === 'company';
    const needsCompanyForOutreach = outreachSource === 'company';
    const needsJobTextForCV = cvAdaptationSource === 'text';
    const needsJobTextForOutreach = outreachSource === 'text';

    if ((needsCompanyInfoForCV || needsCompanyForOutreach) && !companyInfo) {
      return 'Şirket bilgileri gereken bir seçenek seçildi. Lütfen önce şirket linklerini analiz edin.';
    }

    if ((needsJobTextForCV || needsJobTextForOutreach) && jobDescriptionText.trim().length < 30) {
      return 'İlan metni gereken bir seçenek seçildi. Lütfen Job Description metnini doldurun.';
    }

    return null;
  };

  const executeCvAnalysisCore = async () => {
    if (!cvFile) throw new Error('CV dosyası yok');

    const toTopicArray = (value: string) =>
      value
        .split(/\n|;/g)
        .map((t) => t.trim())
        .filter(Boolean);

    const manualMustMentionTopics = toTopicArray(manualMustMentionTopicsText);
    const manualMustNotMentionTopics = toTopicArray(manualMustNotMentionTopicsText);

    const cvText = await CompanyBasedCVService.extractTextFromPDF(cvFile);
    console.log('Extracted CV text:', cvText);

    const jobTextForPositionExtract =
      (shouldGenerateCoverLetter && coverLetterSource === 'text') ||
      (!shouldGenerateCoverLetter && shouldGenerateLinkedInMessage && linkedinMessageSource === 'text');

    const targetPositionHint =
      sanitizeRoleTitle(targetPosition) ||
      (jobTextForPositionExtract ? extractTargetPositionFromJobText(jobDescriptionText) : '') ||
      '';

    const linkedinTargetSource = shouldGenerateCoverLetter ? coverLetterSource : linkedinMessageSource;

    const sharedParams = {
      cvText,
      cvLanguage,
      adaptationSource: cvAdaptationSource,
      companyInfo: companyInfo ?? undefined,
      jobDescriptionText: jobDescriptionText.trim() ? jobDescriptionText : undefined,
      companyUrl: cvAdaptationSource === 'company' ? companyLinks[0]?.url || '' : undefined,
      targetPositionHint,
      manualMustMentionTopics,
      manualMustNotMentionTopics,
      aiAdaptation: aiSettings,
      generateCoverLetter: shouldGenerateCoverLetter,
      generateLinkedInMessage: shouldGenerateLinkedInMessage,
      coverLetterSource,
      linkedinTargetSource,
      coverLetterRecipientName: coverLetterRecipientName.trim() ? coverLetterRecipientName.trim() : undefined,
      coverLetterCompanyName: coverLetterCompanyName.trim() ? coverLetterCompanyName.trim() : undefined
    };

    const unified = useSingleGeminiRequest
      ? await CompanyBasedCVService.analyzeCompanyBasedCvUnified(sharedParams)
      : await CompanyBasedCVService.analyzeCompanyBasedCvLegacyStaggered(sharedParams);

    const parsedCVData = unified.parsedCVData;
    const analysis = unified.analysis;
    console.log('AI CV analiz sonucu:', { parsedCVData, analysis });

    const generatedCoverLetter = shouldGenerateCoverLetter ? unified.coverLetter : '';
    const generatedLinkedInMessage = shouldGenerateLinkedInMessage ? unified.linkedinMessage : '';

    setAnalysisResult(analysis);
    setCoverLetter(shouldGenerateCoverLetter ? generatedCoverLetter : '');
    setCoverLetterLanguage(cvLanguage);
    setLinkedinMessage(shouldGenerateLinkedInMessage ? generatedLinkedInMessage : '');
    setLinkedinMessageLanguage(cvLanguage);

    const adaptedCVData: CompanyBasedCVData = {
      personalInfo: {
        firstName: parsedCVData.personalInfo?.firstName || 'Ad',
        lastName: parsedCVData.personalInfo?.lastName || 'Soyad',
        title: parsedCVData.personalInfo?.title || 'Ünvan',
        country: parsedCVData.personalInfo?.country || '',
        city: parsedCVData.personalInfo?.city || '',
        phone: parsedCVData.personalInfo?.phone || '',
        email: parsedCVData.personalInfo?.email || '',
        portfolio: parsedCVData.personalInfo?.portfolio || '',
        github: parsedCVData.personalInfo?.github || '',
        linkedin: parsedCVData.personalInfo?.linkedin || ''
      },
      about: aiSettings.about ? analysis.updatedAbout : parsedCVData.about || '',
      workExperience: aiSettings.workExperience
        ? parseWorkExperienceFromText(analysis.updatedExperience)
        : parsedCVData.workExperience || [],
      education: parsedCVData.education || [],
      skills: aiSettings.skills
        ? parseSkillsFromText(analysis.updatedSkills, parsedCVData.skills || [])
        : parsedCVData.skills || [],
      languages: parsedCVData.languages || [],
      companyInfo: companyInfo || undefined,
      analysisResult: analysis,
      coverLetter: shouldGenerateCoverLetter ? generatedCoverLetter : undefined,
      linkedinMessage: shouldGenerateLinkedInMessage ? generatedLinkedInMessage : undefined,
      analysisPreferences: {
        targetPosition: sanitizeRoleTitle(targetPosition) || undefined,
        manualMustMentionTopics,
        manualMustNotMentionTopics
      }
    };

    setCvData(adaptedCVData);
    setEditableCVData(adaptedCVData);
  };

  const handleAnalyzeCV = async () => {
    if (!cvFile) return;

    const pre = getAnalysisPrerequisiteError();
    if (pre) {
      setError(pre);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await executeCvAnalysisCore();
      setActiveStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'CV analiz edilirken bir hata oluştu.');
      console.error('CV analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAnalysis = async () => {
    if (!cvFile) {
      setError('CV dosyası bulunamadı. Sayfayı yenileyip PDF’i tekrar yükleyin.');
      return;
    }

    const pre = getAnalysisPrerequisiteError();
    if (pre) {
      setError(pre);
      return;
    }

    setLoading(true);
    setError(null);
    setIsEditing(false);

    try {
      await executeCvAnalysisCore();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Analiz yenilenirken bir hata oluştu.');
      console.error('CV regenerate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCoverLetter = async () => {
    if (!coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter);
    } catch (copyError) {
      console.error('Cover letter kopyalama hatası:', copyError);
    }
  };

  const handleCopyLinkedinMessage = async () => {
    if (!linkedinMessage) return;
    try {
      await navigator.clipboard.writeText(linkedinMessage);
    } catch (copyError) {
      console.error('LinkedIn mesajı kopyalama hatası:', copyError);
    }
  };

  const getWordCount = (value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const coverLetterWordCount = coverLetter ? getWordCount(coverLetter) : 0;

  // Editör fonksiyonları
  const handleStartEditing = () => {
    setIsEditing(true);
    setEditableCVData({ ...cvData! });
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditableCVData(cvData);
  };

  const handleSaveEditing = () => {
    setCvData(editableCVData);
    setIsEditing(false);
  };

  const handleUpdateField = (field: string, value: any) => {
    if (!editableCVData) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const updatedData = { ...editableCVData };
      (updatedData as any)[parent] = {
        ...(updatedData as any)[parent],
        [child]: value
      };
      setEditableCVData(updatedData);
    } else {
      setEditableCVData(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleUpdateWorkExperience = (index: number, field: string, value: any) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    updatedWorkExperience[index] = {
      ...updatedWorkExperience[index],
      [field]: value
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleUpdateWorkExperienceBullet = (expIndex: number, bulletIndex: number, value: string) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    const updatedBullets = [...updatedWorkExperience[expIndex].bulletPoints];
    updatedBullets[bulletIndex] = value;
    updatedWorkExperience[expIndex] = {
      ...updatedWorkExperience[expIndex],
      bulletPoints: updatedBullets
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleAddWorkExperienceBullet = (expIndex: number) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    const updatedBullets = [...updatedWorkExperience[expIndex].bulletPoints, ''];
    updatedWorkExperience[expIndex] = {
      ...updatedWorkExperience[expIndex],
      bulletPoints: updatedBullets
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleRemoveWorkExperienceBullet = (expIndex: number, bulletIndex: number) => {
    if (!editableCVData) return;
    
    const updatedWorkExperience = [...editableCVData.workExperience];
    const updatedBullets = updatedWorkExperience[expIndex].bulletPoints.filter((_, i) => i !== bulletIndex);
    updatedWorkExperience[expIndex] = {
      ...updatedWorkExperience[expIndex],
      bulletPoints: updatedBullets
    };
    
    setEditableCVData(prev => ({
      ...prev!,
      workExperience: updatedWorkExperience
    }));
  };

  const handleTranslateToEnglish = (translatedData: CompanyBasedCVData) => {
    setEditableCVData(translatedData);
    setCvData(translatedData);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              CV Dosyanızı Yükleyin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              PDF formatında CV dosyanızı seçin. Tarayıcıda kayıtlı son PDF otomatik gelir; sayfa yenilense bile aynı dosyayla devam edebilirsiniz.
            </Typography>

            {cvRestoredFromCache && cvFile && (
              <Alert severity="info" sx={{ maxWidth: 560, mx: 'auto', mb: 2, textAlign: 'left' }}>
                Önceki oturumdan kayıtlı CV yüklendi: <strong>{cvFile.name}</strong>. Dil seçip hedef adımına geçebilir veya yeni PDF seçebilirsiniz.
              </Alert>
            )}
            
            {/* CV Dil Seçimi */}
            <Box sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#333' }}>
                CV'nizin dili nedir?
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant={cvLanguage === 'turkish' ? 'contained' : 'outlined'}
                  onClick={() => setCvLanguage('turkish')}
                  sx={{ minWidth: 120 }}
                >
                  🇹🇷 Türkçe
                </Button>
                <Button
                  variant={cvLanguage === 'english' ? 'contained' : 'outlined'}
                  onClick={() => setCvLanguage('english')}
                  sx={{ minWidth: 120 }}
                >
                  🇺🇸 English
                </Button>
              </Box>
            </Box>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<UploadIcon />}
              >
                {cvFile ? 'Başka PDF seç' : 'PDF Seç'}
              </Button>
              {cvFile && (
                <Button variant="outlined" size="large" onClick={() => setActiveStep(1)}>
                  Bu CV ile devam et
                </Button>
              )}
            </Stack>
            {cvFile && (
              <Box sx={{ mt: 1 }}>
                <Chip label={cvFile.name} color="primary" />
                <Chip 
                  label={cvLanguage === 'turkish' ? 'Türkçe CV' : 'English CV'} 
                  color="secondary" 
                  sx={{ ml: 1 }} 
                />
                <Button size="small" color="inherit" sx={{ ml: 1 }} onClick={handleClearStoredCv}>
                  Kayıtlı CV&apos;yi kaldır
                </Button>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <LinkIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Şirket Web Siteleri
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hedef şirketin web sitesi linklerini girin (maksimum 3 link)
              </Typography>
              {cvFile && (
                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={cvFile.name} />
                  <Button size="small" variant="text" onClick={() => setActiveStep(0)}>
                    CV değiştir
                  </Button>
                </Box>
              )}
            </Box>
            
            {/* Company Links */}
            <Box sx={{ mb: 3 }}>
              {companyLinks.map((link, index) => (
                <Card key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Link {index + 1}
                    </Typography>
                    {companyLinks.length > 1 && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeCompanyLink(index)}
                      >
                        Kaldır
                      </Button>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="URL"
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) => updateCompanyLink(index, 'url', e.target.value)}
                    />
                    <TextField
                      fullWidth
                      label="Açıklama (en az 5 karakter)"
                      placeholder="Bu sayfanın ne hakkında olduğunu açıklayın"
                      value={link.description}
                      onChange={(e) => updateCompanyLink(index, 'description', e.target.value)}
                      helperText={`${link.description.length}/5 karakter`}
                      error={link.description.length > 0 && link.description.length < 5}
                    />
                  </Box>
                </Card>
              ))}
              
              {companyLinks.length < 3 && (
                <Button
                  variant="outlined"
                  onClick={addCompanyLink}
                  startIcon={<LinkIcon />}
                  sx={{ mb: 2 }}
                >
                  Link Ekle ({companyLinks.length}/3)
                </Button>
              )}
            </Box>
            
            {/* Hedef Kaynağı Seçimi */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hedef Kaynağı Seçimi
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  CV düzenleme, cover letter ve isteğe bağlı LinkedIn mesajı için şirket web sitelerinden mi yoksa ilan metninden mi ilerleyeceğimizi seçin.
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    CV Düzenleme
                  </Typography>
                  <RadioGroup
                    row
                    value={cvAdaptationSource}
                    onChange={(e) => setCvAdaptationSource(e.target.value as 'company' | 'text')}
                  >
                    <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                    <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
                  </RadioGroup>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={shouldGenerateCoverLetter}
                        onChange={(e) => setShouldGenerateCoverLetter(e.target.checked)}
                      />
                    }
                    label="Cover Letter üret (opsiyonel)"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={shouldGenerateLinkedInMessage}
                        onChange={(e) => setShouldGenerateLinkedInMessage(e.target.checked)}
                      />
                    }
                    label="LinkedIn mesajı üret (opsiyonel)"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4, mt: -0.5 }}>
                    Cover letter ile aynı kanıt kuralları; iletişim/imza cover letter gibi eklenir. 50-70 kelime hedefi yalnızca gövde içindir.
                  </Typography>
                </Box>

                {shouldGenerateCoverLetter && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Cover Letter Kaynağı
                    </Typography>
                    <RadioGroup
                      row
                      value={coverLetterSource}
                      onChange={(e) => setCoverLetterSource(e.target.value as 'company' | 'text')}
                    >
                      <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                      <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
                    </RadioGroup>
                    {shouldGenerateLinkedInMessage && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        LinkedIn mesajı da bu kaynağı kullanır.
                      </Typography>
                    )}
                  </Box>
                )}

                {!shouldGenerateCoverLetter && shouldGenerateLinkedInMessage && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      LinkedIn mesajı kaynağı
                    </Typography>
                    <RadioGroup
                      row
                      value={linkedinMessageSource}
                      onChange={(e) => setLinkedinMessageSource(e.target.value as 'company' | 'text')}
                    >
                      <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                      <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
                    </RadioGroup>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="İş Başlığı / Hedef Pozisyon (opsiyonel)"
                  placeholder="Örn: React Developer"
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  helperText="Doldurursan AI analizinde, cover letter ve LinkedIn mesajında bu pozisyonu hedef alır."
                  sx={{ mb: 1 }}
                />

                {(shouldGenerateCoverLetter || shouldGenerateLinkedInMessage) && (
                  <TextField
                    fullWidth
                    label="Kime yazılacak? (opsiyonel)"
                    placeholder="Örn: Hiring Manager / Ayşe Yılmaz"
                    value={coverLetterRecipientName}
                    onChange={(e) => setCoverLetterRecipientName(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                )}

                {(shouldGenerateCoverLetter || shouldGenerateLinkedInMessage) && (
                  <TextField
                    fullWidth
                    label="Firma adı (opsiyonel)"
                    placeholder="Boş bırakılırsa şirket adı hiç yazılmaz"
                    value={coverLetterCompanyName}
                    onChange={(e) => setCoverLetterCompanyName(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                )}

                <TextField
                  fullWidth
                  label="Manuel eklenmesini istediğiniz ifadeler (opsiyonel)"
                  placeholder="Örn: bu pozisyonda istekli olduğumu, pozisyonla ilgili anlaşabileceğimize inandığımı kısaca belirt..."
                  helperText="Doğrudan cümle/paragraf yazabilirsiniz. AI bu metni her analizde dikkate alır."
                  value={manualMustMentionTopicsText}
                  onChange={(e) => setManualMustMentionTopicsText(e.target.value)}
                  multiline
                  minRows={2}
                  sx={{ mb: 1 }}
                />

                <TextField
                  fullWidth
                  label="Manuel geçmesin istediğiniz ifadeler (opsiyonel)"
                  placeholder="Örn: 5+ yıl deneyim, ileri seviye azure uzmanlığı"
                  helperText="Doğrudan cümle/paragraf yazabilirsiniz. AI bu metni çıktıda geçirmez."
                  value={manualMustNotMentionTopicsText}
                  onChange={(e) => setManualMustNotMentionTopicsText(e.target.value)}
                  multiline
                  minRows={2}
                  sx={{ mb: 1 }}
                />

                {(cvAdaptationSource === 'text' ||
                  (shouldGenerateCoverLetter && coverLetterSource === 'text') ||
                  (!shouldGenerateCoverLetter && shouldGenerateLinkedInMessage && linkedinMessageSource === 'text')) && (
                  <TextField
                    fullWidth
                    label="Job Description / İlan Metni"
                    placeholder="About the job ... (metni buraya yapıştırın)"
                    value={jobDescriptionText}
                    onChange={(e) => setJobDescriptionText(e.target.value)}
                    multiline
                    minRows={8}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* AI Ayarları Accordion */}
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    AI Uyarlama Ayarları
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  AI'ın hangi bölümlere müdahale etmesini istediğinizi seçin:
                </Typography>
                <FormControl component="fieldset">
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.about}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, about: e.target.checked }))}
                        />
                      }
                      label="Hakkımda bölümü"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.workExperience}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, workExperience: e.target.checked }))}
                        />
                      }
                      label="İş Deneyimi bölümü"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={aiSettings.skills}
                          onChange={(e) => setAiSettings(prev => ({ ...prev, skills: e.target.checked }))}
                        />
                      }
                      label="Beceriler bölümü"
                    />
                  </FormGroup>
                </FormControl>
              </AccordionDetails>
            </Accordion>
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCompanyLinksSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
              >
                {loading
                  ? 'Analiz Ediliyor...'
                  : (cvAdaptationSource === 'company' ||
                      (shouldGenerateCoverLetter && coverLetterSource === 'company') ||
                      (!shouldGenerateCoverLetter && shouldGenerateLinkedInMessage && linkedinMessageSource === 'company'))
                    ? 'Şirketleri Analiz Et'
                    : 'Devam Et'}
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 4 }}>
            {companyInfo && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {companyInfo.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {companyInfo.description}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip label={companyInfo.industry} color="primary" size="small" />
                    {companyInfo.values.slice(0, 3).map((value, index) => (
                      <Chip key={index} label={value} variant="outlined" size="small" />
                    ))}
                  </Stack>
                  
                  {/* Analyzed Links */}
                  {companyInfo.analyzedLinks && companyInfo.analyzedLinks.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Analiz Edilen Linkler:
                      </Typography>
                      <Stack spacing={1}>
                        {companyInfo.analyzedLinks.map((link, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkIcon fontSize="small" color="primary" />
                            <Typography variant="body2">
                              {link.description}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* AI Ayarları Özeti */}
            <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  AI Uyarlama Ayarları
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Aşağıdaki bölümler AI tarafından şirket bilgilerine göre uyarlanacak:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {aiSettings.about && <Chip label="Hakkımda" color="success" size="small" />}
                  {aiSettings.workExperience && <Chip label="İş Deneyimi" color="success" size="small" />}
                  {aiSettings.skills && <Chip label="Beceriler" color="success" size="small" />}
                  {!aiSettings.about && !aiSettings.workExperience && !aiSettings.skills && (
                    <Chip label="Hiçbir bölüm uyarlanmayacak" color="warning" size="small" />
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  AI istek modu
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Varsayılan tek istek daha hızlıdır. Çoklu mod, eski adım adım akışı kullanır; ardışık her Gemini çağrısı arasında sabit{' '}
                  <strong>7 saniye</strong> beklenir (429 / kota için).
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useSingleGeminiRequest}
                      onChange={(_, checked) => setUseSingleGeminiRequest(checked)}
                      color="primary"
                    />
                  }
                  label={useSingleGeminiRequest ? 'Tek istek (önerilen)' : 'Çoklu istek (istekler arası 7 sn)'}
                />
              </CardContent>
            </Card>
            
            <Box sx={{ textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                CV Analizi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                CV'niz şirket bilgilerine göre analiz edilecek ve seçili bölümler uyarlanacak. Aynı PDF ile farklı ilan için üst adımda metni/linkleri güncelleyip burada tekrar analiz edebilirsiniz.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleAnalyzeCV}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              >
                {loading ? 'Analiz Ediliyor...' : 'CV\'yi Analiz Et'}
              </Button>
            </Box>
          </Box>
        );

      case 3: {
        const linkedinBodyForCount = linkedinMessage
          ? CompanyBasedCVService.stripAppendedOutreachSignature(linkedinMessage)
          : '';
        const linkedinBodyWordCount = linkedinBodyForCount ? getWordCount(linkedinBodyForCount) : 0;
        const linkedinTotalWordCount = linkedinMessage ? getWordCount(linkedinMessage) : 0;

        return (
          <Box>
            <Card variant="outlined" sx={{ mb: 3, backgroundColor: '#f8fafc' }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Aynı CV dosyası korunur. Yeni ilan veya şirket için linkleri / ilan metnini güncelleyip yeniden analiz alın.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                      onClick={handleRegenerateAnalysis}
                      disabled={loading}
                    >
                      AI analizini yeniden üret
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<AutorenewIcon />}
                      onClick={handlePrepareNewAnalysisSameCv}
                      disabled={loading}
                    >
                      Aynı CV ile yeni analiz
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {coverLetter && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">
                        Şirkete Özel Cover Letter
                      </Typography>
                      <Chip
                        size="small"
                        color="primary"
                        label={coverLetterLanguage === 'english' ? 'English' : 'Türkçe'}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyCoverLetter}
                    >
                      Kopyala
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    AI tarafından şirket bilgilerine göre kısa ve profesyonel olarak üretildi.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={7}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />

                  <Typography
                    variant="caption"
                    color={coverLetterWordCount >= 250 && coverLetterWordCount <= 350 ? 'success.main' : 'text.secondary'}
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Toplam kelime (imza dahil): {coverLetterWordCount} / hedef: 250-350
                  </Typography>
                </CardContent>
              </Card>
            )}

            {linkedinMessage && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">
                        LinkedIn mesajı
                      </Typography>
                      <Chip
                        size="small"
                        color="primary"
                        label={linkedinMessageLanguage === 'english' ? 'English' : 'Türkçe'}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyLinkedinMessage}
                    >
                      Kopyala
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Aynı hedef ve CV kanıt kurallarıyla üretildi. Cover letter ile aynı iletişim bloğu altta eklenir; 50-70 kelime hedefi yalnızca mesaj gövdesi içindir.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    value={linkedinMessage}
                    onChange={(e) => setLinkedinMessage(e.target.value)}
                  />

                  <Typography
                    variant="caption"
                    color={
                      linkedinBodyWordCount >= 50 && linkedinBodyWordCount <= 70
                        ? 'success.main'
                        : 'text.secondary'
                    }
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Gövde kelimesi (iletişim hariç): {linkedinBodyWordCount} / hedef: 50-70 — toplam (iletişim dahil):{' '}
                    {linkedinTotalWordCount}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {analysisResult && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Analiz Sonuçları
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Uyum Skoru: {analysisResult.matchScore}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={analysisResult.matchScore} 
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Pozitif Uyum (Güçlü Yönler)
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: '40%' }}>İlan gereksinimi</TableCell>
                          <TableCell>CV kanıtı</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(analysisResult.positiveMatches?.length ? analysisResult.positiveMatches : []).map((m, index) => (
                          <TableRow key={`${m.label}-${index}`}>
                            <TableCell>
                              <strong>{m.label}</strong>
                            </TableCell>
                            <TableCell>{m.evidence}</TableCell>
                          </TableRow>
                        ))}
                        {(!analysisResult.positiveMatches || analysisResult.positiveMatches.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={2} color="text.secondary">
                              Bulunamadı
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Negatif Uyumsuzluk (Uygun Olmayan Noktalar)
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: '40%' }}>İlan gereksinimi</TableCell>
                          <TableCell>Uyumsuzluk nedeni</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(analysisResult.negativeMismatches?.length ? analysisResult.negativeMismatches : []).map((m, index) => (
                          <TableRow key={`${m.label}-${index}`}>
                            <TableCell>
                              <strong>{m.label}</strong>
                            </TableCell>
                            <TableCell>
                              {m.gap}
                              {m.evidence ? <Typography variant="body2" color="text.secondary">({m.evidence})</Typography> : null}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!analysisResult.negativeMismatches || analysisResult.negativeMismatches.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={2} color="text.secondary">
                              Bulunamadı
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Öneriler:</strong>
                  </Typography>
                  <Stack spacing={1}>
                    {analysisResult.recommendations.map((rec, index) => (
                      <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                        • {rec}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
            
            
            {editableCVData && (
              <CompanyBasedCVPreview 
                data={editableCVData} 
                isEditing={isEditing}
                cvLanguage={cvLanguage}
                onUpdateField={handleUpdateField}
                onUpdateWorkExperience={handleUpdateWorkExperience}
                onUpdateWorkExperienceBullet={handleUpdateWorkExperienceBullet}
                onAddWorkExperienceBullet={handleAddWorkExperienceBullet}
                onRemoveWorkExperienceBullet={handleRemoveWorkExperienceBullet}
                onStartEditing={handleStartEditing}
                onCancelEditing={handleCancelEditing}
                onSaveEditing={handleSaveEditing}
                onTranslateToEnglish={handleTranslateToEnglish}
              />
            )}
          </Box>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Şirket Odaklı CV Editörü
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        CV'nizi hedef şirkete göre optimize edin
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}
      </Paper>
    </Box>
  );
}