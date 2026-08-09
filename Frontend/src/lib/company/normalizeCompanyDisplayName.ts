/**
 * Şirket görünen adı — URL/domain etiketlerini marka adına çevirir.
 * Örn. www.acme.com → Acme, https://acme-corp.io/careers → Acme Corp
 */

export function isDomainLikeCompanyLabel(value: string): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  // host.tld veya host.tld/path
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(v)) return true;
  return false;
}

function extractHostname(raw: string): string {
  let value = String(raw || '').trim();
  if (!value) return '';
  try {
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    const host = new URL(value).hostname.replace(/^www\./i, '');
    return host.toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .toLowerCase();
  }
}

/** host → okunabilir marka (acme-corp.io → Acme Corp) */
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

/**
 * Gerçek şirket adı tercih edilir; URL/domain ise markaya çevrilir.
 */
export function resolveCompanyDisplayName(params: {
  name?: string | null;
  website?: string | null;
  domain?: string | null;
}): string {
  const name = String(params.name || '').trim();
  if (name && !isDomainLikeCompanyLabel(name)) return name;

  const source = name || String(params.website || '').trim() || String(params.domain || '').trim();
  if (!source) return '';
  if (isDomainLikeCompanyLabel(source) || extractHostname(source).includes('.')) {
    return brandifyFromHostOrUrl(source) || name;
  }
  return name || source;
}

/** PDF dosya adı için güvenli segment */
export function sanitizeCompanyForFileName(company: string): string {
  return (
    String(company || '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'Company'
  );
}
