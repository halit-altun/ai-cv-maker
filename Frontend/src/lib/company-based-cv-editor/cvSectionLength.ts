export type CvSectionLengthMode = 'fit_range' | 'keywords_only';

export const DEFAULT_CV_SECTION_LENGTH_MODE: CvSectionLengthMode = 'fit_range';

export const ABOUT_CHAR_MIN = 300;
export const ABOUT_CHAR_MAX = 600;
export const BULLET_CHAR_MIN = 130;
export const BULLET_CHAR_MAX = 150;

export function parseCvSectionLengthMode(
  value: unknown,
  fallback: CvSectionLengthMode = DEFAULT_CV_SECTION_LENGTH_MODE
): CvSectionLengthMode {
  if (value === 'keywords_only' || value === 'fit_range') return value;
  return fallback;
}

export function isFitRangeLengthMode(value: unknown): boolean {
  return parseCvSectionLengthMode(value) === 'fit_range';
}
