const SIGN_OFF_LINE_RE =
  /^(with\s+)?(best(\s+regards)?|kind\s+regards|warm\s+regards|warmly|regards|all\s+the\s+best|cheers|thanks(\s+in\s+advance)?|thank\s+you|sincerely(\s+yours)?|cordially|saygılarımla|iyi\s+çalışmalar|sevgiler)$/i;

const INLINE_TRAILING_SIGN_OFF_RE =
  /(?:[,.]?\s+)(?:with\s+)?(?:best\s+regards|kind\s+regards|warm\s+regards|all\s+the\s+best|sincerely(?:\s+yours)?|cordially|saygılarımla|iyi\s+çalışmalar|best|regards|thanks|thank\s+you)\s*[.,!]*\s*$/i;

const APPENDED_SIGN_OFF_RE =
  /\n\n(Best regards,|Saygılarımla,|İyi çalışmalar,)/gi;

export type OutreachSignOffChannel = 'email' | 'linkedin';

export function isOutreachEnglish(language?: string | null): boolean {
  const s = String(language || '')
    .trim()
    .toLowerCase();
  return s.startsWith('en');
}

/** Dil + kanal için kapanış satırı (TR e-posta: Saygılarımla, TR LinkedIn: İyi çalışmalar). */
export function getOutreachSignOff(
  language?: string | null,
  channel: OutreachSignOffChannel = 'email'
): string {
  if (isOutreachEnglish(language)) return 'Best regards,';
  return channel === 'linkedin' ? 'İyi çalışmalar,' : 'Saygılarımla,';
}

function isSignOffLine(line: string): boolean {
  const normalized = String(line || '')
    .trim()
    .replace(/[.,!;:]+$/g, '')
    .trim();
  return Boolean(normalized) && SIGN_OFF_LINE_RE.test(normalized);
}

function looksLikeSignatureLine(line: string): boolean {
  const raw = String(line || '').trim();
  if (!raw) return true;
  if (isSignOffLine(raw)) return true;
  if (/@/.test(raw)) return true;
  if (/linkedin\.com|github\.com|netlify\.app/i.test(raw)) return true;
  if (/^https?:\/\//i.test(raw)) return true;
  if (/^(www\.)?[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(raw)) return true;
  if (/^\+?\d[\d\s().-]{6,}$/.test(raw)) return true;
  return raw.split(/\s+/).length <= 6 && raw.length <= 60;
}

/** Model gövde sonundaki Best regards / Best, tekrarını imza eklemeden önce keser. */
export function stripTrailingOutreachSignOff(text: string): string {
  let t = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!t) return '';

  const lines = t.split('\n');
  const windowStart = Math.max(0, lines.length - 14);
  let firstSignOff = -1;
  for (let i = windowStart; i < lines.length; i += 1) {
    if (isSignOffLine(lines[i])) {
      firstSignOff = i;
      break;
    }
  }
  if (firstSignOff >= 0) {
    const after = lines.slice(firstSignOff);
    if (after.every(looksLikeSignatureLine)) {
      t = lines.slice(0, firstSignOff).join('\n').trim();
    }
  }

  t = t.replace(INLINE_TRAILING_SIGN_OFF_RE, '').trim();
  return t;
}

export function buildOutreachSignatureBlock(
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
  } | null,
  language?: string | null,
  channel: OutreachSignOffChannel = 'email'
): string {
  const normalizeUrlForSignature = (value: string | undefined) => {
    const v = (value || '').trim();
    return v
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/$/, '');
  };

  const fullName = `${(personalInfo?.firstName || '').trim()} ${(personalInfo?.lastName || '').trim()}`.trim();
  const title = (personalInfo?.title || '').trim();
  const email = personalInfo?.email ? String(personalInfo.email).trim() : '';
  const phone = personalInfo?.phone ? String(personalInfo.phone).trim() : '';
  const linkedin = normalizeUrlForSignature(personalInfo?.linkedin);
  const portfolio = normalizeUrlForSignature(personalInfo?.portfolio);
  const signOff = getOutreachSignOff(language, channel);

  return `${signOff}\n${fullName}\n${title}\n${email}\n${phone}\n${linkedin}\n${portfolio}`;
}

/**
 * Cover letter / LinkedIn için uygulamanın sonuna eklediği imza bloğunu metinden ayırır.
 */
export function stripAppendedOutreachSignature(fullText: string): string {
  const t = String(fullText || '');
  let last = -1;
  APPENDED_SIGN_OFF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = APPENDED_SIGN_OFF_RE.exec(t)) !== null) {
    last = m.index;
  }
  if (last === -1) return t.trim();
  return t.slice(0, last).trim();
}

/** Gövdedeki yanlış dildeki kapanış satırını hedef dile çeker (dil karmaşası güvenlik ağı). */
export function normalizeOutreachSignOffLanguage(
  text: string,
  language?: string | null,
  channel: OutreachSignOffChannel = 'email'
): string {
  const target = getOutreachSignOff(language, channel);
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  return lines
    .map((line) => (isSignOffLine(line) ? target : line))
    .join('\n');
}
