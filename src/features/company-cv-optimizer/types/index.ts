import type { CompanyBasedCVData, CompanyInfo, CVAnalysisResponse, CompanyLink } from '@/lib/company-based-cv-editor/types';

export interface AIAdaptationSettings {
  about: boolean;
  workExperience: boolean;
  skills: boolean;
}

export type CvLanguage = 'turkish' | 'english';
export type AdaptationSource = 'company' | 'text';

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
  loading: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  aiSettings: AIAdaptationSettings;
  setAiSettings: React.Dispatch<React.SetStateAction<AIAdaptationSettings>>;
  isEditing: boolean;
  editableCVData: CompanyBasedCVData | null;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearStoredCv: () => Promise<void>;
  handlePrepareNewAnalysisSameCv: () => void;
  addCompanyLink: () => void;
  removeCompanyLink: (index: number) => void;
  updateCompanyLink: (index: number, field: keyof CompanyLink, value: string) => void;
  handleCompanyLinksSubmit: () => Promise<void>;
  handleAnalyzeCV: () => Promise<void>;
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
}
