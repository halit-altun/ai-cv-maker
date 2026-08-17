/** ATS uyumlu CV tipografisi: Calibri, yoksa metrik uyumlu Carlito. */
export const CV_FONT_FAMILY =
  'Calibri, Carlito, "Segoe UI", Arial, sans-serif';

/** İletişim bilgileri ve gövde metni — kullanıcı yalnızca bu aralıktan seçer */
export const CV_BODY_FONT_SIZES = [10, 11] as const;
export type CvBodyFontSize = (typeof CV_BODY_FONT_SIZES)[number];
export const DEFAULT_CV_BODY_FONT_SIZE: CvBodyFontSize = 10;

/** CV başlığındaki ad soyad — sabit (düzenlenemez) */
export const CV_NAME_FONT_SIZES = [22] as const;
export type CvNameFontSize = (typeof CV_NAME_FONT_SIZES)[number];
export const DEFAULT_CV_NAME_FONT_SIZE: CvNameFontSize = 22;

/** CV başlığındaki kişisel ünvan — sabit (düzenlenemez) */
export const CV_PROFILE_TITLE_FONT_SIZES = [14] as const;
export type CvProfileTitleFontSize = (typeof CV_PROFILE_TITLE_FONT_SIZES)[number];
export const DEFAULT_CV_PROFILE_TITLE_FONT_SIZE: CvProfileTitleFontSize = 14;

/** Ana bölüm başlıkları — kullanıcı yalnızca bu aralıktan seçer */
export const CV_HEADING_FONT_SIZES = [14, 15, 16] as const;
export type CvHeadingFontSize = (typeof CV_HEADING_FONT_SIZES)[number];
export const DEFAULT_CV_HEADING_FONT_SIZE: CvHeadingFontSize = 15;

/** İş unvanı (pozisyon) — kullanıcı yalnızca bu aralıktan seçer */
export const CV_JOB_TITLE_FONT_SIZES = [12, 13] as const;
export type CvJobTitleFontSize = (typeof CV_JOB_TITLE_FONT_SIZES)[number];
export const DEFAULT_CV_JOB_TITLE_FONT_SIZE: CvJobTitleFontSize = 12;

export function clampCvBodyFontSize(value: number): CvBodyFontSize {
  const n = Math.round(Number(value) || DEFAULT_CV_BODY_FONT_SIZE);
  if (n <= 10) return 10;
  return 11;
}

export function clampCvNameFontSize(_value: number): CvNameFontSize {
  return DEFAULT_CV_NAME_FONT_SIZE;
}

export function clampCvProfileTitleFontSize(_value: number): CvProfileTitleFontSize {
  return DEFAULT_CV_PROFILE_TITLE_FONT_SIZE;
}

export function clampCvHeadingFontSize(value: number): CvHeadingFontSize {
  const n = Math.round(Number(value) || DEFAULT_CV_HEADING_FONT_SIZE);
  if (n <= 14) return 14;
  if (n >= 16) return 16;
  return 15;
}

export function clampCvJobTitleFontSize(value: number): CvJobTitleFontSize {
  const n = Math.round(Number(value) || DEFAULT_CV_JOB_TITLE_FONT_SIZE);
  if (n >= 13) return 13;
  return 12;
}

/** Yetenek metni (CSS, AWS vb.) — kullanıcı yalnızca bu aralıktan seçer */
export const CV_SKILLS_FONT_SIZES = [10, 11] as const;
export type CvSkillsFontSize = (typeof CV_SKILLS_FONT_SIZES)[number];
export const DEFAULT_CV_SKILLS_FONT_SIZE: CvSkillsFontSize = 11;

export function clampCvSkillsFontSize(value: number): CvSkillsFontSize {
  const n = Math.round(Number(value) || DEFAULT_CV_SKILLS_FONT_SIZE);
  if (n <= 10) return 10;
  return 11;
}

/** Beceriler / diller: düz metin veya iletişim rozeti arka planı */
export type CvBadgeStyle = 'plain' | 'badge';
/** @deprecated use CvBadgeStyle */
export type CvSkillsStyle = CvBadgeStyle;
