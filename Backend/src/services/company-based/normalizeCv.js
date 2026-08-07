const {
  refineKeywordsAgainstCv,
  resolvePrimaryKeywordSection,
} = require("./keywordPipeline");

function normalizeDateToYYYYMM(rawDate) {
  if (!rawDate) return "";
  const date = String(rawDate).trim();
  if (!date) return "";
  if (/present|devam|current/i.test(date)) return "Present";

  const directMatch = date.match(/^(\d{4})[-\/.](\d{1,2})$/);
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2].padStart(2, "0")}`;
  }

  const reverseMatch = date.match(/^(\d{1,2})[-\/.](\d{4})$/);
  if (reverseMatch) {
    return `${reverseMatch[2]}-${reverseMatch[1].padStart(2, "0")}`;
  }

  const monthMap = {
    jan: "01",
    oca: "01",
    feb: "02",
    sub: "02",
    şub: "02",
    mar: "03",
    apr: "04",
    nis: "04",
    may: "05",
    jun: "06",
    haz: "06",
    jul: "07",
    tem: "07",
    aug: "08",
    agu: "08",
    ağu: "08",
    sep: "09",
    eyl: "09",
    oct: "10",
    eki: "10",
    nov: "11",
    kas: "11",
    dec: "12",
    ara: "12",
  };

  const monthYear = date.toLowerCase().match(/([a-zçğıöşü]+)\s+(\d{4})/i);
  if (monthYear) {
    const monthToken = monthYear[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const month = monthMap[monthToken];
    if (month) return `${monthYear[2]}-${month}`;
  }

  return date;
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.map((s) => String(s ?? "").trim()).filter(Boolean);
  }
  if (typeof skills === "string") {
    return skills
      .split(/,|\n|•|·|-/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeLanguages(languages) {
  if (!Array.isArray(languages)) return [];
  return languages
    .filter(Boolean)
    .map((item, index) => ({
      id: String(item.id ?? index + 1),
      language: String(item.language ?? ""),
      level: String(item.level ?? ""),
    }))
    .filter((item) => item.language.trim() || item.level.trim());
}

function parseCVDataSimple(cvText) {
  const personalInfo = {};
  const emailMatch = String(cvText || "").match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  if (emailMatch) personalInfo.email = emailMatch[1];
  const phoneMatch = String(cvText || "").match(/(\+?[0-9\s\-()]{10,})/);
  if (phoneMatch) personalInfo.phone = phoneMatch[1].trim();
  const linkedinMatch = String(cvText || "").match(
    /(linkedin\.com\/in\/[^\s]+)/i
  );
  if (linkedinMatch) personalInfo.linkedin = linkedinMatch[1];
  const githubMatch = String(cvText || "").match(/(github\.com\/[^\s]+)/i);
  if (githubMatch) personalInfo.github = githubMatch[1];
  return { personalInfo };
}

function normalizeParsedCVData(parsedData, cvText) {
  const fallback = parseCVDataSimple(cvText);
  const parsedPersonal = parsedData?.personalInfo || {};
  const fallbackPersonal = fallback.personalInfo || {};

  const workExperience = Array.isArray(parsedData?.workExperience)
    ? parsedData.workExperience.filter(Boolean).map((item, index) => ({
        id: String(item.id ?? index + 1),
        position: String(item.position ?? ""),
        company: String(item.company ?? ""),
        city: String(item.city ?? ""),
        country: String(item.country ?? ""),
        startDate: normalizeDateToYYYYMM(String(item.startDate ?? "")),
        endDate: normalizeDateToYYYYMM(String(item.endDate ?? "")),
        bulletPoints: Array.isArray(item.bulletPoints)
          ? item.bulletPoints.map((bp) => String(bp ?? "")).filter((bp) => bp.trim())
          : [],
      }))
    : [];

  const education = Array.isArray(parsedData?.education)
    ? parsedData.education.filter(Boolean).map((item, index) => ({
        id: String(item.id ?? index + 1),
        university: String(item.university ?? ""),
        department: String(item.department ?? ""),
        startDate: normalizeDateToYYYYMM(String(item.startDate ?? "")),
        endDate: normalizeDateToYYYYMM(String(item.endDate ?? "")),
      }))
    : [];

  return {
    personalInfo: {
      firstName: String(parsedPersonal.firstName ?? fallbackPersonal.firstName ?? ""),
      lastName: String(parsedPersonal.lastName ?? fallbackPersonal.lastName ?? ""),
      title: String(parsedPersonal.title ?? fallbackPersonal.title ?? ""),
      country: String(parsedPersonal.country ?? fallbackPersonal.country ?? ""),
      city: String(parsedPersonal.city ?? fallbackPersonal.city ?? ""),
      phone: String(parsedPersonal.phone ?? fallbackPersonal.phone ?? ""),
      email: String(parsedPersonal.email ?? fallbackPersonal.email ?? ""),
      portfolio: String(parsedPersonal.portfolio ?? fallbackPersonal.portfolio ?? ""),
      github: String(parsedPersonal.github ?? fallbackPersonal.github ?? ""),
      linkedin: String(parsedPersonal.linkedin ?? fallbackPersonal.linkedin ?? ""),
    },
    about: String(parsedData?.about ?? ""),
    workExperience,
    education,
    skills: normalizeSkills(parsedData?.skills),
    languages: normalizeLanguages(parsedData?.languages),
  };
}

function normalizeCVAnalysisResponse(parsed, options = {}) {
  const toText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
    }
    return value != null ? String(value) : "";
  };

  const toStringArray = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalizeReport = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        const row = item || {};
        const keyword = String(row.keyword ?? "").trim();
        if (!keyword) return null;
        const rawIn = String(row.integratedIn ?? "")
          .trim()
          .toLowerCase();
        let integratedIn = "none";
        if (
          rawIn === "about" ||
          rawIn === "experience" ||
          rawIn === "both" ||
          rawIn === "none" ||
          rawIn === "already_present"
        ) {
          integratedIn = rawIn;
        } else if (
          rawIn === "workexperience" ||
          rawIn === "work_experience" ||
          rawIn === "exp"
        ) {
          integratedIn = "experience";
        } else if (rawIn.includes("already")) {
          integratedIn = "already_present";
        }
        return {
          keyword,
          integratedIn,
          note: String(row.note ?? "").trim(),
        };
      })
      .filter(Boolean);
  };

  const primarySection = resolvePrimaryKeywordSection({
    about: options?.keywordTargetSections?.about,
    workExperience: options?.keywordTargetSections?.workExperience,
  });

  const refined = refineKeywordsAgainstCv({
    cvText: options?.cvText || "",
    candidateKeywords: toStringArray(parsed.candidateKeywords),
    detectedKeywords: toStringArray(parsed.detectedKeywords),
    report: normalizeReport(parsed.keywordIntegrationReport),
    primarySection,
  });

  return {
    originalAbout: toText(parsed.originalAbout),
    updatedAbout: toText(parsed.updatedAbout),
    originalExperience: toText(parsed.originalExperience),
    updatedExperience: toText(parsed.updatedExperience),
    originalSkills: toText(parsed.originalSkills),
    updatedSkills: toText(parsed.updatedSkills),
    originalLanguages: toText(parsed.originalLanguages),
    updatedLanguages: toText(parsed.updatedLanguages),
    recommendations: toStringArray(parsed.recommendations),
    matchScore:
      typeof parsed.matchScore === "number"
        ? parsed.matchScore
        : Number(parsed.matchScore) || 0,
    positiveMatches: Array.isArray(parsed.positiveMatches)
      ? parsed.positiveMatches
      : [],
    negativeMismatches: Array.isArray(parsed.negativeMismatches)
      ? parsed.negativeMismatches
      : [],
    candidateKeywords: refined.candidateKeywords,
    detectedKeywords: refined.weaveKeywords,
    keywordIntegrationReport: refined.report,
  };
}

function normalizeOutreachLetterFormatting(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s*•\s*/g, "\n• ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildOutreachSignatureBlock(personalInfo = {}) {
  const normalizeUrlForSignature = (value) =>
    String(value || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, "");

  const fullName = `${(personalInfo.firstName || "").trim()} ${(
    personalInfo.lastName || ""
  ).trim()}`.trim();
  const title = (personalInfo.title || "").trim();
  const email = personalInfo.email ? String(personalInfo.email).trim() : "";
  const phone = personalInfo.phone ? String(personalInfo.phone).trim() : "";
  const linkedin = normalizeUrlForSignature(personalInfo.linkedin);
  const portfolio = normalizeUrlForSignature(personalInfo.portfolio);

  return `Best regards,\n${fullName}\n${title}\n${email}\n${phone}\n${linkedin}\n${portfolio}`;
}

module.exports = {
  normalizeParsedCVData,
  normalizeCVAnalysisResponse,
  normalizeOutreachLetterFormatting,
  buildOutreachSignatureBlock,
  normalizeSkills,
  countWords: require("./wordLengthBudget").countWords,
};
