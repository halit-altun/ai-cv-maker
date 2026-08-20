import type { CompanyBasedCVData, CompanyInfo, CVAnalysisResponse, CompanyLink } from '@/lib/company-based-cv-editor/types';
import type { CvSectionLengthMode } from '@/lib/company-based-cv-editor/cvSectionLength';
import type { EmailPrefixCategoryId } from '../constants/outreachConstants';
import type {
  CvBodyFontSize,
  CvHeadingFontSize,
  CvJobTitleFontSize,
  CvNameFontSize,
  CvProfileTitleFontSize,
  CvSkillsFontSize,
} from '@/components/cv-maker/cvTypography';

export interface AIAdaptationSettings {
  about: boolean;
  workExperience: boolean;
  skills: boolean;
}

export type CvLanguage = 'turkish' | 'english';
export type AdaptationSource = 'company' | 'text';
/** Cold mail dili: sayfa diline uy / TR / EN */
export type OutreachEmailLanguageMode = 'auto' | 'turkish' | 'english';
/** Mail ekinde hangi CV PDF'i gönderilecek */
export type OutreachCvAttachmentSource = 'optimized' | 'original';

export interface RecentUploadItem {
  id: string;
  name: string;
  type: 'pdf' | 'docx';
  uploadedAt: string;
  sizeLabel: string;
}

export interface CompanyCvOptimizerState {
  activeStep: number;
  setActiveStep: (step: number) => void;
  cvFile: File | null;
  cvLanguage: CvLanguage;
  setCvLanguage: (lang: CvLanguage) => void;
  includeCvPhoto: boolean;
  setIncludeCvPhoto: (value: boolean) => void;
  profilePhotoUrl: string;
  cvRestoredFromCache: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  companyLinks: CompanyLink[];
  companyInfo: CompanyInfo | null;
  cvData: CompanyBasedCVData | null;
  analysisResult: CVAnalysisResponse | null;
  coverLetter: string;
  coverLetterLanguage: CvLanguage;
  shouldGenerateCoverLetter: boolean;
  setShouldGenerateCoverLetter: (v: boolean) => void;
  cvAdaptationSource: AdaptationSource;
  setCvAdaptationSource: (v: AdaptationSource) => void;
  coverLetterSource: AdaptationSource;
  setCoverLetterSource: (v: AdaptationSource) => void;
  coverLetterRecipientName: string;
  setCoverLetterRecipientName: (v: string) => void;
  coverLetterCompanyName: string;
  setCoverLetterCompanyName: (v: string) => void;
  linkedinMessage: string;
  linkedinMessageLanguage: CvLanguage;
  shouldGenerateLinkedInMessage: boolean;
  setShouldGenerateLinkedInMessage: (v: boolean) => void;
  linkedinMessageSource: AdaptationSource;
  setLinkedinMessageSource: (v: AdaptationSource) => void;
  targetPosition: string;
  setTargetPosition: (v: string) => void;
  manualMustMentionTopicsText: string;
  setManualMustMentionTopicsText: (v: string) => void;
  manualMustNotMentionTopicsText: string;
  setManualMustNotMentionTopicsText: (v: string) => void;
  jobDescriptionText: string;
  setJobDescriptionText: (v: string) => void;
  shouldSendCompanyEmail: boolean;
  setShouldSendCompanyEmail: (v: boolean) => void;
  /** Profilim: analiz sonrası otomatik mail */
  autoSendOutreachAfterAnalysis: boolean;
  /** Profilim: aralıklı kuyruk (kapalı = tarayıcıda eski gönderim) */
  queuedIntervalOutreach: boolean;
  selectedEmailPrefixCategories: EmailPrefixCategoryId[];
  setSelectedEmailPrefixCategories: React.Dispatch<React.SetStateAction<EmailPrefixCategoryId[]>>;
  customEmailLocalPartsText: string;
  setCustomEmailLocalPartsText: (v: string) => void;
  emailDomainOverride: string;
  setEmailDomainOverride: (v: string) => void;
  /** Yeniden analiz vb. sonrası domain geçmişi sorgusunu zorla */
  domainHistoryCheckNonce: number;
  /** Ana adresi (girilen @ içeren) alıcı listesine ekle — varsayılan true */
  includePrimaryEmailInSend: boolean;
  setIncludePrimaryEmailInSend: (v: boolean) => void;
  /** Ana adres gönderilirken doğrulamayı atla (trusted) — varsayılan false; bağımsız seçenek */
  skipPrimaryEmailVerification: boolean;
  setSkipPrimaryEmailVerification: (v: boolean) => void;
  /** Girilen ana domain adresini (email yoksa info@) listeye ekle ve doğrulamadan gönder */
  includeEnteredMainDomainInSend: boolean;
  setIncludeEnteredMainDomainInSend: (v: boolean) => void;
  cvSectionLengthMode: CvSectionLengthMode;
  setCvSectionLengthMode: React.Dispatch<React.SetStateAction<CvSectionLengthMode>>;
  /** Outreach projesi (null = projesiz) */
  selectedOutreachProjectId: string | null;
  setSelectedOutreachProjectId: (v: string | null) => void;
  outreachProjects: Array<{ id: string; name: string }>;
  outreachProjectsLoading: boolean;
  /** Gönderilecek alıcılar (tek tek seçim) */
  selectedOutreachRecipients: string[];
  setSelectedOutreachRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  forceOutreachResend: boolean;
  setForceOutreachResend: (v: boolean) => void;
  outreachEmailLanguageMode: OutreachEmailLanguageMode;
  setOutreachEmailLanguageMode: (v: OutreachEmailLanguageMode) => void;
  outreachEmailSubject: string;
  setOutreachEmailSubject: (v: string) => void;
  outreachEmailBody: string;
  setOutreachEmailBody: (v: string) => void;
  /** info@ / contact@ / hello@ / sales@ / support@ / bilgi@ / destek@ / iletisim@ için yönlendirmeli cold mail önizlemesi */
  outreachInfoContactEmailBody: string;
  setOutreachInfoContactEmailBody: (v: string) => void;
  /** Cold mail imza için opsiyonel linkler */
  outreachLinkedinUrl: string;
  setOutreachLinkedinUrl: (v: string) => void;
  outreachPortfolioUrl: string;
  setOutreachPortfolioUrl: (v: string) => void;
  outreachWebsiteUrl: string;
  setOutreachWebsiteUrl: (v: string) => void;
  outreachPhone: string;
  setOutreachPhone: (v: string) => void;
  outreachSending: boolean;
  outreachSendResult: string | null;
  outreachSendSeverity: 'success' | 'warning';
  outreachCvAttachmentSource: OutreachCvAttachmentSource;
  setOutreachCvAttachmentSource: (v: OutreachCvAttachmentSource) => void;
  handleSendCompanyEmail: (opts?: {
    recipientsOverride?: string[];
    bodyOverride?: string;
    subjectOverride?: string;
    cvDataOverride?: CompanyBasedCVData | null;
    linkedinMessageOverride?: string;
    forceResend?: boolean;
  }) => Promise<boolean>;
  handleRegenerateColdEmail: () => Promise<void>;
  loading: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  aiSettings: AIAdaptationSettings;
  setAiSettings: React.Dispatch<React.SetStateAction<AIAdaptationSettings>>;
  isEditing: boolean;
  editableCVData: CompanyBasedCVData | null;
  nameFontSize: CvNameFontSize;
  setNameFontSize: (v: CvNameFontSize) => void;
  profileTitleFontSize: CvProfileTitleFontSize;
  setProfileTitleFontSize: (v: CvProfileTitleFontSize) => void;
  bodyFontSize: CvBodyFontSize;
  setBodyFontSize: (v: CvBodyFontSize) => void;
  headingFontSize: CvHeadingFontSize;
  setHeadingFontSize: (v: CvHeadingFontSize) => void;
  jobTitleFontSize: CvJobTitleFontSize;
  setJobTitleFontSize: (v: CvJobTitleFontSize) => void;
  skillsFontSize: CvSkillsFontSize;
  setSkillsFontSize: (v: CvSkillsFontSize) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearStoredCv: () => Promise<void>;
  handlePrepareNewAnalysisSameCv: (options?: { preserveSendNotice?: boolean }) => void;
  addCompanyLink: () => void;
  removeCompanyLink: (index: number) => void;
  updateCompanyLink: (index: number, field: keyof CompanyLink, value: string) => void;
  handleCompanyLinksSubmit: () => Promise<void>;
  handleAnalyzeCV: (options?: { fromJobAnalysis?: boolean }) => Promise<void>;
  handleCopyCoverLetter: () => Promise<void>;
  handleCopyLinkedinMessage: () => Promise<void>;
  coverLetterWordCount: number;
  handleStartEditing: () => void;
  handleCancelEditing: () => void;
  handleSaveEditing: () => void;
  handleUpdateField: (field: string, value: unknown) => void;
  handleUpdateWorkExperience: (index: number, field: string, value: unknown) => void;
  handleUpdateWorkExperienceBullet: (expIndex: number, bulletIndex: number, value: string) => void;
  handleAddWorkExperienceBullet: (expIndex: number) => void;
  handleRemoveWorkExperienceBullet: (expIndex: number, bulletIndex: number) => void;
  handleTranslateToEnglish: (translatedData: CompanyBasedCVData) => void;
  getWordCount: (value: string) => number;
  setCoverLetter: (value: string) => void;
  setLinkedinMessage: (value: string) => void;
  deliverabilityScore: any | null;
  deliverabilityLoading: boolean;
  refreshDeliverabilityScore: () => Promise<void>;
}
