// Company-based CV Editor Types

export interface CompanyLink {
  url: string;
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
}

export interface CVAnalysisRequest {
  cvText: string;
  companyUrl: string;
  companyInfo?: CompanyInfo;
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
}

export interface GeminiAPIRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
}

export interface GeminiAPIResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
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
}
