export const OPTIMIZER_STEPS = [
  'CV Yükle',
  'İş Analizi',
  'Optimizasyon',
  'Önizleme',
] as const;

export const OPTIMIZER_SUB_NAV = [
  { id: 'upload', label: 'Upload' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'insights', label: 'Insights' },
  { id: 'export', label: 'Export' },
] as const;

export const ANALYSIS_PREFS_STORAGE_KEY =
  'company_based_cv_editor_analysis_preferences_v1';

export const defaultAISettings = {
  about: true,
  workExperience: false,
  skills: false,
} as const;
