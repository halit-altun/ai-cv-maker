/**
 * KW uyarlamasında uzunluk bütçesi:
 * Mevcut N kelime → güvenli N…N+15, maks önerilen N+20…N+25.
 * N → ~2N (ör. 55→100) gereksiz uzatma sayılır.
 */

export interface WordLengthBudget {
  currentWords: number;
  /** Tercih edilen üst sınır (mevcut + 15) */
  safeMaxWords: number;
  /** Sert üst sınır (mevcut + 25) */
  hardMaxWords: number;
  /** Hedef aralık etiketi, örn. "55-70" */
  safeRangeLabel: string;
  /** Maks önerilen aralık, örn. "75-80" */
  maxRecommendedLabel: string;
}

export function countWords(text: string): number {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function computeWordLengthBudget(currentWords: number): WordLengthBudget {
  const n = Math.max(0, Math.floor(currentWords));
  const safeMaxWords = n + 15;
  const hardMaxWords = n + 25;
  const maxRecLow = n + 20;
  const maxRecHigh = n + 25;

  return {
    currentWords: n,
    safeMaxWords,
    hardMaxWords,
    safeRangeLabel: `${n}-${safeMaxWords}`,
    maxRecommendedLabel: `${maxRecLow}-${maxRecHigh}`,
  };
}

export function formatBudgetGuidance(budget: WordLengthBudget, label: string): string {
  const { currentWords: n, safeRangeLabel, maxRecommendedLabel, hardMaxWords } = budget;
  if (n <= 0) {
    return `- ${label}: mevcut kelime sayısı yok/0 — kısa tut; gereksiz doldurma yapma.`;
  }
  return [
    `- ${label}:`,
    `  • Mevcut uzunluk: ${n} kelime`,
    `  • Güvenli yeni uzunluk: ${safeRangeLabel} kelime`,
    `  • Maksimum önerilen: ${maxRecommendedLabel} kelime (üst sert sınır ≈ ${hardMaxWords})`,
    `  • +10–15 kelime eklemek çok doğal; +20–25 hâlâ kabul edilebilir`,
    `  • ${n} kelimeyi ~${Math.round(n * 1.8)}–${n * 2} kelimeye çıkarmak GEREKSİZ UZATMA — yasak`,
  ].join('\n');
}
