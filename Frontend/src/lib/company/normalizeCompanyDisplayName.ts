/**
 * Şirket görünen adı — URL/domain etiketlerini marka adına çevirir.
 * Domain ile uyuşmayan sticky isimleri (örn. Leobit @ oakslab.com) reddeder.
 */

export function isDomainLikeCompanyLabel(value: string): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(v)) return true;
  return false;
}

export function extractHostname(raw: string): string {
  let value = String(raw || '').trim();
  if (!value) return '';
  try {
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .toLowerCase();
  }
}

function compactAlnum(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function brandTokens(value: string): string[] {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** "Oaks Lab" ↔ oakslab.com uyumlu; "Leobit" ↔ oakslab.com uyumsuz */
export function companyNameAlignedWithDomain(
  name: string,
  domainOrUrl: string
): boolean {
  const nameCompact = compactAlnum(name);
  const host = extractHostname(domainOrUrl);
  if (!nameCompact || !host) return true;

  const label = (host.split('.')[0] || '').replace(/[^a-z0-9]+/g, '');
  if (!label) return true;

  if (nameCompact === label) return true;
  if (nameCompact.includes(label) || label.includes(nameCompact)) return true;

  const tokens = brandTokens(name);
  const meaningful = tokens.filter((t) => t.length >= 3);
  if (meaningful.length && meaningful.every((t) => label.includes(t))) {
    return true;
  }
  if (meaningful.some((t) => label.includes(t) && t.length >= 4)) {
    return true;
  }
  return false;
}

export function brandifyFromHostOrUrl(raw: string): string {
  const host = extractHostname(raw);
  if (!host) return '';
  const firstLabel = host.split('.')[0] || host;
  return firstLabel
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Path’li URL’yi koru; birden fazla adaydan path’i olanı tercih et */
export function pickBestCompanyUrl(...candidates: Array<string | null | undefined>): string {
  const cleaned = candidates
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .map((raw) => {
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.includes('@')) return '';
      return `https://${raw.replace(/^\/+/, '')}`;
    })
    .filter(Boolean);

  const withPath = cleaned.find((u) => {
    try {
      const path = new URL(u).pathname || '';
      return Boolean(path && path !== '/');
    } catch {
      return /\/.+/.test(u.replace(/^https?:\/\//i, ''));
    }
  });
  return withPath || cleaned[0] || '';
}

export function resolveCompanyDisplayName(params: {
  name?: string | null;
  website?: string | null;
  domain?: string | null;
}): string {
  const name = String(params.name || '').trim();
  const domainSrc =
    String(params.domain || '').trim() || String(params.website || '').trim();

  if (name && !isDomainLikeCompanyLabel(name)) {
    if (!domainSrc || companyNameAlignedWithDomain(name, domainSrc)) {
      return name;
    }
    return brandifyFromHostOrUrl(domainSrc) || name;
  }

  const source =
    name || String(params.website || '').trim() || String(params.domain || '').trim();
  if (!source) return '';
  if (isDomainLikeCompanyLabel(source) || extractHostname(source).includes('.')) {
    return brandifyFromHostOrUrl(source) || name;
  }
  return name || source;
}

export function sanitizeCompanyForFileName(company: string): string {
  return (
    String(company || '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'Company'
  );
}
