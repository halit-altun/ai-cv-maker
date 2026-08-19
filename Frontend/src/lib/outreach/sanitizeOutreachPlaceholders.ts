/**
 * Backend `outreach-placeholder.utils.js` ile aynı kural: AI şablon artığı yok.
 */

const TEMPLATE_HINT_ASCII =
  /\b(name|company|recipient|hiring|manager|user|placeholder|insert|position|title)\b/i;
const TEMPLATE_HINT_TR =
  /kullan[ıi]c[ıi]|ilgili|şirket|sirket|soyad[ıi]|ünvan|unvan|al[ıi]c[ıi]|ki[şs]i|ad[ıi]/i;

const BARE_TEMPLATE_PHRASES = [
  /\[?\s*ilgili\s+ki[şs]i(?:\s+ad[ıi](?:\s+soyad[ıi])?)?\s*\]?/gi,
  /\bad[ıi]\s+soyad[ıi]\b/gi,
  /\bhiring\s+manager(?:'?s)?\s+name\b/gi,
  /\brecipient(?:'?s)?\s+name\b/gi,
  /\byour\s+name\b/gi,
  /\binsert\s+name\b/gi,
];

export type OutreachSanitizeOpts = {
  language?: 'turkish' | 'english';
  companyName?: string;
  candidateName?: string;
  recipientName?: string;
  kind?: 'body' | 'subject';
};

function detectOutreachLanguage(text: string): 'turkish' | 'english' {
  const t = String(text || '');
  if (/Saygılarımla/i.test(t) || /^Sayın\b/m.test(t) || /rica ederim/i.test(t)) {
    return 'turkish';
  }
  if (/Best regards/i.test(t) || /^Dear\b/m.test(t) || /^Hi,/m.test(t)) {
    return 'english';
  }
  return /[çğıöşüÇĞİÖŞÜ]/.test(t) ? 'turkish' : 'english';
}

function isTemplatePlaceholderInner(inner: string): boolean {
  const t = String(inner || '').trim();
  if (!t) return true;
  if (t.length > 70) return false;
  if (/^https?:\/\//i.test(t) || t.includes('@')) return false;
  if (TEMPLATE_HINT_ASCII.test(t) || TEMPLATE_HINT_TR.test(t)) return true;
  if (/^[A-ZÇĞİÖŞÜ_ ]{3,}$/.test(t) && /\s/.test(t)) return true;
  return false;
}

function genericGreeting(language: 'turkish' | 'english'): string {
  return language === 'english' ? 'Dear Hiring Team,' : 'Sayın ilgili,';
}

function collapseSpaces(value: string): string {
  return String(value || '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collapseBrokenGreetings(
  text: string,
  language: 'turkish' | 'english'
): string {
  const generic = genericGreeting(language);
  let out = String(text || '')
    .replace(/^(Sayın)\s*,\s*/gim, `${generic}\n`)
    .replace(/^(Dear)\s*,\s*/gim, `${genericGreeting('english')}\n`);
  const lines = out.split('\n');
  const result: string[] = [];
  let genericUsed = false;
  for (const line of lines) {
    const t = String(line || '').trim();
    if (/^(sayın ilgili|dear hiring team),?$/i.test(t)) {
      if (genericUsed) continue;
      genericUsed = true;
      result.push(/dear/i.test(t) ? 'Dear Hiring Team,' : 'Sayın ilgili,');
      continue;
    }
    result.push(line);
  }
  return result.join('\n');
}

function replaceKnownPlaceholders(
  text: string,
  opts: OutreachSanitizeOpts
): string {
  let out = String(text || '');
  const company = String(opts.companyName || '').trim();
  const candidate = String(opts.candidateName || '').trim();
  const recipient = String(opts.recipientName || '').trim();
  const nameFill = opts.kind === 'subject' ? recipient || candidate : recipient;

  out = out.replace(/\{\{?\s*(company|şirket|sirket)\s*\}?\}/gi, company);
  out = out.replace(/\{\{?\s*(name|ad|full.?name)\s*\}?\}/gi, nameFill);

  out = out.replace(/\[([^\]]{0,80})\]/g, (full, inner: string) => {
    if (!isTemplatePlaceholderInner(inner)) return full;
    const key = String(inner).trim().toLowerCase();
    if (/company|şirket|sirket/.test(key)) return company;
    if (/^(name|ad|full.?name|kullan[ıi]c[ıi])$/.test(key)) return nameFill;
    if (/ilgili|recipient|hiring|ki[şs]i|ad[ıi]/.test(key)) return recipient;
    return '';
  });

  out = out.replace(/\{([^{}]{0,80})\}/g, (full, inner: string) =>
    isTemplatePlaceholderInner(inner) ? '' : full
  );
  out = out.replace(/<([^>]{0,80})>/g, (full, inner: string) =>
    isTemplatePlaceholderInner(inner) ? '' : full
  );

  for (const re of BARE_TEMPLATE_PHRASES) {
    out = out.replace(re, recipient);
  }

  return out;
}

function fixGreetingLine(
  text: string,
  language: 'turkish' | 'english',
  recipientName?: string
): string {
  const generic = genericGreeting(language);
  const recipient = String(recipientName || '').trim();
  const lines = String(text || '').split('\n');
  if (!lines.length) return generic;

  let first = String(lines[0] || '').trim();
  const isGreeting = /^(sayın|dear|hello|hi|merhaba)\b/i.test(first);
  if (!isGreeting) {
    if (!first) {
      lines[0] = generic;
      return lines.join('\n');
    }
    return text;
  }

  const greetingWord = (first.match(/^(sayın|dear|hello|hi|merhaba)\b/i) || [])[0] || '';
  first = first.replace(/\s+,/g, ',').replace(/,{2,}/g, ',');
  const after = first
    .replace(/^(sayın|dear|hello|hi|merhaba)\s*/i, '')
    .replace(/[,:]+$/g, '')
    .trim();

  if (/^(hi|merhaba)$/i.test(greetingWord) && !after) {
    lines[0] = /merhaba/i.test(greetingWord) ? 'Merhaba,' : 'Hi,';
    return lines.join('\n');
  }

  const broken =
    !after ||
    /^[,\-–—:]+$/.test(after) ||
    isTemplatePlaceholderInner(after) ||
    /ilgili\s+ki[şs]i/i.test(after) ||
    /ad[ıi]\s+soyad[ıi]/i.test(after) ||
    (/hiring\s+manager/i.test(after) && /name/i.test(after));

  if (broken) {
    lines[0] = recipient
      ? language === 'english'
        ? `Dear ${recipient},`
        : `Sayın ${recipient},`
      : generic;
  } else {
    lines[0] = first.endsWith(',') || first.endsWith(':') ? first : `${first},`;
  }

  return lines.join('\n');
}

export function sanitizeOutreachPlaceholders(
  text: string,
  opts: OutreachSanitizeOpts = {}
): string {
  const kind = opts.kind === 'subject' ? 'subject' : 'body';
  const language =
    opts.language === 'english' || opts.language === 'turkish'
      ? opts.language
      : detectOutreachLanguage(text);

  let out = replaceKnownPlaceholders(text, { ...opts, kind });
  out = collapseSpaces(out);

  if (kind === 'subject') {
    out = out.replace(/^[,:\-–—\s]+/, '').replace(/[,:\-–—\s]+$/, '');
    return collapseSpaces(out);
  }

  out = collapseBrokenGreetings(out, language);
  out = fixGreetingLine(out, language, opts.recipientName);
  out = collapseSpaces(out);
  return dedupeRepeatedOutreachUrls(out);
}

const HOST_ONLY_URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s]*)?$/i;
const EXPLICIT_OUTREACH_URL_RE =
  /https?:\/\/[^\s|]+|(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com)[^\s|]*/gi;

export function normalizeOutreachUrlKey(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[),.;:]+$/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

export function textAlreadyHasUrl(text: string, url: string): boolean {
  const key = normalizeOutreachUrlKey(url);
  if (!key) return true;
  const hay = String(text || '')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/\/+(?=[\s|]|$)/g, '');
  return hay.includes(key);
}

function urlsInPart(part: string): string[] {
  const t = String(part || '').trim();
  if (!t || t.includes('@')) {
    if (!/^https?:\/\//i.test(t)) return [];
  }
  if (HOST_ONLY_URL_RE.test(t) && !t.includes('@')) {
    return [t];
  }
  return (t.match(EXPLICIT_OUTREACH_URL_RE) || []).map((m) =>
    m.replace(/[),.;:]+$/g, '')
  );
}

/** Aynı LinkedIn/portfolio/GitHub adresini ikinci kez bırakmaz; ilk yazımı korur. */
export function dedupeRepeatedOutreachUrls(text: string): string {
  const seen = new Set<string>();
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    const parts = line.split(/\s*\|\s*/);
    const kept: string[] = [];
    for (const part of parts) {
      const urls = urlsInPart(part);
      if (!urls.length) {
        kept.push(part);
        continue;
      }
      let remaining = part;
      let droppedAll = true;
      for (const url of urls) {
        const key = normalizeOutreachUrlKey(url);
        if (!key) continue;
        if (seen.has(key)) {
          remaining = remaining
            .replace(url, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        } else {
          seen.add(key);
          droppedAll = false;
        }
      }
      const leftover = remaining.trim();
      if (leftover && !droppedAll) kept.push(leftover);
      else if (leftover && urlsInPart(leftover).length === 0) kept.push(leftover);
    }
    if (kept.length) out.push(kept.join(' | '));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
