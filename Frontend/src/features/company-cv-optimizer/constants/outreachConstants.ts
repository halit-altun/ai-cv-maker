/** Şirket sayfa tipi — tek seçim */
export type CompanyPageType =
  | 'homepage'
  | 'careers'
  | 'contact'
  | 'about'
  | 'blog'
  | 'products'
  | 'team'
  | 'other';

export const COMPANY_PAGE_TYPE_OPTIONS: Array<{
  value: CompanyPageType;
  label: string;
}> = [
  { value: 'homepage', label: 'Ana sayfa' },
  { value: 'careers', label: 'Kariyer / İş ilanları' },
  { value: 'contact', label: 'İletişim / Kontakt' },
  { value: 'about', label: 'Hakkında' },
  { value: 'blog', label: 'Blog / Haberler' },
  { value: 'products', label: 'Ürün / Hizmetler' },
  { value: 'team', label: 'Ekip / Yönetim' },
  { value: 'other', label: 'Diğer' },
];

export type EmailPrefixCategoryId =
  | 'hr-recruitment'
  | 'hr-culture'
  | 'position-career'
  | 'team-founders'
  | 'minimal-three'
  | 'main-domain-only'
  | 'turkey-hiring'
  | 'custom';

/** Diğer kategorilerle karışmayan tek-seçim modları */
export const EXCLUSIVE_EMAIL_CATEGORY_IDS: EmailPrefixCategoryId[] = [
  'minimal-three',
  'main-domain-only',
  'turkey-hiring',
];

export function isExclusiveEmailCategory(id: EmailPrefixCategoryId): boolean {
  return EXCLUSIVE_EMAIL_CATEGORY_IDS.includes(id);
}

export interface EmailPrefixCategory {
  id: EmailPrefixCategoryId;
  label: string;
  description: string;
  prefixes: string[];
}

/** Hedef firmaya mail için önerilen local-part kategorileri */
export const EMAIL_PREFIX_CATEGORIES: EmailPrefixCategory[] = [
  {
    id: 'hr-recruitment',
    label: '1. Genel İK ve İşe Alım',
    description: 'En Yüksek İhtimal',
    prefixes: [
      'hr',
      'careers',
      'jobs',
      'recruitment',
      'recruiter',
      'talent',
      'people',
      'work',
      'hiring',
      'apply',
      'join',
    ],
  },
  {
    id: 'hr-culture',
    label: '2. İnsan Kaynakları ve Kültür (HR & Culture)',
    description: 'HR & Culture',
    prefixes: [
      'humanresources',
      'peopleops',
      'peopleandculture',
      'culture',
      'talentacquisition',
      'talentteam',
      'peopleteam',
      'careers-team',
    ],
  },
  {
    id: 'position-career',
    label: '3. Pozisyon ve Kariyer Odaklı',
    description: 'Başvuru / fırsat mailleri',
    prefixes: [
      'job',
      'jobapplications',
      'applications',
      'vacancies',
      'opportunity',
      'opportunities',
      'employment',
      'workwithus',
      'jointheteam',
      'futuretalent',
    ],
  },
  {
    id: 'team-founders',
    label: '4. Ekip ve Kurucu / Yönetim Odaklı',
    description: 'Özellikle Startup ve Orta Ölçekli',
    prefixes: [
      'tech-hiring',
      'tech-careers',
      'engineering-hiring',
      'founders',
      'ceo',
      'cto',
      'management',
      'team',
    ],
  },
  {
    id: 'minimal-three',
    label: '5. Sadece girilen + careers + hr + recruitment',
    description:
      'Girilen local (yoksa info) + careers + hr + recruitment. Girilen zaten careers/hr/recruitment ise o prefix atlanır (çift yok).',
    prefixes: ['info', 'careers', 'hr', 'recruitment'],
  },
  {
    id: 'main-domain-only',
    label: '6. Sadece girilen ana domain',
    description:
      'Yalnızca girilen ana adrese gönderir (ör. halitkhalil@firma.com). Sadece domain yazıldıysa info@domain kullanılır.',
    prefixes: ['info'],
  },
  {
    id: 'turkey-hiring',
    label: '7. Türkiye işe alım',
    description: 'Yalnızca ik@ ve kariyer@ adreslerine gönderir.',
    prefixes: ['ik', 'kariyer'],
  },
];

export function resolvePageTypeLabel(
  pageType: CompanyPageType | undefined,
  pageTypeOther?: string
): string {
  if (!pageType) return 'Belirtilmedi';
  if (pageType === 'other') {
    const custom = String(pageTypeOther || '').trim();
    return custom || 'Diğer';
  }
  return COMPANY_PAGE_TYPE_OPTIONS.find((o) => o.value === pageType)?.label || pageType;
}

/** Örnek domain girdileri — UI helper text */
export const EMAIL_DOMAIN_INPUT_EXAMPLES = [
  'info@sirketadi.com',
  'xyz123@acme.io',
  'hr@ornekfirma.com',
  'sirketadi.com',
] as const;

/**
 * Kullanıcı info@sirketadi.com veya sirketadi.com yazsa da
 * sadece domain kısmını (sirketadi.com) döner.
 */
export function normalizeEmailDomainInput(raw: string): string {
  let value = String(raw || '').trim().toLowerCase();
  if (!value) return '';

  if (value.includes('@')) {
    value = value.split('@').pop() || '';
  }

  value = value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  value = value.split('/')[0].split('?')[0].replace(/^@/, '');
  return value;
}

export function extractDomainFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    return url.hostname.replace(/^www\./i, '');
  } catch {
    return normalizeEmailDomainInput(rawUrl);
  }
}

/**
 * Kullanıcı info@sirketadi.com yazdıysa local-part = info.
 * Sadece sirketadi.com yazdıysa null.
 */
export function extractLocalPartFromInput(raw: string): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value || !value.includes('@')) return null;
  const local = value.split('@')[0]?.replace(/^@/, '').trim();
  return local || null;
}

/**
 * Girilen ana domain adresi: email varsa o local, yoksa info@domain.
 * Örn. hr@etiya.com → hr@etiya.com | etiya.com → info@etiya.com
 */
export function resolveEnteredMainDomainEmail(
  rawDomainInput?: string,
  domain?: string
): string | null {
  const d = normalizeEmailDomainInput(domain || rawDomainInput || '');
  if (!d) return null;
  const local = extractLocalPartFromInput(rawDomainInput || '') || 'info';
  return `${local}@${d}`;
}

function withEnteredMainDomain(
  emails: string[],
  rawDomainInput: string,
  domain: string,
  includeEnteredMainDomain?: boolean
): string[] {
  if (!includeEnteredMainDomain) return emails;
  const main = resolveEnteredMainDomainEmail(rawDomainInput, domain);
  if (!main) return emails;
  return [main, ...emails.filter((e) => e !== main)];
}

/**
 * Girilen ana local (ör. careers@) seçenek prefix’lerinde varsa o prefix atlanır;
 * listede yoksa (ör. info@ kategori 1’de yok) ana adres + tüm prefix’ler gider.
 * includePrimaryEmail=false ise yalnızca careers + hr + recruitment
 */
export function buildMinimalThreeRecipients(
  rawDomainInput: string,
  includePrimaryEmail = true
): string[] {
  const domain = normalizeEmailDomainInput(rawDomainInput);
  if (!domain) return [];

  const primaryLocal = extractLocalPartFromInput(rawDomainInput);
  const deptPrefixes = ['careers', 'hr', 'recruitment'] as const;

  const dept = deptPrefixes
    .filter((p) => !primaryLocal || p !== primaryLocal)
    .map((p) => `${p}@${domain}`);

  if (!includePrimaryEmail) return dept;

  // Domain-only → varsayılan info@; girilen local varsa onu kullan
  const local = primaryLocal || 'info';
  const primary = `${local}@${domain}`;
  return [primary, ...dept.filter((e) => e !== primary)];
}

export function buildRecipientEmails(params: {
  domain: string;
  selectedCategoryIds: EmailPrefixCategoryId[];
  customLocalParts: string[];
  /** Domain alanının ham değeri (info@x.com vs x.com ayrımı için) */
  rawDomainInput?: string;
  /** Ana adresi (firma sayfasından girilen) alıcı listesine ekle — varsayılan true */
  includePrimaryEmail?: boolean;
  /** Girilen ana domain adresini (email yoksa info@) her kategoriye ekle */
  includeEnteredMainDomain?: boolean;
}): string[] {
  const domain = normalizeEmailDomainInput(params.domain || params.rawDomainInput || '');
  if (!domain) return [];
  const includePrimary = params.includePrimaryEmail !== false;
  const includeEnteredMain = Boolean(params.includeEnteredMainDomain);
  const rawInput = params.rawDomainInput || params.domain || '';
  const primaryLocal = extractLocalPartFromInput(params.rawDomainInput || '');

  // Minimal 3 seçiliyse yalnızca bu 3 adres (diğer kategoriler yok sayılır)
  if (params.selectedCategoryIds.includes('minimal-three')) {
    return withEnteredMainDomain(
      buildMinimalThreeRecipients(rawInput, includePrimary),
      rawInput,
      domain,
      includeEnteredMain
    );
  }

  // Main domain only seçiliyse sadece girilen ana adres
  if (params.selectedCategoryIds.includes('main-domain-only')) {
    const local = primaryLocal || 'info';
    return withEnteredMainDomain(
      [`${local}@${domain}`],
      rawInput,
      domain,
      includeEnteredMain
    );
  }

  // Türkiye işe alım — yalnızca ik@ ve kariyer@ (+ opsiyonel ana domain)
  if (params.selectedCategoryIds.includes('turkey-hiring')) {
    return withEnteredMainDomain(
      ['ik', 'kariyer'].map((prefix) => `${prefix}@${domain}`),
      rawInput,
      domain,
      includeEnteredMain
    );
  }

  const set = new Set<string>();

  // Kullanıcının firma sayfasından girdiği ana adres — checkbox açıksa eklenir
  if (includePrimary && primaryLocal) {
    set.add(`${primaryLocal}@${domain}`);
  }

  for (const categoryId of params.selectedCategoryIds) {
    if (
      categoryId === 'custom' ||
      categoryId === 'minimal-three' ||
      categoryId === 'main-domain-only' ||
      categoryId === 'turkey-hiring'
    ) {
      continue;
    }
    const category = EMAIL_PREFIX_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) continue;
    for (const prefix of category.prefixes) {
      // Girilen local zaten seçeneklerdeyse o prefix’i atla (çift gönderim yok)
      if (includePrimary && primaryLocal && prefix === primaryLocal) continue;
      set.add(`${prefix}@${domain}`);
    }
  }

  for (const raw of params.customLocalParts) {
    const value = String(raw || '').trim().toLowerCase();
    if (!value) continue;
    if (value.includes('@')) {
      const customDomain = normalizeEmailDomainInput(value);
      const local = value.split('@')[0];
      if (local && customDomain) {
        // Ana adresle aynıysa atla — zaten primary olarak eklenmiş olabilir
        if (
          includePrimary &&
          primaryLocal &&
          local === primaryLocal &&
          customDomain === domain
        ) {
          continue;
        }
        set.add(`${local}@${customDomain}`);
      }
    } else {
      const local = value.replace(/^@/, '');
      if (includePrimary && primaryLocal && local === primaryLocal) continue;
      set.add(`${local}@${domain}`);
    }
  }

  const emails = Array.from(set);
  const ordered =
    includePrimary && primaryLocal
      ? [
          `${primaryLocal}@${domain}`,
          ...emails.filter((e) => e !== `${primaryLocal}@${domain}`),
        ]
      : emails;
  return withEnteredMainDomain(ordered, rawInput, domain, includeEnteredMain);
}

/** Doğrulamasız gönderilecek adres: yalnızca “ana adresi doğrulamadan geçir” kutusu. */
export function resolveTrustedSendEmail(params: {
  rawDomainInput?: string;
  domain?: string;
  includeEnteredMainDomain?: boolean;
  includePrimaryEmail?: boolean;
  skipPrimaryEmailVerification?: boolean;
}): string | undefined {
  const raw = String(params.rawDomainInput || '').trim();
  const domain = params.domain || raw;
  if (
    params.includePrimaryEmail !== false &&
    params.skipPrimaryEmailVerification &&
    raw.includes('@')
  ) {
    return resolveEnteredMainDomainEmail(raw, domain) || undefined;
  }
  return undefined;
}

/**
 * Cold mail dili:
 * - auto → fetch edilen sayfa dili (turkish/english), other/yoksa fallback
 * - turkish | english → kullanıcı seçimi
 */
export function resolveOutreachEmailLanguage(params: {
  mode: 'auto' | 'turkish' | 'english';
  pageLanguage?: 'turkish' | 'english' | 'other' | null;
  jobDescriptionText?: string;
  adaptationSource?: 'company' | 'text';
  fallback?: 'turkish' | 'english';
}): 'turkish' | 'english' {
  if (params.mode === 'turkish' || params.mode === 'english') {
    return params.mode;
  }

  if (params.pageLanguage === 'turkish' || params.pageLanguage === 'english') {
    return params.pageLanguage;
  }

  // İlan metni seçiliyse basit dil tahmini
  if (params.adaptationSource === 'text' && params.jobDescriptionText) {
    const text = params.jobDescriptionText;
    const trHits = (text.match(/[çğıöşüÇĞİÖŞÜ]/g) || []).length;
    const enHints = /\b(the|and|with|for|experience|responsibilities|requirements)\b/i.test(text);
    if (trHits >= 3) return 'turkish';
    if (enHints) return 'english';
  }

  return params.fallback || 'turkish';
}
