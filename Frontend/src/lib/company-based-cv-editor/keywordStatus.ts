import type { KeywordIntegrationReportItem } from './types';

export type KeywordStatusItem = {
  keyword: string;
  integratedIn: KeywordIntegrationReportItem['integratedIn'];
  note: string;
  used: boolean;
  alreadyPresent?: boolean;
};

const INTEGRATED_IN_VALUES = new Set([
  'about',
  'experience',
  'both',
  'none',
  'already_present',
]);

function normalizeIntegratedIn(value: unknown): KeywordIntegrationReportItem['integratedIn'] {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'workexperience' || raw === 'work_experience' || raw === 'exp') {
    return 'experience';
  }
  if (raw === 'already_present' || raw === 'already-present' || raw === 'already in cv') {
    return 'already_present';
  }
  if (INTEGRATED_IN_VALUES.has(raw)) {
    return raw as KeywordIntegrationReportItem['integratedIn'];
  }
  return 'none';
}

function normalizeKeywordKey(keyword: string): string {
  return keyword.trim().toLowerCase();
}

/**
 * Şirket/ilan KW'leri + AI raporu birleştirilir.
 * Raporda olmayan KW'ler "kullanılamadı" olarak işaretlenir.
 */
export function buildKeywordStatusList(params: {
  companyKeywords?: string[] | null;
  detectedKeywords?: string[] | null;
  candidateKeywords?: string[] | null;
  report?: KeywordIntegrationReportItem[] | null;
}): KeywordStatusItem[] {
  const reportItems = (params.report ?? [])
    .map((item) => ({
      keyword: String(item?.keyword ?? '').trim(),
      integratedIn: normalizeIntegratedIn(item?.integratedIn),
      note: String(item?.note ?? '').trim(),
    }))
    .filter((item) => item.keyword.length > 0);

  const reportByKey = new Map<string, (typeof reportItems)[number]>();
  for (const item of reportItems) {
    const key = normalizeKeywordKey(item.keyword);
    if (!reportByKey.has(key)) {
      reportByKey.set(key, item);
    }
  }

  const orderedKeywords: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (list?: string[] | null) => {
    for (const raw of list ?? []) {
      const keyword = String(raw ?? '').trim();
      if (!keyword) continue;
      const key = normalizeKeywordKey(keyword);
      if (seen.has(key)) continue;
      seen.add(key);
      orderedKeywords.push(keyword);
    }
  };

  pushUnique(params.candidateKeywords);
  pushUnique(params.companyKeywords);
  pushUnique(params.detectedKeywords);
  pushUnique(reportItems.map((r) => r.keyword));

  return orderedKeywords.map((keyword) => {
    const matched = reportByKey.get(normalizeKeywordKey(keyword));
    const integratedIn = matched?.integratedIn ?? 'none';
    const used = integratedIn === 'about' || integratedIn === 'experience' || integratedIn === 'both';
    const alreadyPresent = integratedIn === 'already_present';
    return {
      keyword,
      integratedIn,
      note:
        matched?.note ||
        (alreadyPresent
          ? 'CV metninde zaten geçiyor.'
          : used
            ? 'CV uyarlamasına eklendi.'
            : 'Bu KW CV’ye doğal/güvenli şekilde entegre edilemedi.'),
      used,
      alreadyPresent,
    };
  });
}

export function formatIntegratedInLabel(
  integratedIn: KeywordIntegrationReportItem['integratedIn']
): string {
  switch (integratedIn) {
    case 'about':
      return 'Hakkımda';
    case 'experience':
      return 'Deneyim';
    case 'both':
      return 'Hakkımda + Deneyim (orijinalde ikisinde vardı)';
    case 'already_present':
      return 'CV’de zaten var';
    case 'none':
    default:
      return 'Kullanılamadı';
  }
}
