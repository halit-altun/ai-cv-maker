'use client';

import { useEffect, useState, useRef } from 'react';
import type React from 'react';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';
import {
  clearCachedCompanyCvPdf,
  loadCachedCompanyCvPdf,
  saveCachedCompanyCvPdf,
} from '@/lib/company-based-cv-editor/cachedCvFile';
import {
  CompanyBasedCVData,
  CompanyInfo,
  CVAnalysisResponse,
  CompanyLink,
} from '@/lib/company-based-cv-editor/types';
import {
  defaultAISettings,
  ANALYSIS_PREFS_STORAGE_KEY,
} from '../constants/optimizerConstants';
import type { AIAdaptationSettings, CompanyCvOptimizerState } from '../types';

export function useCompanyCvOptimizer(): CompanyCvOptimizerState {

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

  const parseSkillsFromText = (text: string | string[] | unknown, existingSkills: string[] = []) => {
    const normalizedExisting = (existingSkills || [])
      .map((skill) => String(skill || '').trim())
      .filter(Boolean);

    const rawSkills: string[] = Array.isArray(text)
      ? text.map((skill) => String(skill ?? '').trim()).filter(Boolean)
      : typeof text === 'string'
        ? text.split(',').map((skill) => skill.trim()).filter(Boolean)
        : text
          ? [String(text).trim()].filter(Boolean)
          : [];

    if (rawSkills.length === 0) return normalizedExisting;

    // AI'dan gelen metni temizle ve kısa beceri isimlerine dönüştür
    const aiSkills = rawSkills
      .map((skill) => {
        // Uzun açıklamaları temizle, sadece ilk 2 kelimeyi al
        const words = skill.split(' ');
        if (words.length > 2) {
          return words.slice(0, 2).join(' ');
        }
        return skill;
      })
      .filter((skill) => skill.length > 0 && skill.length < 50); // Çok uzun becerileri filtrele

    // Mevcut CV becerilerini KORU, AI'dan gelenleri unique olarak ekle.
    const mergedSkills = Array.from(new Set([...normalizedExisting, ...aiSkills]));
    console.log('Parsed Skills (merged):', mergedSkills);
    return mergedSkills;
  };

  const computeCandidateExperienceFromWorkItems = (workExperience: CompanyBasedCVData['workExperience']) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const parseYYYYMM = (value: string) => {
      const m = value.match(/^(\d{4})-(\d{2})$/);
      if (!m) return null;
      return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
    };

    const validItems = Array.isArray(workExperience) ? workExperience : [];
    const hasPresentEnd = validItems.some(
      (item) => typeof item?.endDate === 'string' && /present|devam|current/i.test(item.endDate)
    );
    const starts = validItems
      .map((i) => (i?.startDate ? parseYYYYMM(i.startDate) : null))
      .filter(Boolean) as Array<{ year: number; month: number }>;

    if (starts.length === 0) {
      return { years: null as number | null, range: null as { start: string; end: string } | null };
    }

    const earliest = starts.reduce((acc, cur) => {
      if (cur.year < acc.year) return cur;
      if (cur.year === acc.year && cur.month < acc.month) return cur;
      return acc;
    }, starts[0]);

    let latestEnd: { year: number; month: number } | null = null;
    for (const item of validItems) {
      if (!item?.endDate) continue;
      if (/present|devam|current/i.test(item.endDate)) {
        latestEnd = { year: currentYear, month: currentMonth };
        break;
      }
      const parsed = parseYYYYMM(item.endDate);
      if (!parsed) continue;
      if (!latestEnd) {
        latestEnd = parsed;
      } else if (parsed.year > latestEnd.year || (parsed.year === latestEnd.year && parsed.month > latestEnd.month)) {
        latestEnd = parsed;
      }
    }

    if (!latestEnd) {
      return { years: null as number | null, range: null as { start: string; end: string } | null };
    }

    const months = (latestEnd.year * 12 + latestEnd.month) - (earliest.year * 12 + earliest.month) + 1;
    const years = Math.max(0, Math.floor(months / 12));

    return {
      years,
      range: {
        start: `${earliest.year}-${String(earliest.month).padStart(2, '0')}`,
        end: hasPresentEnd ? 'Present' : [latestEnd.year, String(latestEnd.month).padStart(2, '0')].join('-')
      }
    };
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

  const handleAnalyzeCV = async () => {
    if (!cvFile) return;

    const outreachSource = resolveOutreachSource();
    const needsCompanyInfoForCV = cvAdaptationSource === 'company';
    const needsCompanyForOutreach = outreachSource === 'company';
    const needsJobTextForCV = cvAdaptationSource === 'text';
    const needsJobTextForOutreach = outreachSource === 'text';

    if ((needsCompanyInfoForCV || needsCompanyForOutreach) && !companyInfo) {
      setError('Şirket bilgileri gereken bir seçenek seçildi. Lütfen önce şirket linklerini analiz edin.');
      return;
    }

    if ((needsJobTextForCV || needsJobTextForOutreach) && jobDescriptionText.trim().length < 30) {
      setError('İlan metni gereken bir seçenek seçildi. Lütfen Job Description metnini doldurun.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const toTopicArray = (value: string) =>
        value
          // Kullanıcı artık doğal cümle yazabilir; satır/satır veya ; ile ayrım desteklenir.
          .split(/\n|;/g)
          .map((t) => t.trim())
          .filter(Boolean);

      const manualMustMentionTopics = toTopicArray(manualMustMentionTopicsText);
      const manualMustNotMentionTopics = toTopicArray(manualMustNotMentionTopicsText);

      // PDF'den metin çıkar
      const cvText = await CompanyBasedCVService.extractTextFromPDF(cvFile);
      console.log('Extracted CV text:', cvText);
      
      // AI ile CV'yi analiz et ve proje formatına dönüştür
      const parsedCVData = await CompanyBasedCVService.parseCVDataWithAI(cvText, cvLanguage);
      console.log('AI parsed CV data:', parsedCVData);

      const experienceMeta = computeCandidateExperienceFromWorkItems(parsedCVData.workExperience || []);
      
      
      // CV'yi analiz et ve uyarla
      const analysis = await CompanyBasedCVService.analyzeAndAdaptCV({
        cvText,
        companyUrl: cvAdaptationSource === 'company' ? (companyLinks[0]?.url || '') : undefined,
        companyInfo: cvAdaptationSource === 'company' ? companyInfo || undefined : undefined,
        jobDescriptionText: cvAdaptationSource === 'text' ? jobDescriptionText : undefined,
        targetPosition: sanitizeRoleTitle(targetPosition) || undefined,
        adaptationSource: cvAdaptationSource,
        cvLanguage,
        candidateExperienceYears: experienceMeta.years,
        candidateExperienceRange: experienceMeta.range ?? undefined,
        candidateSkills: parsedCVData.skills || [],
        candidateLanguages: parsedCVData.languages || [],
        manualMustMentionTopics,
        manualMustNotMentionTopics
      });

      const aboutForCoverLetter = aiSettings.about ? analysis.updatedAbout : (parsedCVData.about || '');

      // Cover letter'da sayı/başarı uydurmamak için yalnızca CV'den gelen highlight cümlelerini gönderiyoruz.
      const cvWorkHighlights = (parsedCVData.workExperience || [])
        .flatMap((w: any) => Array.isArray(w?.bulletPoints) ? w.bulletPoints : [])
        .map((s: any) => String(s || '').trim())
        .filter(Boolean);

      const numericHighlights = cvWorkHighlights.filter((b) => /\d/.test(b) || /%/.test(b));
      const selectedHighlights = (numericHighlights.length >= 3 ? numericHighlights : cvWorkHighlights).slice(0, 8);

      const generatedCoverLetter = shouldGenerateCoverLetter
        ? await CompanyBasedCVService.generateCompanyCoverLetter({
            source: coverLetterSource,
            companyInfo: coverLetterSource === 'company' ? companyInfo || undefined : undefined,
            jobDescriptionText: coverLetterSource === 'text' ? jobDescriptionText : undefined,
            personalInfo: parsedCVData.personalInfo,
            about: aboutForCoverLetter,
            cvLanguage,
            candidateExperienceYears: experienceMeta.years,
            candidateSkills: parsedCVData.skills || [],
            candidateHighlights: selectedHighlights,
            recipientName: coverLetterRecipientName.trim() ? coverLetterRecipientName.trim() : undefined,
            recipientCompanyName: coverLetterCompanyName.trim() ? coverLetterCompanyName.trim() : undefined,
            targetPosition: sanitizeRoleTitle(
              targetPosition ||
              (coverLetterSource === 'text' ? extractTargetPositionFromJobText(jobDescriptionText) : '') ||
              parsedCVData.personalInfo?.title ||
              'Full Stack Web Developer'
            ),
            manualMustMentionTopics,
            manualMustNotMentionTopics
          })
        : '';

      const outreachSourceForLinkedIn = shouldGenerateCoverLetter ? coverLetterSource : linkedinMessageSource;

      const generatedLinkedInMessage = shouldGenerateLinkedInMessage
        ? await CompanyBasedCVService.generateCompanyLinkedInMessage({
            source: outreachSourceForLinkedIn,
            companyInfo: outreachSourceForLinkedIn === 'company' ? companyInfo || undefined : undefined,
            jobDescriptionText: outreachSourceForLinkedIn === 'text' ? jobDescriptionText : undefined,
            personalInfo: parsedCVData.personalInfo,
            about: aboutForCoverLetter,
            cvLanguage,
            candidateExperienceYears: experienceMeta.years,
            candidateSkills: parsedCVData.skills || [],
            candidateHighlights: selectedHighlights,
            recipientName: coverLetterRecipientName.trim() ? coverLetterRecipientName.trim() : undefined,
            recipientCompanyName: coverLetterCompanyName.trim() ? coverLetterCompanyName.trim() : undefined,
            targetPosition: sanitizeRoleTitle(
              targetPosition ||
              (outreachSourceForLinkedIn === 'text' ? extractTargetPositionFromJobText(jobDescriptionText) : '') ||
              parsedCVData.personalInfo?.title ||
              'Full Stack Web Developer'
            ),
            manualMustMentionTopics,
            manualMustNotMentionTopics
          })
        : '';

      setAnalysisResult(analysis);
      setCoverLetter(shouldGenerateCoverLetter ? generatedCoverLetter : '');
      setCoverLetterLanguage(cvLanguage);
      setLinkedinMessage(shouldGenerateLinkedInMessage ? generatedLinkedInMessage : '');
      setLinkedinMessageLanguage(cvLanguage);

      // AI ayarlarına göre CV data oluştur
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
        workExperience: aiSettings.workExperience ? 
          parseWorkExperienceFromText(analysis.updatedExperience) : 
          parsedCVData.workExperience || [],
        education: parsedCVData.education || [],
        skills: aiSettings.skills ? 
          parseSkillsFromText(analysis.updatedSkills, parsedCVData.skills || []) : 
          parsedCVData.skills || [],
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
      setActiveStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'CV analiz edilirken bir hata oluştu.');
      console.error('CV analysis error:', err);
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


  return {
    activeStep,
    setActiveStep,
    cvFile,
    cvLanguage,
    setCvLanguage,
    cvRestoredFromCache,
    fileInputRef,
    companyLinks,
    companyInfo,
    cvData,
    analysisResult,
    coverLetter,
    setCoverLetter,
    coverLetterLanguage,
    shouldGenerateCoverLetter,
    setShouldGenerateCoverLetter,
    cvAdaptationSource,
    setCvAdaptationSource,
    coverLetterSource,
    setCoverLetterSource,
    coverLetterRecipientName,
    setCoverLetterRecipientName,
    coverLetterCompanyName,
    setCoverLetterCompanyName,
    linkedinMessage,
    setLinkedinMessage,
    linkedinMessageLanguage,
    shouldGenerateLinkedInMessage,
    setShouldGenerateLinkedInMessage,
    linkedinMessageSource,
    setLinkedinMessageSource,
    targetPosition,
    setTargetPosition,
    manualMustMentionTopicsText,
    setManualMustMentionTopicsText,
    manualMustNotMentionTopicsText,
    setManualMustNotMentionTopicsText,
    jobDescriptionText,
    setJobDescriptionText,
    loading,
    error,
    setError,
    aiSettings,
    setAiSettings,
    isEditing,
    editableCVData,
    handleFileUpload,
    handleClearStoredCv,
    handlePrepareNewAnalysisSameCv,
    addCompanyLink,
    removeCompanyLink,
    updateCompanyLink,
    handleCompanyLinksSubmit,
    handleAnalyzeCV,
    handleCopyCoverLetter,
    handleCopyLinkedinMessage,
    coverLetterWordCount,
    handleStartEditing,
    handleCancelEditing,
    handleSaveEditing,
    handleUpdateField,
    handleUpdateWorkExperience,
    handleUpdateWorkExperienceBullet,
    handleAddWorkExperienceBullet,
    handleRemoveWorkExperienceBullet,
    handleTranslateToEnglish,
    getWordCount,
  };
}
