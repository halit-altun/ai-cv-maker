'use client';

import { useEffect, useState, useRef } from 'react';
import type React from 'react';
import { useSearchParams } from 'next/navigation';
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
import { countWords } from '@/lib/company-based-cv-editor/wordLengthBudget';
import {
  defaultAISettings,
  ANALYSIS_PREFS_STORAGE_KEY,
} from '../constants/optimizerConstants';
import type { AIAdaptationSettings, CompanyCvOptimizerState, OutreachCvAttachmentSource, OutreachEmailLanguageMode } from '../types';
import type { EmailPrefixCategoryId, CompanyPageType } from '../constants/outreachConstants';
import {
  DEFAULT_CV_BODY_FONT_SIZE,
  DEFAULT_CV_HEADING_FONT_SIZE,
  DEFAULT_CV_JOB_TITLE_FONT_SIZE,
  DEFAULT_CV_NAME_FONT_SIZE,
  DEFAULT_CV_PROFILE_TITLE_FONT_SIZE,
  DEFAULT_CV_SKILLS_FONT_SIZE,
  type CvBodyFontSize,
  type CvHeadingFontSize,
  type CvJobTitleFontSize,
  type CvNameFontSize,
  type CvProfileTitleFontSize,
  type CvSkillsFontSize,
} from '@/components/cv-maker/cvTypography';
import { CV_PHOTO_SIZE_PT } from '@/components/cv-maker/cvPhoto';
import {
  EMAIL_PREFIX_CATEGORIES,
  buildRecipientEmails,
  extractDomainFromUrl,
  isExclusiveEmailCategory,
  normalizeEmailDomainInput,
  resolveOutreachEmailLanguage,
  resolvePageTypeLabel,
} from '../constants/outreachConstants';
import {
  onlyInfoOrContactEmails,
  anyInfoOrContactEmail,
  wrapColdEmailForInfoContactInbox,
} from '@/lib/outreach/coldEmailGenericInbox';
import {
  checkMailInfraRequest,
  createOutreachAiErrorLogRequest,
  createOutreachAnalysisOnlyLogRequest,
  fileToBase64,
  sendCompanyOutreachRequest,
} from '@/lib/outreach/api';
import {
  listOutreachProjectsRequest,
  selectOutreachProjectRequest,
} from '@/lib/projects/api';
import { generateOptimizedCvPdfAttachment } from '@/lib/company-based-cv-editor/generateCvPdfAttachment';
import { authFetch } from '@/lib/auth/authFetch';
import {
  getClientUiPreferencesRequest,
  updateClientUiPreferencesRequest,
  type ClientUiPreferencesPatch,
} from '@/lib/client-preferences/api';
import {
  readClientUiPreferencesLocalCache,
  writeClientUiPreferencesLocalCache,
} from '@/lib/client-preferences/localCache';
import {
  resolveCompanyDisplayName,
  pickBestCompanyUrl,
  companyNameAlignedWithDomain,
} from '@/lib/company/normalizeCompanyDisplayName';
import {
  getMailTrackingReanalyzeRequest,
  type MailTrackingReanalyzeContext,
} from '@/lib/mail-tracking/api';

const EMAIL_CATEGORY_IDS = new Set(EMAIL_PREFIX_CATEGORIES.map((c) => c.id));
const COMPANY_PAGE_TYPES = new Set([
  'homepage',
  'careers',
  'contact',
  'about',
  'blog',
  'products',
  'team',
  'other',
]);

function ensureHttpsCompanyUrl(urlOrDomain: string): string {
  const raw = String(urlOrDomain || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes('@')) return '';
  return `https://${raw.replace(/^\/+/, '')}`;
}

/** Analiz / önizleme için aday alıcı listesini üretir. */
function resolveOutreachCandidateEmails(params: {
  emailDomainOverride: string;
  companyWebsite?: string;
  firstCompanyUrl?: string;
  selectedCategoryIds: EmailPrefixCategoryId[];
  customLocalPartsText: string;
  includePrimaryEmail: boolean;
}): string[] {
  const domain = normalizeEmailDomainInput(
    params.emailDomainOverride ||
      extractDomainFromUrl(params.companyWebsite || '') ||
      extractDomainFromUrl(params.firstCompanyUrl || '')
  );
  const rawDomainInput =
    params.emailDomainOverride ||
    params.companyWebsite ||
    params.firstCompanyUrl ||
    domain;
  if (!domain && !String(rawDomainInput || '').includes('@')) {
    return [];
  }

  const candidates = buildRecipientEmails({
    domain,
    selectedCategoryIds: params.selectedCategoryIds,
    customLocalParts: params.customLocalPartsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    rawDomainInput,
    includePrimaryEmail: params.includePrimaryEmail,
  });
  return params.selectedCategoryIds.some(isExclusiveEmailCategory)
    ? candidates
    : candidates.slice(0, 3);
}

function buildInfoContactColdBody(params: {
  standardBody: string;
  companyName?: string;
  language?: 'turkish' | 'english';
}): string {
  const standard = String(params.standardBody || '').trim();
  if (!standard) return '';
  return wrapColdEmailForInfoContactInbox({
    bodyText: standard,
    companyName: params.companyName,
    language: params.language,
  });
}

export function useCompanyCvOptimizer(): CompanyCvOptimizerState {
  const searchParams = useSearchParams();
  const reanalyzeMailId = String(searchParams.get('reanalyzeMailId') || '').trim();
  const reanalyzeAppliedRef = useRef(false);

  const [activeStep, setActiveStep] = useState(0);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [companyLinks, setCompanyLinks] = useState<CompanyLink[]>([
    { url: '', description: '', pageType: 'homepage', pageTypeOther: '' },
  ]);
  const [lastCompanyPageType, setLastCompanyPageType] =
    useState<CompanyPageType>('homepage');
  const [lastCompanyPageTypeOther, setLastCompanyPageTypeOther] = useState('');
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
  const [linkedinMessage, setLinkedinMessageState] = useState('');
  /** Gönderim anında stale closure olmasın diye senkron kopya */
  const linkedinMessageRef = useRef('');
  const setLinkedinMessage = (value: string | ((prev: string) => string)) => {
    setLinkedinMessageState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      linkedinMessageRef.current = String(next || '');
      return next;
    });
  };
  const [linkedinMessageLanguage, setLinkedinMessageLanguage] = useState<'turkish' | 'english'>('turkish');
  const [shouldGenerateLinkedInMessage, setShouldGenerateLinkedInMessage] = useState(false);
  const [linkedinMessageSource, setLinkedinMessageSource] = useState<'company' | 'text'>('company');
  const [targetPosition, setTargetPosition] = useState<string>('');
  const [manualMustMentionTopicsText, setManualMustMentionTopicsText] = useState<string>('');
  const [manualMustNotMentionTopicsText, setManualMustNotMentionTopicsText] = useState<string>('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [shouldSendCompanyEmail, setShouldSendCompanyEmail] = useState(false);
  const [selectedEmailPrefixCategories, setSelectedEmailPrefixCategories] = useState<EmailPrefixCategoryId[]>([
    'hr-recruitment',
  ]);
  const [customEmailLocalPartsText, setCustomEmailLocalPartsText] = useState('');
  const [emailDomainOverride, setEmailDomainOverride] = useState('');
  const [includePrimaryEmailInSend, setIncludePrimaryEmailInSend] = useState(true);
  const [skipPrimaryEmailVerification, setSkipPrimaryEmailVerification] = useState(false);
  const [selectedOutreachProjectId, setSelectedOutreachProjectId] = useState<string | null>(null);
  const [outreachProjects, setOutreachProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [outreachProjectsLoading, setOutreachProjectsLoading] = useState(false);
  const [selectedOutreachRecipients, setSelectedOutreachRecipients] = useState<string[]>([]);
  const [forceOutreachResend, setForceOutreachResend] = useState(false);
  const [outreachEmailLanguageMode, setOutreachEmailLanguageMode] =
    useState<OutreachEmailLanguageMode>('auto');
  const [outreachEmailSubject, setOutreachEmailSubject] = useState('');
  const [outreachEmailBody, setOutreachEmailBody] = useState('');
  const [outreachInfoContactEmailBody, setOutreachInfoContactEmailBody] = useState('');
  const [outreachLinkedinUrl, setOutreachLinkedinUrl] = useState('');
  const [outreachPortfolioUrl, setOutreachPortfolioUrl] = useState('');
  const [outreachWebsiteUrl, setOutreachWebsiteUrl] = useState('');
  const [outreachPhone, setOutreachPhone] = useState('');
  const [outreachSending, setOutreachSending] = useState(false);
  const outreachSendingLockRef = useRef(false);
  const [outreachSendResult, setOutreachSendResult] = useState<string | null>(null);
  const [outreachCvAttachmentSource, setOutreachCvAttachmentSource] =
    useState<OutreachCvAttachmentSource>('optimized');
  /** Profilim ayarı: analiz sonrası otomatik mail */
  const [autoSendOutreachAfterAnalysis, setAutoSendOutreachAfterAnalysis] = useState(false);
  const sendCompanyEmailRef = useRef<
    (opts?: {
      recipientsOverride?: string[];
      bodyOverride?: string;
      subjectOverride?: string;
      cvDataOverride?: CompanyBasedCVData | null;
    }) => Promise<void>
  >(async () => undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Deliverability Score */
  const [deliverabilityScore, setDeliverabilityScore] = useState<any | null>(null);
  const [deliverabilityLoading, setDeliverabilityLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState<AIAdaptationSettings>(defaultAISettings);
  const [isEditing, setIsEditing] = useState(false);
  const [editableCVData, setEditableCVData] = useState<CompanyBasedCVData | null>(null);
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
  const [cvLanguage, setCvLanguage] = useState<'turkish' | 'english'>('turkish');
  const [includeCvPhoto, setIncludeCvPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [cvRestoredFromCache, setCvRestoredFromCache] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  /** Yeniden analiz / programatik domain set → JobAnalysis domain geçmişi sorgusu */
  const [domainHistoryCheckNonce, setDomainHistoryCheckNonce] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Hydrate sonrası ilk effect tetiklemesini kaydetme — default’larla API ezilmesin */
  const prefsSkipNextSaveRef = useRef(true);
  const prefsBaselineRef = useRef<string>('');
  const prefsPendingPatchRef = useRef<ClientUiPreferencesPatch | null>(null);
  const prefsDirtyRef = useRef(false);

  // Outreach projeleri — GET; en son seçilen varsayılan
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOutreachProjectsLoading(true);
      try {
        const result = await listOutreachProjectsRequest();
        if (cancelled) return;
        setOutreachProjects(result.projects.map((p) => ({ id: p.id, name: p.name })));
        setSelectedOutreachProjectId(result.lastSelectedId);
      } catch {
        if (!cancelled) {
          setOutreachProjects([]);
          setSelectedOutreachProjectId(null);
        }
      } finally {
        if (!cancelled) setOutreachProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectOutreachProject = (projectId: string | null) => {
    setSelectedOutreachProjectId(projectId);
    if (projectId) {
      void selectOutreachProjectRequest(projectId).catch(() => undefined);
    }
  };

  // Profilim'deki kişisel bilgiler — boş outreach alanlarına varsayılan doldur
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch('/api/auth/me');
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: {
            linkedinUrl?: string;
            portfolioUrl?: string;
            phone?: string;
            githubUrl?: string;
            autoSendOutreachAfterAnalysis?: boolean;
            profileImageUrl?: string;
          };
        };
        if (cancelled || !res.ok || !data.user) return;
        setProfilePhotoUrl(String(data.user.profileImageUrl || '').trim());
        const profileLinkedin = String(data.user.linkedinUrl || '').trim();
        const profilePortfolio = String(data.user.portfolioUrl || '').trim();
        const profilePhone = String(data.user.phone || '').trim();
        const profileGithub = String(data.user.githubUrl || '').trim();
        setAutoSendOutreachAfterAnalysis(data.user.autoSendOutreachAfterAnalysis === true);
        if (profileLinkedin) {
          setOutreachLinkedinUrl((prev) => (prev.trim() ? prev : profileLinkedin));
        }
        if (profilePortfolio) {
          setOutreachPortfolioUrl((prev) => (prev.trim() ? prev : profilePortfolio));
        }
        if (profilePhone) {
          setOutreachPhone((prev) => (prev.trim() ? prev : profilePhone));
        }
        if (profileGithub) {
          setOutreachWebsiteUrl((prev) => (prev.trim() ? prev : profileGithub));
        }
      } catch {
        // Profil yüklenemezse sessiz geç
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Analiz sonrası fotoğraf seçeneği değişince önizleme/PDF verisini güncelle
  useEffect(() => {
    const nextPhoto = includeCvPhoto && profilePhotoUrl ? profilePhotoUrl : '';
    const nextInclude = Boolean(includeCvPhoto && profilePhotoUrl);
    const nextPhotoSize = CV_PHOTO_SIZE_PT;
    const patch = (prev: CompanyBasedCVData | null): CompanyBasedCVData | null => {
      if (!prev) return prev;
      if (
        prev.personalInfo.photoUrl === nextPhoto &&
        Boolean(prev.personalInfo.includePhoto) === nextInclude &&
        Number(prev.personalInfo.photoSizePt) === nextPhotoSize
      ) {
        return prev;
      }
      return {
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          photoUrl: nextPhoto,
          includePhoto: nextInclude,
          photoSizePt: nextPhotoSize,
        },
      };
    };
    setCvData(patch);
    setEditableCVData(patch);
  }, [includeCvPhoto, profilePhotoUrl]);

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

  // Client bazlı tercihler (toplu + company-based ortak)
  useEffect(() => {
    let cancelled = false;

    const applyPageType = (pageType: CompanyPageType, pageTypeOther: string) => {
      setLastCompanyPageType(pageType);
      setLastCompanyPageTypeOther(pageType === 'other' ? pageTypeOther : '');
      setCompanyLinks((prev) =>
        prev.map((link, index) => {
          if (index !== 0) return link;
          return {
            ...link,
            pageType,
            pageTypeOther: pageType === 'other' ? pageTypeOther : '',
            description: resolvePageTypeLabel(
              pageType,
              pageType === 'other' ? pageTypeOther : ''
            ),
          };
        })
      );
    };

    const applyPrefs = (prefs: ClientUiPreferencesPatch) => {
      if (prefs.targetPosition !== undefined) {
        setTargetPosition(prefs.targetPosition || '');
      }
      if (prefs.manualMustMentionTopicsText !== undefined) {
        setManualMustMentionTopicsText(prefs.manualMustMentionTopicsText || '');
      }
      if (prefs.manualMustNotMentionTopicsText !== undefined) {
        setManualMustNotMentionTopicsText(prefs.manualMustNotMentionTopicsText || '');
      }
      if (prefs.coverLetterRecipientName !== undefined) {
        setCoverLetterRecipientName(prefs.coverLetterRecipientName || '');
      }
      // coverLetterCompanyName şirket-özel; sticky prefs’ten uygulanmaz (Leobit→OaksLab hatası)
      if (prefs.outreachEmailLanguageMode !== undefined) {
        setOutreachEmailLanguageMode(
          prefs.outreachEmailLanguageMode === 'turkish' ||
            prefs.outreachEmailLanguageMode === 'english'
            ? prefs.outreachEmailLanguageMode
            : 'auto'
        );
      }
      if (prefs.aiSettings) {
        setAiSettings({
          about: prefs.aiSettings.about !== false,
          workExperience: Boolean(prefs.aiSettings.workExperience),
          skills: Boolean(prefs.aiSettings.skills),
        });
      }
      if (prefs.selectedEmailPrefixCategories) {
        const cats = prefs.selectedEmailPrefixCategories.filter(
          (id): id is EmailPrefixCategoryId =>
            EMAIL_CATEGORY_IDS.has(id as EmailPrefixCategoryId)
        );
        if (cats.length) setSelectedEmailPrefixCategories(cats);
      }
      if (prefs.customEmailLocalPartsText !== undefined) {
        setCustomEmailLocalPartsText(prefs.customEmailLocalPartsText || '');
      }
      if (prefs.includePrimaryEmailInSend !== undefined) {
        setIncludePrimaryEmailInSend(prefs.includePrimaryEmailInSend !== false);
      }
      if (prefs.skipPrimaryEmailVerification !== undefined) {
        setSkipPrimaryEmailVerification(Boolean(prefs.skipPrimaryEmailVerification));
      }
      if (prefs.forceResend !== undefined) {
        setForceOutreachResend(Boolean(prefs.forceResend));
      }
      if (prefs.shouldGenerateCoverLetter !== undefined) {
        setShouldGenerateCoverLetter(prefs.shouldGenerateCoverLetter !== false);
      }
      if (prefs.coverLetterSource !== undefined) {
        setCoverLetterSource(prefs.coverLetterSource === 'text' ? 'text' : 'company');
      }
      if (prefs.shouldGenerateLinkedInMessage !== undefined) {
        setShouldGenerateLinkedInMessage(Boolean(prefs.shouldGenerateLinkedInMessage));
      }
      if (prefs.linkedinMessageSource !== undefined) {
        setLinkedinMessageSource(
          prefs.linkedinMessageSource === 'text' ? 'text' : 'company'
        );
      }
      if (prefs.cvAdaptationSource !== undefined) {
        setCvAdaptationSource(prefs.cvAdaptationSource === 'text' ? 'text' : 'company');
      }
      if (prefs.includeCvPhoto !== undefined) {
        setIncludeCvPhoto(Boolean(prefs.includeCvPhoto));
      }
      if (prefs.shouldSendCompanyEmail !== undefined) {
        setShouldSendCompanyEmail(Boolean(prefs.shouldSendCompanyEmail));
      }
      if (prefs.outreachCvAttachmentSource !== undefined) {
        setOutreachCvAttachmentSource(
          prefs.outreachCvAttachmentSource === 'original' ? 'original' : 'optimized'
        );
      }
      if (prefs.lastCompanyPageType !== undefined) {
        const PAGE_TYPES = new Set([
          'homepage',
          'careers',
          'contact',
          'about',
          'blog',
          'products',
          'team',
          'other',
        ]);
        const savedPageType = PAGE_TYPES.has(String(prefs.lastCompanyPageType || ''))
          ? (prefs.lastCompanyPageType as CompanyPageType)
          : 'homepage';
        const savedPageTypeOther = String(prefs.lastCompanyPageTypeOther || '');
        applyPageType(savedPageType, savedPageTypeOther);
      }
    };

    void (async () => {
      try {
        const prefs = await getClientUiPreferencesRequest();
        if (cancelled) return;
        applyPrefs(prefs);

        const cached = await loadCachedCompanyCvPdf().catch(() => null);
        if (cancelled) return;
        if (cached?.file) {
          setCvFile((prev) => prev || cached.file);
          setCvLanguage(cached.cvLanguage);
          setCvRestoredFromCache(true);
        } else if (prefs.cvLanguage === 'english' || prefs.cvLanguage === 'turkish') {
          setCvLanguage(prefs.cvLanguage);
        }

        writeClientUiPreferencesLocalCache(prefs);
      } catch (err) {
        console.warn('Client tercihleri yüklenemedi:', err);
        const local = readClientUiPreferencesLocalCache();
        if (local && !cancelled) {
          applyPrefs(local);
          if (local.cvLanguage === 'english' || local.cvLanguage === 'turkish') {
            setCvLanguage(local.cvLanguage);
          }
        } else if (!cancelled) {
          // Eski localStorage anahtarı
          try {
            const raw = localStorage.getItem(ANALYSIS_PREFS_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as ClientUiPreferencesPatch;
              applyPrefs(parsed);
            }
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (!cancelled) {
          prefsSkipNextSaveRef.current = true;
          setPrefsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  /** Mail Takip → Yeniden analiz et: alanları gönderim anındaki tercihlerle doldur */
  useEffect(() => {
    if (!prefsReady || !reanalyzeMailId || reanalyzeAppliedRef.current) return;
    let cancelled = false;

    const applyReanalyze = (ctx: MailTrackingReanalyzeContext) => {
      const pageType = COMPANY_PAGE_TYPES.has(String(ctx.pageType || ''))
        ? (ctx.pageType as CompanyPageType)
        : 'homepage';
      const pageTypeOther = pageType === 'other' ? String(ctx.pageTypeOther || '') : '';
      const companyUrl =
        pickBestCompanyUrl(
          ctx.companyUrl || '',
          ctx.domain || '',
          ensureHttpsCompanyUrl(ctx.companyUrl || '') ||
            ensureHttpsCompanyUrl(ctx.domain || '')
        ) ||
        ensureHttpsCompanyUrl(ctx.companyUrl || '') ||
        ensureHttpsCompanyUrl(ctx.domain || '');
      const domainValue = String(ctx.rawDomainInput || ctx.domain || '').trim();

      if (companyUrl) {
        setCompanyLinks([
          {
            url: companyUrl,
            description: resolvePageTypeLabel(pageType, pageTypeOther),
            pageType,
            pageTypeOther,
          },
        ]);
        setLastCompanyPageType(pageType);
        setLastCompanyPageTypeOther(pageTypeOther);
      }

      if (domainValue) setEmailDomainOverride(domainValue);
      if (ctx.companyName) {
        const aligned = resolveCompanyDisplayName({
          name: String(ctx.companyName),
          website: companyUrl,
          domain: String(ctx.domain || domainValue || ''),
        });
        setCoverLetterCompanyName(aligned || String(ctx.companyName));
      }
      if (ctx.targetPosition) setTargetPosition(String(ctx.targetPosition));

      if (Array.isArray(ctx.selectedCategories) && ctx.selectedCategories.length) {
        const cats = ctx.selectedCategories.filter((id): id is EmailPrefixCategoryId =>
          EMAIL_CATEGORY_IDS.has(id as EmailPrefixCategoryId)
        );
        if (cats.length) setSelectedEmailPrefixCategories(cats);
      }

      if (Array.isArray(ctx.customEmailLocalParts) && ctx.customEmailLocalParts.length) {
        setCustomEmailLocalPartsText(ctx.customEmailLocalParts.join('\n'));
      }

      if (ctx.cvLanguage === 'english' || ctx.cvLanguage === 'turkish') {
        setCvLanguage(ctx.cvLanguage);
      }
      if (
        ctx.outreachEmailLanguageMode === 'auto' ||
        ctx.outreachEmailLanguageMode === 'turkish' ||
        ctx.outreachEmailLanguageMode === 'english'
      ) {
        setOutreachEmailLanguageMode(ctx.outreachEmailLanguageMode);
      }

      if (ctx.includePrimaryEmailInSend !== undefined) {
        setIncludePrimaryEmailInSend(Boolean(ctx.includePrimaryEmailInSend));
      }
      if (ctx.skipPrimaryEmailVerification !== undefined) {
        setSkipPrimaryEmailVerification(Boolean(ctx.skipPrimaryEmailVerification));
      }
      if (ctx.shouldSendCompanyEmail !== undefined) {
        setShouldSendCompanyEmail(Boolean(ctx.shouldSendCompanyEmail));
      }
      if (ctx.shouldGenerateCoverLetter !== undefined) {
        setShouldGenerateCoverLetter(Boolean(ctx.shouldGenerateCoverLetter));
      }
      if (ctx.shouldGenerateLinkedInMessage !== undefined) {
        setShouldGenerateLinkedInMessage(Boolean(ctx.shouldGenerateLinkedInMessage));
      }
      if (ctx.coverLetterSource === 'text' || ctx.coverLetterSource === 'company') {
        setCoverLetterSource(ctx.coverLetterSource);
      }
      if (ctx.linkedinMessageSource === 'text' || ctx.linkedinMessageSource === 'company') {
        setLinkedinMessageSource(ctx.linkedinMessageSource);
      }
      if (ctx.cvAdaptationSource === 'text' || ctx.cvAdaptationSource === 'company') {
        setCvAdaptationSource(ctx.cvAdaptationSource);
      }
      if (
        ctx.outreachCvAttachmentSource === 'original' ||
        ctx.outreachCvAttachmentSource === 'optimized'
      ) {
        setOutreachCvAttachmentSource(ctx.outreachCvAttachmentSource);
      }
      if (ctx.includeCvPhoto !== undefined) {
        setIncludeCvPhoto(Boolean(ctx.includeCvPhoto));
      }
      if (ctx.aiSettings && typeof ctx.aiSettings === 'object') {
        setAiSettings({
          about: ctx.aiSettings.about !== false,
          workExperience: Boolean(ctx.aiSettings.workExperience),
          skills: Boolean(ctx.aiSettings.skills),
        });
      }

      if (ctx.projectId) {
        const projectId = String(ctx.projectId);
        setSelectedOutreachProjectId(projectId);
        void selectOutreachProjectRequest(projectId).catch(() => undefined);
      }

      setActiveStep(0);
      setOutreachSendResult(null);
      setError(null);
    };

    void (async () => {
      try {
        const { reanalyze } = await getMailTrackingReanalyzeRequest(reanalyzeMailId);
        if (cancelled) return;
        applyReanalyze(reanalyze);
        reanalyzeAppliedRef.current = true;
        // Reanalyze alanları global tercihe yazılmasın
        prefsSkipNextSaveRef.current = true;
        // Domain geçmişi sorgusu (JobAnalysis mount / zaten açıksa) hemen tetiklensin
        setDomainHistoryCheckNonce((n) => n + 1);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Yeniden analiz bağlamı yüklenemedi.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prefsReady, reanalyzeMailId]);

  // Domain değişince sticky yanlış şirket adını (Leobit @ oakslab) düzelt
  const lastAlignedDomainRef = useRef('');
  useEffect(() => {
    const domain = normalizeEmailDomainInput(
      emailDomainOverride.trim() ||
        extractDomainFromUrl(companyLinks[0]?.url || '') ||
        extractDomainFromUrl(companyInfo?.website || '')
    );
    if (!domain) return;
    if (domain === lastAlignedDomainRef.current) return;
    lastAlignedDomainRef.current = domain;

    setCoverLetterCompanyName((prev) => {
      if (!prev.trim()) return prev;
      if (companyNameAlignedWithDomain(prev, domain)) return prev;
      return (
        resolveCompanyDisplayName({
          name: companyInfo?.name,
          website: pickBestCompanyUrl(companyLinks[0]?.url, companyInfo?.website),
          domain,
        }) || ''
      );
    });
  }, [
    emailDomainOverride,
    companyLinks,
    companyInfo?.website,
    companyInfo?.name,
  ]);

  useEffect(() => {
    if (!prefsReady) return;

    const flushPrefs = (patch: ClientUiPreferencesPatch, serialized: string) => {
      prefsBaselineRef.current = serialized;
      prefsPendingPatchRef.current = null;
      prefsDirtyRef.current = false;
      writeClientUiPreferencesLocalCache(patch);
      void updateClientUiPreferencesRequest(patch).catch((err) => {
        console.warn('Client tercihleri kaydedilemedi:', err);
      });
      try {
        localStorage.setItem(
          ANALYSIS_PREFS_STORAGE_KEY,
          JSON.stringify({
            targetPosition: patch.targetPosition,
            manualMustMentionTopicsText: patch.manualMustMentionTopicsText,
            manualMustNotMentionTopicsText: patch.manualMustNotMentionTopicsText,
            coverLetterRecipientName: patch.coverLetterRecipientName,
            lastCompanyPageType: patch.lastCompanyPageType,
            lastCompanyPageTypeOther: patch.lastCompanyPageTypeOther,
          })
        );
      } catch {
        /* ignore */
      }
    };

    const patch: ClientUiPreferencesPatch = {
      targetPosition: targetPosition.trim(),
      cvLanguage,
      outreachEmailLanguageMode,
      aiSettings,
      selectedEmailPrefixCategories,
      customEmailLocalPartsText,
      includePrimaryEmailInSend,
      skipPrimaryEmailVerification,
      forceResend: forceOutreachResend,
      shouldGenerateCoverLetter,
      coverLetterSource,
      shouldGenerateLinkedInMessage,
      linkedinMessageSource,
      cvAdaptationSource,
      includeCvPhoto,
      shouldSendCompanyEmail,
      outreachCvAttachmentSource,
      manualMustMentionTopicsText,
      manualMustNotMentionTopicsText,
      coverLetterRecipientName,
      lastCompanyPageType,
      lastCompanyPageTypeOther:
        lastCompanyPageType === 'other' ? lastCompanyPageTypeOther : '',
    };
    const serialized = JSON.stringify(patch);
    if (prefsSkipNextSaveRef.current) {
      prefsSkipNextSaveRef.current = false;
      prefsBaselineRef.current = serialized;
      prefsPendingPatchRef.current = null;
      prefsDirtyRef.current = false;
      return;
    }
    if (serialized === prefsBaselineRef.current) return;

    prefsPendingPatchRef.current = patch;
    prefsDirtyRef.current = true;
    if (prefsSaveTimerRef.current) clearTimeout(prefsSaveTimerRef.current);
    prefsSaveTimerRef.current = setTimeout(() => {
      flushPrefs(patch, serialized);
    }, 250);

    return () => {
      if (prefsSaveTimerRef.current) {
        clearTimeout(prefsSaveTimerRef.current);
        prefsSaveTimerRef.current = null;
      }
    };
  }, [
    prefsReady,
    targetPosition,
    cvLanguage,
    outreachEmailLanguageMode,
    aiSettings,
    selectedEmailPrefixCategories,
    customEmailLocalPartsText,
    includePrimaryEmailInSend,
    skipPrimaryEmailVerification,
    forceOutreachResend,
    shouldGenerateCoverLetter,
    coverLetterSource,
    shouldGenerateLinkedInMessage,
    linkedinMessageSource,
    cvAdaptationSource,
    includeCvPhoto,
    shouldSendCompanyEmail,
    outreachCvAttachmentSource,
    manualMustMentionTopicsText,
    manualMustNotMentionTopicsText,
    coverLetterRecipientName,
    lastCompanyPageType,
    lastCompanyPageTypeOther,
  ]);

  // Sayfa kapanınca / unmount’ta bekleyen tercihi kaybetme
  useEffect(() => {
    const flushPending = () => {
      if (!prefsDirtyRef.current || !prefsPendingPatchRef.current) return;
      const patch = prefsPendingPatchRef.current;
      const serialized = JSON.stringify(patch);
      prefsBaselineRef.current = serialized;
      prefsPendingPatchRef.current = null;
      prefsDirtyRef.current = false;
      writeClientUiPreferencesLocalCache(patch);
      void updateClientUiPreferencesRequest(patch).catch(() => undefined);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      document.removeEventListener('visibilitychange', onHide);
      flushPending();
    };
  }, []);

  // Gönderen domain (SMTP) mail altyapısı — alıcı domain değişince reset YOK; 24s cache sunucuda
  const refreshDeliverabilityScore = async (
    forceRefresh = false,
    overrides?: { subject?: string; bodyText?: string; hasAttachment?: boolean }
  ) => {
    setDeliverabilityLoading(true);
    try {
      const data = await checkMailInfraRequest({
        forceRefresh,
        subject: overrides?.subject ?? outreachEmailSubject,
        bodyText: overrides?.bodyText ?? outreachEmailBody,
        hasAttachment:
          overrides?.hasAttachment ?? Boolean(cvFile || editableCVData || cvData),
      });
      setDeliverabilityScore(data);
    } catch (err) {
      console.warn('[MAIL-INFRA] Check failed:', err);
    } finally {
      setDeliverabilityLoading(false);
    }
  };

  // Mail açıkken ilk yükleme
  useEffect(() => {
    if (!shouldSendCompanyEmail || deliverabilityScore || deliverabilityLoading) return;
    void refreshDeliverabilityScore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSendCompanyEmail]);

  // Cold mail konusu/gövdesi gelince veya değişince mesaj riskini güncelle
  useEffect(() => {
    if (!shouldSendCompanyEmail) return;
    const hasMessage = Boolean(outreachEmailSubject.trim() || outreachEmailBody.trim());
    if (!hasMessage) return;

    const timer = setTimeout(() => {
      void refreshDeliverabilityScore(false, {
        subject: outreachEmailSubject,
        bodyText: outreachEmailBody,
      });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSendCompanyEmail, outreachEmailSubject, outreachEmailBody]);

  // Seçili alıcılarda info/contact varsa özel gövdeyi standarttan türet (boşsa).
  useEffect(() => {
    if (!anyInfoOrContactEmail(selectedOutreachRecipients)) return;
    if (!outreachEmailBody.trim()) return;
    if (outreachInfoContactEmailBody.trim()) return;
    setOutreachInfoContactEmailBody(
      buildInfoContactColdBody({
        standardBody: outreachEmailBody,
        companyName: coverLetterCompanyName.trim() || companyInfo?.name || '',
        language: resolveOutreachEmailLanguage({
          mode: outreachEmailLanguageMode,
          pageLanguage: companyInfo?.detectedLanguage,
          jobDescriptionText,
          adaptationSource: cvAdaptationSource,
          fallback: cvLanguage,
        }) === 'english'
          ? 'english'
          : 'turkish',
      })
    );
  }, [
    selectedOutreachRecipients,
    outreachEmailBody,
    outreachInfoContactEmailBody,
    coverLetterCompanyName,
    companyInfo?.name,
    companyInfo?.detectedLanguage,
    outreachEmailLanguageMode,
    jobDescriptionText,
    cvAdaptationSource,
    cvLanguage,
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

  // AI'dan gelen metinleri parse et - sadece bullet point'leri uyarla; sayı orijinale sabitlenir
  const parseWorkExperienceFromText = (
    text: string,
    originalWorkExperience: Array<{
      id?: string;
      position?: string;
      company?: string;
      city?: string;
      country?: string;
      startDate?: string;
      endDate?: string;
      bulletPoints?: string[];
    }> = []
  ) => {
    if (!text) return originalWorkExperience.map((exp, index) => ({
      id: exp.id || String(index + 1),
      position: exp.position || `İş Deneyimi ${index + 1}`,
      company: exp.company || `Şirket ${index + 1}`,
      city: exp.city || 'İstanbul',
      country: exp.country || 'Türkiye',
      startDate: exp.startDate || '2025-01',
      endDate: exp.endDate || 'Present',
      bulletPoints: Array.isArray(exp.bulletPoints) ? exp.bulletPoints : [],
    }));
    
    console.log('AI Work Experience Text:', text);
    
    // AI'dan gelen metni iş deneyimlerine böl - daha akıllı parsing
    // Önce \n\n ile böl, sonra her bölümü kontrol et
    let workExperienceSections = text.split('\n\n').filter(section => section.trim().length > 0);
    
    // Eğer sadece 1 bölüm varsa, orijinal CV'den 2 iş deneyimi olduğunu biliyoruz
    // AI metnini manuel olarak 2 parçaya böl
    if (workExperienceSections.length === 1 && originalWorkExperience.length > 1) {
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

    const sourceExperiences =
      originalWorkExperience.length > 0
        ? originalWorkExperience
        : workExperienceSections.map(() => ({} as (typeof originalWorkExperience)[number]));
    
    // Her iş deneyimi için bullet point'leri çıkar; sayı orijinale kilitlenir
    const parsedExperiences = sourceExperiences.map((originalExp, index) => {
      const section = workExperienceSections[index] || '';
      const lines = section ? section.split('\n') : [];
      const headerLine = lines[0] || '';
      const bulletLines = lines.slice(1).filter(line => 
        line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')
      );
      
      // Bullet point'leri temizle
      const aiBulletPoints = bulletLines.map(line => 
        line.replace(/^[•\-\*]\s*/, '').trim()
      ).filter(point => point.length > 0);

      const originalBullets = Array.isArray(originalExp?.bulletPoints)
        ? originalExp.bulletPoints.map((b) => String(b || '').trim()).filter(Boolean)
        : [];
      const targetBulletCount = originalBullets.length > 0 ? originalBullets.length : aiBulletPoints.length;

      // Fazla bullet eklenmesin; kısaltılmış uyarlama reddedilir — orijinal detay korunur
      const bulletPoints = Array.from({ length: targetBulletCount }, (_, i) => {
        const original = originalBullets[i] || '';
        const adapted = aiBulletPoints[i]?.trim() || '';
        if (!adapted) return original;
        if (!original) return adapted;

        const originalWords = countWords(original);
        const adaptedWords = countWords(adapted);
        // AI maddeyi kısaltmışsa (detay kaybı) orijinali koru
        if (originalWords > 0 && adaptedWords < originalWords * 0.9) {
          console.warn(
            `Bullet ${index + 1}.${i + 1} kısaltıldı (${adaptedWords}/${originalWords}) — orijinal korundu`
          );
          return original;
        }
        return adapted;
      });
      
      console.log(`Experience ${index + 1}:`, {
        header: headerLine,
        bulletCount: bulletPoints.length,
        originalBulletCount: targetBulletCount,
        bullets: bulletPoints
      });
      
      // Orijinal CV'den pozisyon ve şirket bilgilerini al
      // AI sadece bullet point'leri uyarlar, diğer bilgiler orijinal CV'den gelir
      console.log(`Experience ${index + 1} - Original:`, originalExp);
      
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
        const headerLines = section.split('\n');
        if (headerLines.length >= 2) {
          position = position || headerLines[0].trim();
          company = company || headerLines[1].trim();
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
        bulletPoints:
          bulletPoints.length > 0
            ? bulletPoints
            : originalBullets.length > 0
              ? originalBullets
              : ['AI tarafından uyarlanmış iş deneyimi']
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setCvFile(file);
      setCvRestoredFromCache(false);
      setError(null);
      setOutreachSendResult(null);
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
    setOutreachSendResult(null);
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
    setOutreachSendResult(null);
    setOutreachSending(false);
    setOutreachEmailSubject('');
    setOutreachEmailBody('');
    setOutreachInfoContactEmailBody('');
    setSelectedOutreachRecipients([]);
    setForceOutreachResend(false);
    // Eski firma e-posta domaini kalmasın — yalnızca bu alan
    setEmailDomainOverride('');
    setActiveStep(1);
  };

  // Company link ekleme fonksiyonları
  const addCompanyLink = () => {
    if (companyLinks.length >= 3) {
      setError('Maksimum 3 link ekleyebilirsiniz.');
      return;
    }

    const pageType = lastCompanyPageType;
    const pageTypeOther = pageType === 'other' ? lastCompanyPageTypeOther : '';

    setCompanyLinks((prev) => [
      ...prev,
      {
        url: '',
        description: resolvePageTypeLabel(pageType, pageTypeOther),
        pageType,
        pageTypeOther,
      },
    ]);
  };

  const removeCompanyLink = (index: number) => {
    setCompanyLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCompanyLink = (index: number, field: keyof CompanyLink, value: string) => {
    if (field === 'pageType') {
      setLastCompanyPageType(value as CompanyPageType);
      if (value !== 'other') setLastCompanyPageTypeOther('');
    }
    if (field === 'pageTypeOther') {
      setLastCompanyPageTypeOther(value);
    }
    setCompanyLinks((prev) =>
      prev.map((link, i) => {
        if (i !== index) return link;
        const next = { ...link, [field]: value } as CompanyLink;
        if (field === 'pageType' || field === 'pageTypeOther') {
          next.description = resolvePageTypeLabel(
            field === 'pageType' ? (value as CompanyLink['pageType']) : next.pageType,
            field === 'pageTypeOther' ? value : next.pageTypeOther
          );
        }
        return next;
      })
    );
  };

  const handleCompanyLinksSubmit = async () => {
    // İş analizi formundan: tek AI → doğrudan önizleme
    await handleAnalyzeCV({ fromJobAnalysis: true });
  };

  const handleAnalyzeCV = async (options?: { fromJobAnalysis?: boolean }) => {
    if (!cvFile) return;

    const fromJobAnalysis = Boolean(options?.fromJobAnalysis);
    const outreachSource = resolveOutreachSource();
    const needsCompanyInfoForCV = cvAdaptationSource === 'company';
    const needsCompanyForOutreach = outreachSource === 'company';
    const needsCompanyInfo = needsCompanyInfoForCV || needsCompanyForOutreach;
    const needsJobTextForCV = cvAdaptationSource === 'text';
    const needsJobTextForOutreach = outreachSource === 'text';

    if ((needsJobTextForCV || needsJobTextForOutreach) && jobDescriptionText.trim().length < 30) {
      setError('İlan metni gereken bir seçenek seçildi. Lütfen Job Description metnini doldurun.');
      return;
    }

    if (needsCompanyInfo) {
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
        if (fromJobAnalysis || !companyInfo) {
          if (!link.pageType) {
            setError(`Link ${i + 1}: Sayfa tipini seçin.`);
            return;
          }
          if (link.pageType === 'other' && !String(link.pageTypeOther || '').trim()) {
            setError(`Link ${i + 1}: "Diğer" için sayfa açıklaması girin.`);
            return;
          }
        }
        if (!link.description?.trim()) {
          link.description = resolvePageTypeLabel(link.pageType, link.pageTypeOther);
        }
      }
    }

    if (!needsCompanyInfo && fromJobAnalysis) {
      setCompanyInfo(null);
    }

    if (!companyInfo && needsCompanyInfo && !fromJobAnalysis) {
      setError('Şirket bilgileri gereken bir seçenek seçildi. Lütfen iş analizi adımından başlatın.');
      return;
    }

    if (shouldSendCompanyEmail && fromJobAnalysis) {
      const hasCategory = selectedEmailPrefixCategories.some((id) => id !== 'custom');
      const hasCustom = customEmailLocalPartsText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean).length > 0;
      if (!hasCategory && !hasCustom) {
        setError('Mail gönderimi için en az bir e-posta kategorisi veya özel prefix seçin.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    // Önceki firmanın gönderim mesajı yeni analizde kalmasın
    setOutreachSendResult(null);
    setOutreachSending(false);

    try {
      const toTopicArray = (value: string) =>
        value
          .split(/\n|;/g)
          .map((t) => t.trim())
          .filter(Boolean);

      const manualMustMentionTopics = toTopicArray(manualMustMentionTopicsText);
      const manualMustNotMentionTopics = toTopicArray(manualMustNotMentionTopicsText);

      const cvText = await CompanyBasedCVService.extractTextFromPDF(cvFile);
      console.log('Extracted CV text:', cvText);

      // Şirket sayfalarını paralel fetch et (AI değil) — companyInfo yoksa tek AI'de çıkarılacak
      let companyPages:
        | Array<{ url: string; pageType?: string; description?: string; pageText: string }>
        | undefined;
      if (needsCompanyInfo && !companyInfo) {
        const normalizedLinks = companyLinks.map((link) => ({
          ...link,
          description: resolvePageTypeLabel(link.pageType, link.pageTypeOther),
        }));
        companyPages = await Promise.all(
          normalizedLinks.map(async (link) => {
            let pageText = '';
            try {
              const fetchRes = await fetch('/api/fetch-page-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: link.url }),
              });
              const fetchData = (await fetchRes.json().catch(() => ({}))) as {
                ok?: boolean;
                text?: string;
              };
              if (fetchRes.ok && fetchData.ok && fetchData.text) {
                pageText = fetchData.text;
              }
            } catch (fetchErr) {
              console.warn(`Page fetch failed for ${link.url}:`, fetchErr);
            }
            return {
              url: link.url,
              pageType: link.pageType,
              description: link.description,
              pageText:
                pageText.length > 12000
                  ? `${pageText.slice(0, 12000)}\n…[truncated]`
                  : pageText,
            };
          })
        );
      }

      const coldLanguage = shouldSendCompanyEmail
        ? resolveOutreachEmailLanguage({
            mode: outreachEmailLanguageMode,
            pageLanguage: companyInfo?.detectedLanguage,
            jobDescriptionText,
            adaptationSource: cvAdaptationSource,
            fallback: cvLanguage,
          })
        : cvLanguage;

      const outreachSourceForLinkedIn = shouldGenerateCoverLetter
        ? coverLetterSource
        : linkedinMessageSource;

      // Cold mail her zaman STANDART üretilir; info/contact sürümü istemci sarmalaması ile türetilir.
      const bundle = await CompanyBasedCVService.runFullOptimizationBundle({
        cvText,
        cvLanguage,
        adaptationSource: cvAdaptationSource,
        companyInfo:
          cvAdaptationSource === 'company' ? companyInfo || undefined : undefined,
        companyPages:
          cvAdaptationSource === 'company' && !companyInfo ? companyPages : undefined,
        jobDescriptionText: cvAdaptationSource === 'text' ? jobDescriptionText : undefined,
        targetPosition: sanitizeRoleTitle(
          targetPosition ||
            (cvAdaptationSource === 'text'
              ? extractTargetPositionFromJobText(jobDescriptionText)
              : '') ||
            ''
        ),
        keywordTargetSections: {
          about: aiSettings.about,
          workExperience: aiSettings.workExperience,
          skills: aiSettings.skills,
        },
        manualMustMentionTopics,
        manualMustNotMentionTopics,
        generateCoverLetter: shouldGenerateCoverLetter,
        generateLinkedInMessage: shouldGenerateLinkedInMessage,
        generateColdEmail: shouldSendCompanyEmail,
        coverLetterSource,
        linkedinMessageSource: outreachSourceForLinkedIn,
        coldEmailLanguage: coldLanguage,
        coldEmailGenericInboxRouting: false,
        recipientName: coverLetterRecipientName.trim() || undefined,
        recipientCompanyName:
          coverLetterCompanyName.trim() || companyInfo?.name || undefined,
        outreachLinkedinUrl: outreachLinkedinUrl.trim() || undefined,
        outreachPortfolioUrl: outreachPortfolioUrl.trim() || undefined,
        outreachWebsiteUrl: outreachWebsiteUrl.trim() || undefined,
        outreachPhone: outreachPhone.trim() || undefined,
      });

      const resolvedCompany = bundle.companyInfo || companyInfo;
      if (bundle.companyInfo) {
        const bestWebsite = pickBestCompanyUrl(
          companyLinks[0]?.url,
          bundle.companyInfo.website
        );
        const domainForName = normalizeEmailDomainInput(
          emailDomainOverride.trim() ||
            extractDomainFromUrl(bestWebsite) ||
            extractDomainFromUrl(companyLinks[0]?.url || '')
        );
        const cleaned = {
          ...bundle.companyInfo,
          website: bestWebsite || bundle.companyInfo.website,
          name: resolveCompanyDisplayName({
            name: bundle.companyInfo.name,
            website: bestWebsite || bundle.companyInfo.website,
            domain: domainForName,
          }),
        };
        setCompanyInfo(cleaned);
        if (cleaned.name) {
          setCoverLetterCompanyName((prev) => {
            if (!prev.trim()) return cleaned.name;
            if (!domainForName) return prev;
            if (companyNameAlignedWithDomain(prev, domainForName)) return prev;
            return cleaned.name;
          });
        }
      }

      const parsedCVData = bundle.parsedCV;
      const analysis = bundle.analysis;
      const generatedCoverLetter = shouldGenerateCoverLetter ? bundle.coverLetter : '';
      const generatedLinkedInMessage = shouldGenerateLinkedInMessage
        ? bundle.linkedinMessage
        : '';

      const resolvedLinkedin =
        outreachLinkedinUrl.trim() || parsedCVData.personalInfo?.linkedin || '';
      const resolvedPortfolio =
        outreachPortfolioUrl.trim() || parsedCVData.personalInfo?.portfolio || '';
      const resolvedPhone = outreachPhone.trim() || parsedCVData.personalInfo?.phone || '';
      if (!outreachLinkedinUrl.trim() && resolvedLinkedin) {
        setOutreachLinkedinUrl(resolvedLinkedin);
      }
      if (!outreachPortfolioUrl.trim() && resolvedPortfolio) {
        setOutreachPortfolioUrl(resolvedPortfolio);
      }
      if (!outreachPhone.trim() && resolvedPhone) {
        setOutreachPhone(resolvedPhone);
      }

      if (shouldSendCompanyEmail && bundle.coldEmail) {
        const standardBody = String(bundle.coldEmail.body || '').trim();
        const companyLabel = resolveCompanyDisplayName({
          name:
            coverLetterCompanyName.trim() ||
            resolvedCompany?.name ||
            companyInfo?.name ||
            '',
          website: pickBestCompanyUrl(
            companyLinks[0]?.url,
            resolvedCompany?.website,
            companyInfo?.website
          ),
          domain: normalizeEmailDomainInput(
            emailDomainOverride.trim() ||
              extractDomainFromUrl(companyLinks[0]?.url || '') ||
              extractDomainFromUrl(resolvedCompany?.website || companyInfo?.website || '')
          ),
        });
        const candidateEmails = resolveOutreachCandidateEmails({
          emailDomainOverride,
          companyWebsite: resolvedCompany?.website || companyInfo?.website,
          firstCompanyUrl: companyLinks[0]?.url,
          selectedCategoryIds: selectedEmailPrefixCategories,
          customLocalPartsText: customEmailLocalPartsText,
          includePrimaryEmail: includePrimaryEmailInSend,
        });
        setOutreachEmailSubject(bundle.coldEmail.subject);
        setOutreachEmailBody(standardBody);
        setOutreachInfoContactEmailBody(
          anyInfoOrContactEmail(candidateEmails)
            ? buildInfoContactColdBody({
                standardBody,
                companyName: companyLabel,
                language: coldLanguage === 'english' ? 'english' : 'turkish',
              })
            : ''
        );
      } else if (!shouldSendCompanyEmail) {
        setOutreachEmailBody('');
        setOutreachInfoContactEmailBody('');
      }

      setAnalysisResult(analysis);
      setCoverLetter(shouldGenerateCoverLetter ? generatedCoverLetter : '');
      setCoverLetterLanguage(cvLanguage);
      const linkedinText = shouldGenerateLinkedInMessage
        ? String(generatedLinkedInMessage || '').trim()
        : '';
      linkedinMessageRef.current = linkedinText;
      setLinkedinMessage(linkedinText);
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
          linkedin: parsedCVData.personalInfo?.linkedin || '',
          photoUrl: includeCvPhoto && profilePhotoUrl ? profilePhotoUrl : '',
          includePhoto: Boolean(includeCvPhoto && profilePhotoUrl),
          photoSizePt: CV_PHOTO_SIZE_PT,
        },
        about: (() => {
          const originalAbout = parsedCVData.about || '';
          if (!aiSettings.about) return originalAbout;
          const updated = analysis.updatedAbout || '';
          if (!updated.trim()) return originalAbout;
          const o = countWords(originalAbout);
          const u = countWords(updated);
          if (o > 0 && u < o * 0.9) {
            console.warn(`Hakkımda kısaltıldı (${u}/${o}) — orijinal korundu`);
            return originalAbout;
          }
          return updated;
        })(),
        workExperience: aiSettings.workExperience
          ? parseWorkExperienceFromText(
              analysis.updatedExperience,
              parsedCVData.workExperience || []
            )
          : parsedCVData.workExperience || [],
        education: parsedCVData.education || [],
        skills: aiSettings.skills
          ? parseSkillsFromText(analysis.updatedSkills, parsedCVData.skills || [])
          : parsedCVData.skills || [],
        languages: parsedCVData.languages || [],
        companyInfo: resolvedCompany || undefined,
        analysisResult: analysis,
        coverLetter: shouldGenerateCoverLetter ? generatedCoverLetter : undefined,
        linkedinMessage: shouldGenerateLinkedInMessage
          ? linkedinText || generatedLinkedInMessage
          : undefined,
        analysisPreferences: {
          targetPosition: sanitizeRoleTitle(targetPosition) || undefined,
          manualMustMentionTopics,
          manualMustNotMentionTopics,
        },
      };

      setCvData(adaptedCVData);
      setEditableCVData(adaptedCVData);

      // My Resumes yalnızca CV Create kaydından dolar; company-based buraya yazılmaz.

      // Alıcı adaylarını üret; varsayılan olarak ilk 3 (veya max limit) seç
      let recipientsForAutoSend: string[] = [];
      if (shouldSendCompanyEmail) {
        const domain = normalizeEmailDomainInput(
          emailDomainOverride ||
            extractDomainFromUrl(resolvedCompany?.website || '') ||
            extractDomainFromUrl(companyLinks[0]?.url || '')
        );
        const candidates = buildRecipientEmails({
          domain,
          selectedCategoryIds: selectedEmailPrefixCategories,
          customLocalParts: customEmailLocalPartsText
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          rawDomainInput:
            emailDomainOverride ||
            resolvedCompany?.website ||
            companyLinks[0]?.url ||
            domain,
          includePrimaryEmail: includePrimaryEmailInSend,
        });
        recipientsForAutoSend =
          selectedEmailPrefixCategories.some(isExclusiveEmailCategory)
            ? candidates
            : candidates.slice(0, 3);
        setSelectedOutreachRecipients(recipientsForAutoSend);
      }

      setActiveStep(2);

      // Proje seçiliyse analiz kaydı (mail yok — otomatik gönderim ayrıca çalışır)
      if (selectedOutreachProjectId) {
        const analysisDomain = normalizeEmailDomainInput(
          emailDomainOverride ||
            extractDomainFromUrl(resolvedCompany?.website || '') ||
            extractDomainFromUrl(companyLinks[0]?.url || '')
        );
        void createOutreachAnalysisOnlyLogRequest({
          projectId: selectedOutreachProjectId,
          domain: analysisDomain || undefined,
          companyName: resolveCompanyDisplayName({
            name: coverLetterCompanyName || resolvedCompany?.name,
            website: pickBestCompanyUrl(
              companyLinks[0]?.url,
              resolvedCompany?.website
            ),
            domain: analysisDomain,
          }) || undefined,
          cvFileName: cvFile?.name,
          targetPosition: targetPosition || undefined,
          matchScore: analysis.matchScore,
          companyUrl:
            pickBestCompanyUrl(companyLinks[0]?.url, resolvedCompany?.website) ||
            undefined,
          reanalyzeContext: {
            companyUrl:
              pickBestCompanyUrl(companyLinks[0]?.url, resolvedCompany?.website) ||
              '',
            rawDomainInput:
              emailDomainOverride ||
              companyLinks[0]?.url ||
              resolvedCompany?.website ||
              analysisDomain ||
              '',
            domain: analysisDomain || '',
            companyName: resolveCompanyDisplayName({
              name: coverLetterCompanyName || resolvedCompany?.name,
              website: pickBestCompanyUrl(
                companyLinks[0]?.url,
                resolvedCompany?.website
              ),
              domain: analysisDomain,
            }) || '',
            targetPosition: targetPosition || '',
            projectId: selectedOutreachProjectId,
            selectedCategories: selectedEmailPrefixCategories,
            pageType: companyLinks[0]?.pageType || lastCompanyPageType,
            pageTypeOther:
              (companyLinks[0]?.pageType || lastCompanyPageType) === 'other'
                ? companyLinks[0]?.pageTypeOther || lastCompanyPageTypeOther
                : '',
            cvLanguage,
            outreachEmailLanguageMode,
            customEmailLocalParts: customEmailLocalPartsText
              .split(/[\n,;]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            includePrimaryEmailInSend,
            skipPrimaryEmailVerification,
            shouldSendCompanyEmail,
            shouldGenerateCoverLetter,
            shouldGenerateLinkedInMessage,
            coverLetterSource,
            linkedinMessageSource,
            cvAdaptationSource,
            outreachCvAttachmentSource,
            includeCvPhoto,
            aiSettings,
          },
        }).catch(() => undefined);
      }

      // Profil ayarı: analiz sonrası otomatik mail (mail gönderimi de açık olmalı)
      if (
        shouldSendCompanyEmail &&
        autoSendOutreachAfterAnalysis &&
        bundle.coldEmail?.body &&
        recipientsForAutoSend.length > 0
      ) {
        await sendCompanyEmailRef.current({
          recipientsOverride: recipientsForAutoSend,
          bodyOverride: bundle.coldEmail.body,
          subjectOverride: bundle.coldEmail.subject,
          cvDataOverride: adaptedCVData,
          linkedinMessageOverride: linkedinText || undefined,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'CV analiz edilirken bir hata oluştu.');
      console.error('CV analysis error:', err);
      const domain = normalizeEmailDomainInput(
        emailDomainOverride ||
          extractDomainFromUrl(companyInfo?.website || '') ||
          extractDomainFromUrl(companyLinks[0]?.url || '')
      );
      void createOutreachAiErrorLogRequest({
        domain: domain || undefined,
        companyName: coverLetterCompanyName || companyInfo?.name || undefined,
        errorMessage: message || 'CV AI analizi başarısız',
        cvFileName: cvFile?.name,
        targetPosition: targetPosition || undefined,
        projectId: selectedOutreachProjectId,
      }).catch(() => undefined);
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

  const handleSendCompanyEmail = async (opts?: {
    recipientsOverride?: string[];
    bodyOverride?: string;
    subjectOverride?: string;
    cvDataOverride?: CompanyBasedCVData | null;
    linkedinMessageOverride?: string;
    forceResend?: boolean;
  }) => {
    // Çift tıklama / auto-send + manuel yarışı: aynı maili 2 kez göndermeyi engelle
    if (outreachSendingLockRef.current || outreachSending) {
      return;
    }

    const isAutoSendPipelineCall = Boolean(
      opts?.recipientsOverride || opts?.bodyOverride || opts?.cvDataOverride
    );
    // forceResend durumunda manuel gönderime izin ver (Yine de Gönder butonu)
    const isForceResendBypass = Boolean(opts?.forceResend);
    
    if (autoSendOutreachAfterAnalysis && !isAutoSendPipelineCall && !isForceResendBypass) {
      setError(
        'Profil ayarı: otomatik gönderim açık. Manuel gönderim kapalıdır. Profilim’den ayarı kapatabilirsiniz.'
      );
      return;
    }

    if (!shouldSendCompanyEmail) {
      setError('Mail gönderimi seçili değil.');
      return;
    }

    const cvDataForSend = opts?.cvDataOverride ?? cvData;

    const recipients = [
      ...new Set(
        (opts?.recipientsOverride ?? selectedOutreachRecipients)
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    if (!recipients.length) {
      setError('En az bir alıcı seçmelisiniz (tek tek işaretleyin).');
      return;
    }

    const companyLabel = resolveCompanyDisplayName({
      name: coverLetterCompanyName.trim() || companyInfo?.name,
      website: pickBestCompanyUrl(companyLinks[0]?.url, companyInfo?.website),
      domain: normalizeEmailDomainInput(
        emailDomainOverride.trim() ||
          extractDomainFromUrl(companyLinks[0]?.url || '') ||
          extractDomainFromUrl(companyInfo?.website || '')
      ),
    });
    const coldLangResolved = resolveOutreachEmailLanguage({
      mode: outreachEmailLanguageMode,
      pageLanguage: companyInfo?.detectedLanguage,
      jobDescriptionText,
      adaptationSource: cvAdaptationSource,
      fallback: cvLanguage,
    });

    // Tek alıcı info/contact ise yalnızca özel gövde; karışık/standartta standart gövde (backend info’yu sarar).
    let bodyText = (opts?.bodyOverride ?? '').trim();
    if (!bodyText) {
      if (onlyInfoOrContactEmails(recipients)) {
        bodyText =
          outreachInfoContactEmailBody.trim() ||
          buildInfoContactColdBody({
            standardBody: outreachEmailBody,
            companyName: companyLabel,
            language: coldLangResolved === 'english' ? 'english' : 'turkish',
          });
      } else {
        bodyText = outreachEmailBody.trim();
      }
    }
    if (!bodyText) {
      setError('Cold mail henüz üretilmedi. Optimizasyonu çalıştırın veya Yeniden üret kullanın.');
      return;
    }

    const inferredDomain = normalizeEmailDomainInput(
      emailDomainOverride.trim() ||
        extractDomainFromUrl(companyInfo?.website || '') ||
        extractDomainFromUrl(companyLinks[0]?.url || '')
    );

    outreachSendingLockRef.current = true;
    setOutreachSending(true);
    setOutreachSendResult(null);
    setError(null);

    try {
      // Gönderici adı = giriş yapan kullanıcı profili (ad + soyad zorunlu)
      const meRes = await authFetch('/api/auth/me');
      const meData = (await meRes.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { firstName?: string; lastName?: string };
      };
      const profileFirst = String(meData.user?.firstName || '').trim();
      const profileLast = String(meData.user?.lastName || '').trim();
      if (!meRes.ok || !profileFirst || !profileLast) {
        setError(
          'Mail gönderimi için profilinizde ad ve soyad zorunludur. Profilim sayfasından kaydedin.'
        );
        return;
      }

      let pdfAttachment: { filename: string; contentBase64: string; contentType: string } | undefined;

      const bestCompanyUrl = pickBestCompanyUrl(
        companyLinks[0]?.url,
        companyInfo?.website,
        cvDataForSend?.companyInfo?.website
      );

      const displayCompanyName = resolveCompanyDisplayName({
        name: coverLetterCompanyName || companyInfo?.name || cvDataForSend?.companyInfo?.name,
        website: bestCompanyUrl,
        domain: inferredDomain,
      });
      if (
        displayCompanyName &&
        displayCompanyName !== coverLetterCompanyName.trim() &&
        inferredDomain &&
        !companyNameAlignedWithDomain(coverLetterCompanyName.trim(), inferredDomain)
      ) {
        setCoverLetterCompanyName(displayCompanyName);
      }

      if (outreachCvAttachmentSource === 'optimized') {
        const sourceData = opts?.cvDataOverride || editableCVData || cvDataForSend;
        if (!sourceData) {
          setError('Optimize CV henüz hazır değil. Önce optimizasyonu tamamlayın veya orijinal CV seçin.');
          return;
        }
        const pdfSource =
          displayCompanyName && sourceData.companyInfo
            ? {
                ...sourceData,
                companyInfo: { ...sourceData.companyInfo, name: displayCompanyName },
              }
            : displayCompanyName
              ? {
                  ...sourceData,
                  companyInfo: {
                    name: displayCompanyName,
                    website: bestCompanyUrl || companyInfo?.website || '',
                    description: '',
                    industry: '',
                    values: [],
                    requirements: [],
                    culture: '',
                    analyzedLinks: [],
                  },
                }
              : sourceData;
        pdfAttachment = await generateOptimizedCvPdfAttachment(pdfSource, {
          isEnglish: cvLanguage === 'english',
          bodyFontSize,
          headingFontSize,
          jobTitleFontSize,
          skillsFontSize,
          nameFontSize,
          profileTitleFontSize,
          companyName: displayCompanyName,
        });
      } else if (cvFile) {
        const contentBase64 = await fileToBase64(cvFile);
        pdfAttachment = {
          filename: cvFile.name || 'CV.pdf',
          contentBase64,
          contentType: cvFile.type || 'application/pdf',
        };
      }

      const attachmentLabel =
        outreachCvAttachmentSource === 'optimized' ? 'optimize edilmiş CV' : 'orijinal yüklenen CV';

      const result = await sendCompanyOutreachRequest({
        recipients,
        subject:
          (opts?.subjectOverride ?? outreachEmailSubject).trim() ||
          `Başvuru${displayCompanyName ? ` — ${displayCompanyName}` : ''}`,
        bodyText,
        replyTo: cvDataForSend?.personalInfo?.email || undefined,
        companyName: displayCompanyName || undefined,
        domain: inferredDomain,
        rawDomainInput:
          emailDomainOverride.trim() ||
          companyInfo?.website ||
          companyLinks[0]?.url ||
          inferredDomain,
        trustedEmail: (() => {
          // trusted = hem gönder hem doğrulamayı atla
          if (!includePrimaryEmailInSend || !skipPrimaryEmailVerification) return undefined;
          const raw = emailDomainOverride.trim();
          if (!raw.includes('@')) return undefined;
          const domain = normalizeEmailDomainInput(raw);
          const local = raw.split('@')[0]?.trim().toLowerCase();
          if (!local || !domain) return undefined;
          return `${local}@${domain}`;
        })(),
        cvFileName: pdfAttachment?.filename || cvFile?.name || undefined,
        cvTitle:
          [
            cvDataForSend?.personalInfo?.firstName,
            cvDataForSend?.personalInfo?.lastName,
            cvDataForSend?.personalInfo?.title,
          ]
            .filter(Boolean)
            .join(' ') || cvFile?.name,
        selectedCategories: selectedEmailPrefixCategories,
        templateType: 'cold_email',
        targetPosition: targetPosition || undefined,
        forceResend: opts?.forceResend ?? forceOutreachResend,
        pdfAttachment,
        projectId: selectedOutreachProjectId,
        linkedinMessageText: (() => {
          const fromOverride = String(opts?.linkedinMessageOverride || '').trim();
          const fromRef = String(linkedinMessageRef.current || '').trim();
          const fromState = String(linkedinMessage || '').trim();
          const fromCv = String(cvDataForSend?.linkedinMessage || '').trim();
          const text = fromOverride || fromRef || fromState || fromCv;
          if (text) linkedinMessageRef.current = text;
          return text || undefined;
        })(),
        companyUrl: bestCompanyUrl || undefined,
        reanalyzeContext: {
          companyUrl: bestCompanyUrl || '',
          rawDomainInput:
            emailDomainOverride.trim() ||
            companyLinks[0]?.url ||
            companyInfo?.website ||
            inferredDomain,
          domain: inferredDomain,
          companyName: displayCompanyName || '',
          targetPosition: targetPosition || '',
          projectId: selectedOutreachProjectId,
          selectedCategories: selectedEmailPrefixCategories,
          pageType: companyLinks[0]?.pageType || lastCompanyPageType,
          pageTypeOther:
            (companyLinks[0]?.pageType || lastCompanyPageType) === 'other'
              ? companyLinks[0]?.pageTypeOther || lastCompanyPageTypeOther
              : '',
          cvLanguage,
          outreachEmailLanguageMode,
          customEmailLocalParts: customEmailLocalPartsText
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          includePrimaryEmailInSend,
          skipPrimaryEmailVerification,
          shouldSendCompanyEmail,
          shouldGenerateCoverLetter,
          shouldGenerateLinkedInMessage,
          coverLetterSource,
          linkedinMessageSource,
          cvAdaptationSource,
          outreachCvAttachmentSource,
          includeCvPhoto,
          aiSettings,
          linkedinMessageSnapshot: (() => {
            const fromOverride = String(opts?.linkedinMessageOverride || '').trim();
            const fromRef = String(linkedinMessageRef.current || '').trim();
            const fromState = String(linkedinMessage || '').trim();
            const fromCv = String(cvDataForSend?.linkedinMessage || '').trim();
            return fromOverride || fromRef || fromState || fromCv || '';
          })(),
        },
      });
      setOutreachSendResult(
        `${result.message || `${result.sentCount}/${result.total} alıcıya gönderildi.`}${
          result.attachmentIncluded ? ` PDF eki: ${attachmentLabel}.` : ''
        }${
          result.verification?.provider
            ? ` Doğrulama: ${result.verification.provider}.`
            : ''
        }${
          result.persisted === false
            ? ' (Kaydetme tercihi kapalı — geçmişe yazılmadı.)'
            : result.logId
              ? ' Log kaydı oluşturuldu.'
              : ''
        }`
      );
      // Gönderim sonrası itibar skorunu yenile (engagement sayısı güncellensin)
      void refreshDeliverabilityScore(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mail gönderilemedi.';
      const details = (err as Error & { details?: { logId?: string; canForceResend?: boolean; code?: string } }).details;
      
      // DOMAIN_ALREADY_CONTACTED hatası için özel mesaj
      if (details?.code === 'DOMAIN_ALREADY_CONTACTED' || details?.canForceResend) {
        setError(message); // Mesaj zaten netleştirilmiş backend'den
        // forceOutreachResend'i true yapmıyoruz, kullanıcı butona basacak
      } else {
        setError(
          details?.logId
            ? `${message} (Log kaydı oluşturuldu — Mail Logları sayfasından görebilirsiniz.)`
            : message
        );
      }
    } finally {
      outreachSendingLockRef.current = false;
      setOutreachSending(false);
    }
  };
  sendCompanyEmailRef.current = handleSendCompanyEmail;

  const handleRegenerateColdEmail = async () => {
    if (!cvData) {
      setError('Önce CV analizi tamamlanmalı.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const highlights = (cvData.workExperience || [])
        .flatMap((w) => (Array.isArray(w.bulletPoints) ? w.bulletPoints : []))
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 8);
      const coldSource = cvAdaptationSource;
      const coldLanguage = resolveOutreachEmailLanguage({
        mode: outreachEmailLanguageMode,
        pageLanguage: companyInfo?.detectedLanguage,
        jobDescriptionText,
        adaptationSource: coldSource,
        fallback: cvLanguage,
      });
      const cold = await CompanyBasedCVService.generateCompanyColdEmail({
        source: coldSource,
        companyInfo: coldSource === 'company' ? companyInfo || undefined : undefined,
        jobDescriptionText: coldSource === 'text' ? jobDescriptionText : undefined,
        personalInfo: cvData.personalInfo,
        about: cvData.about,
        cvLanguage: coldLanguage,
        candidateSkills: cvData.skills || [],
        candidateHighlights: highlights,
        recipientName: coverLetterRecipientName.trim() || undefined,
        recipientCompanyName: coverLetterCompanyName.trim() || companyInfo?.name || undefined,
        targetPosition: sanitizeRoleTitle(
          targetPosition || cvData.personalInfo?.title || 'Full Stack Web Developer'
        ),
        linkedinUrl: outreachLinkedinUrl.trim() || undefined,
        portfolioUrl: outreachPortfolioUrl.trim() || undefined,
        websiteUrl: outreachWebsiteUrl.trim() || undefined,
        phoneOverride: outreachPhone.trim() || undefined,
        genericInboxRouting: false,
      });
      const standardBody = String(cold.body || '').trim();
      const companyLabel =
        coverLetterCompanyName.trim() || companyInfo?.name || '';
      const candidateEmails =
        selectedOutreachRecipients.length > 0
          ? selectedOutreachRecipients
          : resolveOutreachCandidateEmails({
              emailDomainOverride,
              companyWebsite: companyInfo?.website,
              firstCompanyUrl: companyLinks[0]?.url,
              selectedCategoryIds: selectedEmailPrefixCategories,
              customLocalPartsText: customEmailLocalPartsText,
              includePrimaryEmail: includePrimaryEmailInSend,
            });
      setOutreachEmailSubject(cold.subject);
      setOutreachEmailBody(standardBody);
      setOutreachInfoContactEmailBody(
        anyInfoOrContactEmail(candidateEmails)
          ? buildInfoContactColdBody({
              standardBody,
              companyName: companyLabel,
              language: coldLanguage === 'english' ? 'english' : 'turkish',
            })
          : ''
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cold mail üretilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return {
    activeStep,
    setActiveStep,
    cvFile,
    cvLanguage,
    setCvLanguage,
    includeCvPhoto,
    setIncludeCvPhoto,
    profilePhotoUrl,
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
    shouldSendCompanyEmail,
    setShouldSendCompanyEmail,
    autoSendOutreachAfterAnalysis,
    selectedEmailPrefixCategories,
    setSelectedEmailPrefixCategories,
    customEmailLocalPartsText,
    setCustomEmailLocalPartsText,
    emailDomainOverride,
    setEmailDomainOverride,
    domainHistoryCheckNonce,
    includePrimaryEmailInSend,
    setIncludePrimaryEmailInSend,
    skipPrimaryEmailVerification,
    setSkipPrimaryEmailVerification,
    selectedOutreachProjectId,
    setSelectedOutreachProjectId: handleSelectOutreachProject,
    outreachProjects,
    outreachProjectsLoading,
    selectedOutreachRecipients,
    setSelectedOutreachRecipients,
    forceOutreachResend,
    setForceOutreachResend,
    outreachEmailLanguageMode,
    setOutreachEmailLanguageMode,
    outreachEmailSubject,
    setOutreachEmailSubject,
    outreachEmailBody,
    setOutreachEmailBody,
    outreachInfoContactEmailBody,
    setOutreachInfoContactEmailBody,
    outreachLinkedinUrl,
    setOutreachLinkedinUrl,
    outreachPortfolioUrl,
    setOutreachPortfolioUrl,
    outreachWebsiteUrl,
    setOutreachWebsiteUrl,
    outreachPhone,
    setOutreachPhone,
    outreachSending,
    outreachSendResult,
    outreachCvAttachmentSource,
    setOutreachCvAttachmentSource,
    handleSendCompanyEmail,
    handleRegenerateColdEmail,
    loading,
    error,
    setError,
    aiSettings,
    setAiSettings,
    isEditing,
    editableCVData,
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
    deliverabilityScore,
    deliverabilityLoading,
    refreshDeliverabilityScore: () => refreshDeliverabilityScore(true),
  };
}
