const MAX_CANDIDATE_KEYWORDS = 10;
const MAX_WEAVE_KEYWORDS = 5;

function normalizeKeywordKey(keyword) {
  return String(keyword || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cvAlreadyContainsKeyword(cvText, keyword) {
  const kw = String(keyword || "").trim();
  if (!kw || kw.length < 2) return false;
  const haystack = String(cvText || "");
  if (!haystack) return false;

  const lowerHay = haystack.toLowerCase();
  const lowerKw = kw.toLowerCase();
  if (lowerHay.includes(lowerKw)) return true;

  const fold = (s) =>
    s
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

  return fold(haystack).includes(fold(kw));
}

function uniqueKeywords(list, max = MAX_CANDIDATE_KEYWORDS) {
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const keyword = String(raw || "").trim();
    if (!keyword) continue;
    const key = normalizeKeywordKey(keyword);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(keyword);
    if (out.length >= max) break;
  }
  return out;
}

function refineKeywordsAgainstCv(params) {
  const fromCandidates = uniqueKeywords(params.candidateKeywords || [], MAX_CANDIDATE_KEYWORDS);
  const fromDetected = uniqueKeywords(params.detectedKeywords || [], MAX_CANDIDATE_KEYWORDS);
  const fromReport = uniqueKeywords(
    (params.report || []).map((r) => r.keyword),
    MAX_CANDIDATE_KEYWORDS
  );

  const candidateKeywords = uniqueKeywords(
    [...fromCandidates, ...fromDetected, ...fromReport],
    MAX_CANDIDATE_KEYWORDS
  );

  const alreadyPresentKeywords = [];
  const missingKeywords = [];

  for (const keyword of candidateKeywords) {
    if (cvAlreadyContainsKeyword(params.cvText, keyword)) {
      alreadyPresentKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  const weaveKeywords = missingKeywords.slice(0, MAX_WEAVE_KEYWORDS);
  const reportByKey = new Map();
  for (const item of params.report || []) {
    const keyword = String(item?.keyword || "").trim();
    if (!keyword) continue;
    const key = normalizeKeywordKey(keyword);
    if (!reportByKey.has(key)) {
      reportByKey.set(key, {
        keyword,
        integratedIn: item.integratedIn,
        note: String(item.note || "").trim(),
      });
    }
  }

  const report = [];

  for (const keyword of alreadyPresentKeywords) {
    report.push({
      keyword,
      integratedIn: "already_present",
      note: "CV metninde zaten geçiyor — dokumaya alınmadı.",
    });
  }

  const weaveSet = new Set(weaveKeywords.map(normalizeKeywordKey));
  for (const keyword of weaveKeywords) {
    const existing = reportByKey.get(normalizeKeywordKey(keyword));
    let integratedIn = existing?.integratedIn ?? "none";
    if (integratedIn === "already_present") {
      integratedIn = "none";
    }
    if (integratedIn === "both") {
      integratedIn = params.primarySection || "about";
    }
    report.push({
      keyword,
      integratedIn,
      note:
        existing?.note ||
        (integratedIn === "none"
          ? "Doğal/güvenli şekilde entegre edilemedi."
          : "Seçili alana doğal şekilde işlendi."),
    });
  }

  for (const keyword of missingKeywords) {
    if (weaveSet.has(normalizeKeywordKey(keyword))) continue;
    report.push({
      keyword,
      integratedIn: "none",
      note: "Önem/uygulanabilirlik sıralamasında üst 5’e giremedi.",
    });
  }

  return {
    candidateKeywords,
    alreadyPresentKeywords,
    weaveKeywords,
    report,
  };
}

function resolvePrimaryKeywordSection(params) {
  const about = Boolean(params.about);
  const exp = Boolean(params.workExperience);
  if (about && !exp) return "about";
  if (exp && !about) return "experience";
  if (about && exp) return "about";
  return null;
}

module.exports = {
  normalizeKeywordKey,
  cvAlreadyContainsKeyword,
  uniqueKeywords,
  refineKeywordsAgainstCv,
  resolvePrimaryKeywordSection,
  MAX_CANDIDATE_KEYWORDS,
  MAX_WEAVE_KEYWORDS,
};
