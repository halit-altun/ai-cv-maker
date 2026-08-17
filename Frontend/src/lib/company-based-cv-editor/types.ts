// Company-based CV Editor Types

import type { CompanyPageType } from '@/features/company-cv-optimizer/constants/outreachConstants';

export interface CompanyLink {
  url: string;
  /** Tek seçimli sayfa tipi */
  pageType?: CompanyPageType;
  /** pageType === 'other' ise kullanıcı girdisi */
  pageTypeOther?: string;
  /** Geriye dönük uyumluluk — pageType varsa ondan türetilir */
  description: string;
}

export interface CompanyInfo {
  name: string;
  website: string;
  description: string;
  industry: string;
  values: string[];
  requirements: string[];
  culture: string;
  analyzedLinks: CompanyLink[];
  /** Sayfalardan çıkarılan hedef anahtar kelimeler */
  extractedKeywords?: string[];
  /** Fetch edilen sayfa(lar)ın baskın dili */
  detectedLanguage?: 'turkish' | 'english' | 'other';
}

export type CVAdaptationSource = 'company' | 'text';

export interface KeywordIntegrationReportItem {
  keyword: string;
  /**
   * about | experience | both | none | already_present
   * already_present = KW CV'nin tamamında zaten geçiyor; dokumaya alınmaz
   */
  integratedIn: 'about' | 'experience' | 'both' | 'none' | 'already_present';
  note: string;
}

export interface CVAnalysisRequest {
  cvText: string;
  companyUrl?: string;
  companyInfo?: CompanyInfo;
  jobDescriptionText?: string;
  targetPosition?: string;
  adaptationSource?: CVAdaptationSource;
  cvLanguage?: 'turkish' | 'english';
  candidateExperienceYears?: number | null;
  candidateExperienceRange?: { start: string; end: string };
  candidateSkills?: string[];
  candidateLanguages?: Array<{ language: string; level: string }>;
  manualMustMentionTopics?: string[];
  manualMustNotMentionTopics?: string[];
  /** KW entegrasyonu için seçili alanlar */
  keywordTargetSections?: {
    about: boolean;
    workExperience: boolean;
  };
  /** Uzunluk bütçesi için mevcut hakkımda metni */
  currentAbout?: string;
  /** Uzunluk bütçesi + bullet sayısı koruma için mevcut deneyimler */
  currentWorkExperience?: Array<{
    position?: string;
    company?: string;
    bulletPoints?: string[];
  }>;
}

export interface CVAnalysisResponse {
  originalAbout: string;
  updatedAbout: string;
  originalExperience: string;
  updatedExperience: string;
  originalSkills: string;
  updatedSkills: string;
  originalLanguages: string;
  updatedLanguages: string;
  recommendations: string[];
  matchScore: number;
  positiveMatches?: Array<{
    label: string;
    evidence: string;
  }>;
  negativeMismatches?: Array<{
    label: string;
    gap: string;
    evidence?: string;
  }>;
  /** Hedef KW'lerin nereye entegre edildiği / edilemediği */
  keywordIntegrationReport?: KeywordIntegrationReportItem[];
  /** Dokumaya alınan ana KW'ler (CV'de olmayan, ≤5) */
  detectedKeywords?: string[];
  /** İlan/sayfadan aday havuz (≤10) — CV filtresi öncesi */
  candidateKeywords?: string[];
}

/** Optimizasyon adımı — tek AI isteği çıktısı */
export interface CompanyOptimizationBundleRequest {
  cvText: string;
  cvLanguage: 'turkish' | 'english';
  adaptationSource: CVAdaptationSource;
  companyInfo?: CompanyInfo;
  jobDescriptionText?: string;
  targetPosition?: string;
  keywordTargetSections?: {
    about: boolean;
    workExperience: boolean;
    skills: boolean;
  };
  /** Hakkımda 450–600 / madde 130–150 karaktere çek vs yalnızca KW */
  cvSectionLengthMode?: 'fit_range' | 'keywords_only';
  manualMustMentionTopics?: string[];
  manualMustNotMentionTopics?: string[];
  generateCoverLetter?: boolean;
  generateLinkedInMessage?: boolean;
  generateColdEmail?: boolean;
  coverLetterSource?: CVAdaptationSource;
  linkedinMessageSource?: CVAdaptationSource;
  coldEmailLanguage?: 'turkish' | 'english';
  /** info@ / contact@ genel kutu: cold mail’e yönlendirme girişi+teşekkür (diğer maillerde false) */
  coldEmailGenericInboxRouting?: boolean;
  recipientName?: string;
  recipientCompanyName?: string;
  outreachLinkedinUrl?: string;
  outreachPortfolioUrl?: string;
  outreachWebsiteUrl?: string;
  outreachPhone?: string;
  /** Şirket sayfaları (henüz companyInfo yoksa tek AI'de profil çıkarımı için) */
  companyPages?: Array<{
    url: string;
    pageType?: string;
    description?: string;
    pageText: string;
  }>;
}

export interface CompanyOptimizationBundleResult {
  parsedCV: Partial<CompanyBasedCVData>;
  analysis: CVAnalysisResponse;
  coverLetter: string;
  linkedinMessage: string;
  coldEmail: { subject: string; body: string } | null;
  /** companyPages verildiyse AI'nin ürettiği şirket profili */
  companyInfo?: CompanyInfo;
}

export interface GeminiAPIRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    responseMimeType?: string;
    maxOutputTokens?: number;
  };
}

export interface GeminiAPIResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
    finishReason?: string;
  }>;
}

export interface CompanyBasedCVData {
  personalInfo: {
    firstName: string;
    lastName: string;
    title: string;
    country: string;
    city: string;
    phone: string;
    email: string;
    portfolio: string;
    github: string;
    linkedin: string;
    photoUrl?: string;
    includePhoto?: boolean;
    photoSizePt?: number;
  };
  about: string;
  workExperience: Array<{
    id: string;
    position: string;
    company: string;
    city: string;
    country: string;
    startDate: string;
    endDate: string;
    bulletPoints: string[];
  }>;
  education: Array<{
    id: string;
    university: string;
    department: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
  languages: Array<{
    id: string;
    language: string;
    level: string;
  }>;
  companyInfo?: CompanyInfo;
  analysisResult?: CVAnalysisResponse;
  coverLetter?: string;
  linkedinMessage?: string;
  analysisPreferences?: {
    targetPosition?: string;
    manualMustMentionTopics?: string[];
    manualMustNotMentionTopics?: string[];
  };
}
