import { stripCvMarkdownEmphasis } from '@/lib/cv-maker/stripCvMarkdown';

export type CvSectionLengthMode = 'fit_range' | 'keywords_only';

export const DEFAULT_CV_SECTION_LENGTH_MODE: CvSectionLengthMode = 'fit_range';

export const ABOUT_CHAR_MIN = 300;
export const ABOUT_CHAR_MAX = 600;
export const BULLET_CHAR_MIN = 130;
export const BULLET_CHAR_MAX = 150;
export const ABOUT_SHORT_AIM_EXTRA = 50;
export const ABOUT_LONG_AIM_SHRINK = 40;
export const BULLET_SHORT_AIM_EXTRA = 10;
export const BULLET_LONG_AIM_SHRINK = 10;

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

function collapseWs(text: string): string {
  return stripCvMarkdownEmphasis(String(text || ''))
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function nearBoundRange(
  originalLen: number,
  hardMin: number,
  hardMax: number,
  shortExtra: number,
  longShrink: number
): { lo: number; hi: number } {
  if (originalLen < hardMin) {
    return { lo: hardMin, hi: Math.min(hardMax, hardMin + shortExtra) };
  }
  if (originalLen > hardMax) {
    return { lo: Math.max(hardMin, hardMax - longShrink), hi: hardMax };
  }
  return { lo: hardMin, hi: hardMax };
}

function compressToMax(text: string, lo: number, hi: number): string {
  const s = collapseWs(text);
  if (s.length <= hi) return s;
  const slice = s.slice(0, hi);
  const minKeep = Math.min(Math.max(0, lo), hi);
  for (let i = slice.length - 1; i >= minKeep; i -= 1) {
    const ch = slice[i];
    if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
      let end = i + 1;
      while (end < slice.length && /["'”’)\]]/.test(slice[end])) end += 1;
      const cut = slice.slice(0, end).trim();
      if (cut.length >= minKeep) return cut;
    }
  }
  const sp = slice.lastIndexOf(' ');
  if (sp >= minKeep) return slice.slice(0, sp).trim();
  return slice.trim();
}

export function fitTextToNearBound(
  candidate: string,
  original: string,
  hardMin: number,
  hardMax: number,
  shortExtra: number,
  longShrink: number
): string {
  const orig = collapseWs(original);
  const cand = collapseWs(candidate) || orig;
  if (!cand) return '';

  const origLen = orig.length;
  const { lo, hi } = nearBoundRange(origLen, hardMin, hardMax, shortExtra, longShrink);
  const origInHard = origLen >= hardMin && origLen <= hardMax;

  let text = cand;
  if (text.length > hi) text = compressToMax(text, lo, hi);

  if (text.length < lo) {
    if (origInHard) return orig;
    if (origLen > hi) {
      const fromOrig = compressToMax(orig, lo, hi);
      if (fromOrig.length >= lo) return fromOrig;
    }
    return text;
  }

  if (text.length > hardMax) {
    text = compressToMax(text, hardMin, hardMax);
  }
  return text;
}

export function fitAboutText(candidate: string, original: string): string {
  return fitTextToNearBound(
    candidate,
    original,
    ABOUT_CHAR_MIN,
    ABOUT_CHAR_MAX,
    ABOUT_SHORT_AIM_EXTRA,
    ABOUT_LONG_AIM_SHRINK
  );
}

export function fitBulletText(candidate: string, original: string): string {
  return fitTextToNearBound(
    candidate,
    original,
    BULLET_CHAR_MIN,
    BULLET_CHAR_MAX,
    BULLET_SHORT_AIM_EXTRA,
    BULLET_LONG_AIM_SHRINK
  );
}

type WorkExpLike = { bulletPoints?: string[] };

export function fitExperienceBulletLines(
  updatedText: string,
  originalWorkExperience: WorkExpLike[] = []
): string {
  const origBullets = originalWorkExperience.flatMap((exp) =>
    Array.isArray(exp?.bulletPoints)
      ? exp.bulletPoints.map((b) => String(b || '').trim()).filter(Boolean)
      : []
  );
  let bulletIdx = 0;
  return String(updatedText || '')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!/^[•\-*]/.test(trimmed)) return line;
      const prefixMatch = line.match(/^\s*[•\-*]\s*/);
      const prefix = prefixMatch ? prefixMatch[0].replace(/\s+$/, ' ') : '• ';
      const body = trimmed.replace(/^[•\-*]\s*/, '');
      const original = origBullets[bulletIdx] || body;
      bulletIdx += 1;
      return `${prefix}${fitBulletText(body, original)}`;
    })
    .join('\n');
}

export function fitWorkExperienceBullets<
  T extends { bulletPoints?: string[] },
>(list: T[], originalList: WorkExpLike[] = []): T[] {
  return list.map((exp, i) => {
    const origBullets = Array.isArray(originalList[i]?.bulletPoints)
      ? originalList[i].bulletPoints || []
      : [];
    return {
      ...exp,
      bulletPoints: (Array.isArray(exp.bulletPoints) ? exp.bulletPoints : []).map(
        (b, j) => fitBulletText(b, origBullets[j] || b)
      ),
    };
  });
}

export function enforceFitRangeOnAnalysis<
  T extends {
    originalAbout?: string;
    updatedAbout?: string;
    updatedExperience?: string;
  },
>(
  analysis: T,
  parsedCV: { about?: string; workExperience?: WorkExpLike[] } = {},
  options: {
    mode?: unknown;
    aboutEnabled?: boolean;
    experienceEnabled?: boolean;
  } = {}
): T {
  if (!analysis || !isFitRangeLengthMode(options.mode)) return analysis;
  if (options.aboutEnabled) {
    const original = String(analysis.originalAbout || parsedCV.about || '').trim();
    analysis.updatedAbout = fitAboutText(analysis.updatedAbout || original, original);
  }
  if (options.experienceEnabled) {
    analysis.updatedExperience = fitExperienceBulletLines(
      String(analysis.updatedExperience || ''),
      parsedCV.workExperience || []
    );
  }
  return analysis;
}
