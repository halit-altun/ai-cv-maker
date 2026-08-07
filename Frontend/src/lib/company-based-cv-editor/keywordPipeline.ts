import type { KeywordIntegrationReportItem } from './types';

const MAX_CANDIDATE_KEYWORDS = 10;
const MAX_WEAVE_KEYWORDS = 5;

export function normalizeKeywordKey(keyword: string): string {
  return String(keyword || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * KW'nin CV metninde geçip geçmediği (basit substring / kelime sınırı).
 * Çok kısa (≤2) token'lar yanlış pozitif olmasın diye atlanır.
 */
export function cvAlreadyContainsKeyword(cvText: string, keyword: string): boolean {
  const kw = String(keyword || '').trim();
  if (!kw || kw.length < 2) return false;
  const haystack = String(cvText || '');
  if (!haystack) return false;

  const lowerHay = haystack.toLowerCase();
  const lowerKw = kw.toLowerCase();

  if (lowerHay.includes(lowerKw)) return true;

  // Türkçe İ/ı vb. için basit ASCII yakınsama
  const fold = (s: string) =>
    s
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

  return fold(haystack).includes(fold(kw));
}

export function uniqueKeywords(list: string[], max = MAX_CANDIDATE_KEYWORDS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const keyword = String(raw || '').trim();
    if (!keyword) continue;
    const key = normalizeKeywordKey(keyword);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(keyword);
    if (out.length >= max) break;
  }
  return out;
}

export type KeywordPipelineResult = {
  /** Aday havuz (≤10) */
  candidateKeywords: string[];
  /** CV'de zaten geçenler — dokunulmaz */
  alreadyPresentKeywords: string[];
  /** Dokuma hedefleri (≤5) */
  weaveKeywords: string[];
  /** Rapor satırları (already_present + AI raporu birleşik) */
  report: KeywordIntegrationReportItem[];
};

/**
 * AI çıktısını CV metnine göre düzeltir:
 * 1) Adayları topla (≤10)
 * 2) CV'de geçenleri ele (already_present)
 * 3) Kalanlardan ≤5 dokuma KW'si bırak
 */
export function refineKeywordsAgainstCv(params: {
  cvText: string;
  candidateKeywords?: string[] | null;
  detectedKeywords?: string[] | null;
  report?: KeywordIntegrationReportItem[] | null;
  primarySection?: 'about' | 'experience' | null;
}): KeywordPipelineResult {
  const fromCandidates = uniqueKeywords(params.candidateKeywords || [], MAX_CANDIDATE_KEYWORDS);
  const fromDetected = uniqueKeywords(params.detectedKeywords || [], MAX_CANDIDATE_KEYWORDS);
  const fromReport = uniqueKeywords(
    (params.report || []).map((r) => r.keyword),
    MAX_CANDIDATE_KEYWORDS
  );

  // Öncelik: AI candidateKeywords → detected → report sırası
  const candidateKeywords = uniqueKeywords(
    [...fromCandidates, ...fromDetected, ...fromReport],
    MAX_CANDIDATE_KEYWORDS
  );

  const alreadyPresentKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of candidateKeywords) {
    if (cvAlreadyContainsKeyword(params.cvText, keyword)) {
      alreadyPresentKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  // AI sırasını koru (önem derecesi proxy); en fazla 5 dokuma hedefi
  const weaveKeywords = missingKeywords.slice(0, MAX_WEAVE_KEYWORDS);

  const reportByKey = new Map<string, KeywordIntegrationReportItem>();
  for (const item of params.report || []) {
    const keyword = String(item?.keyword || '').trim();
    if (!keyword) continue;
    const key = normalizeKeywordKey(keyword);
    if (!reportByKey.has(key)) {
      reportByKey.set(key, {
        keyword,
        integratedIn: item.integratedIn,
        note: String(item.note || '').trim(),
      });
    }
  }

  const report: KeywordIntegrationReportItem[] = [];

  for (const keyword of alreadyPresentKeywords) {
    report.push({
      keyword,
      integratedIn: 'already_present',
      note: 'CV metninde zaten geçiyor — dokumaya alınmadı.',
    });
  }

  const weaveSet = new Set(weaveKeywords.map(normalizeKeywordKey));
  for (const keyword of weaveKeywords) {
    const existing = reportByKey.get(normalizeKeywordKey(keyword));
    let integratedIn = existing?.integratedIn ?? 'none';
    if (integratedIn === 'already_present') {
      integratedIn = 'none';
    }
    // Yeni dokumada "both" üretme — tek alana indir
    if (integratedIn === 'both') {
      integratedIn = params.primarySection || 'about';
    }
    report.push({
      keyword,
      integratedIn,
      note:
        existing?.note ||
        (integratedIn === 'none'
          ? 'Doğal/güvenli şekilde entegre edilemedi.'
          : 'Seçili alana doğal şekilde işlendi.'),
    });
  }

  // Dokuma listesinde olmayan ama raporda kalan "none" adayları da ekle (bilgi)
  for (const keyword of missingKeywords) {
    if (weaveSet.has(normalizeKeywordKey(keyword))) continue;
    report.push({
      keyword,
      integratedIn: 'none',
      note: 'Önem/uygulanabilirlik sıralamasında üst 5’e giremedi.',
    });
  }

  return {
    candidateKeywords,
    alreadyPresentKeywords,
    weaveKeywords,
    report,
  };
}

export function resolvePrimaryKeywordSection(params: {
  about?: boolean;
  workExperience?: boolean;
}): 'about' | 'experience' | null {
  const about = Boolean(params.about);
  const exp = Boolean(params.workExperience);
  if (about && !exp) return 'about';
  if (exp && !about) return 'experience';
  // İkisi de seçiliyse UI sırasına göre birincil: Hakkımda
  if (about && exp) return 'about';
  return null;
}

export { MAX_CANDIDATE_KEYWORDS, MAX_WEAVE_KEYWORDS };
