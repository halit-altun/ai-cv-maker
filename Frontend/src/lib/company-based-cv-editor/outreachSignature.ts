const SIGN_OFF_LINE_RE =
  /^(with\s+)?(best(\s+regards)?|kind\s+regards|warm\s+regards|warmly|regards|all\s+the\s+best|cheers|thanks(\s+in\s+advance)?|thank\s+you|sincerely(\s+yours)?|cordially|saygılarımla|iyi\s+çalışmalar|sevgiler)$/i;

const INLINE_TRAILING_SIGN_OFF_RE =
  /(?:[,.]?\s+)(?:with\s+)?(?:best\s+regards|kind\s+regards|warm\s+regards|all\s+the\s+best|sincerely(?:\s+yours)?|cordially|saygılarımla|best|regards|thanks|thank\s+you)\s*[.,!]*\s*$/i;

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
