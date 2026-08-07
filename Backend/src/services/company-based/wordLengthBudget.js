function countWords(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function computeWordLengthBudget(currentWords) {
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

module.exports = {
  countWords,
  computeWordLengthBudget,
};
