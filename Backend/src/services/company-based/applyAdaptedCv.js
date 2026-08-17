const { countWords } = require("./wordLengthBudget");
const { parseCvSectionLengthMode } = require("../../utils/cv-section-length");

function parseWorkExperienceFromText(
  text,
  originalWorkExperience = [],
  options = {}
) {
  if (!text) {
    return originalWorkExperience.map((exp, index) => ({
      id: exp.id || String(index + 1),
      position: exp.position || `İş Deneyimi ${index + 1}`,
      company: exp.company || `Şirket ${index + 1}`,
      city: exp.city || "İstanbul",
      country: exp.country || "Türkiye",
      startDate: exp.startDate || "2025-01",
      endDate: exp.endDate || "Present",
      bulletPoints: Array.isArray(exp.bulletPoints) ? exp.bulletPoints : [],
    }));
  }

  let workExperienceSections = text
    .split("\n\n")
    .filter((section) => section.trim().length > 0);

  if (workExperienceSections.length === 1 && originalWorkExperience.length > 1) {
    const lines = workExperienceSections[0].split("\n");
    let secondExpStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes("Stajyer") ||
        lines[i].includes("Backend") ||
        lines[i].includes("Developer")
      ) {
        secondExpStartIndex = i;
        break;
      }
    }
    if (secondExpStartIndex > 0) {
      workExperienceSections = [
        lines.slice(0, secondExpStartIndex).join("\n"),
        lines.slice(secondExpStartIndex).join("\n"),
      ];
    }
  }

  const sourceExperiences =
    originalWorkExperience.length > 0
      ? originalWorkExperience
      : workExperienceSections.map(() => ({}));

  return sourceExperiences.map((originalExp, index) => {
    const section = workExperienceSections[index] || "";
    const lines = section ? section.split("\n") : [];
    const headerLine = lines[0] || "";
    const bulletLines = lines
      .slice(1)
      .filter(
        (line) =>
          line.trim().startsWith("•") ||
          line.trim().startsWith("-") ||
          line.trim().startsWith("*")
      );
    const aiBulletPoints = bulletLines
      .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
      .filter((point) => point.length > 0);

    const originalBullets = Array.isArray(originalExp?.bulletPoints)
      ? originalExp.bulletPoints.map((b) => String(b || "").trim()).filter(Boolean)
      : [];
    const targetBulletCount =
      originalBullets.length > 0 ? originalBullets.length : aiBulletPoints.length;

    const bulletPoints = Array.from({ length: targetBulletCount }, (_, i) => {
      const original = originalBullets[i] || "";
      const adapted = aiBulletPoints[i]?.trim() || "";
      if (!adapted) return original;
      if (!original) return adapted;
      const originalWords = countWords(original);
      const adaptedWords = countWords(adapted);
      if (
        !options.skipShortenGuard &&
        originalWords > 0 &&
        adaptedWords < originalWords * 0.9
      ) {
        return original;
      }
      return adapted;
    });

    let position = originalExp?.position || "";
    let company = originalExp?.company || "";
    let startDate = originalExp?.startDate || "2025-01";
    let endDate = originalExp?.endDate || "Present";
    const city = originalExp?.city || "İstanbul";
    const country = originalExp?.country || "Türkiye";

    for (const line of section.split("\n")) {
      const dateMatch = line.match(/(\d{2}\/\d{4})\s*-\s*(Present|\d{2}\/\d{4})/);
      if (dateMatch) {
        const [, startDateStr, endDateStr] = dateMatch;
        const [month, year] = startDateStr.split("/");
        startDate = `${year}-${month.padStart(2, "0")}`;
        if (endDateStr === "Present") {
          endDate = "Present";
        } else {
          const [endMonth, endYear] = endDateStr.split("/");
          endDate = `${endYear}-${endMonth.padStart(2, "0")}`;
        }
        break;
      }
    }

    if (!position || !company) {
      const headerLines = section.split("\n");
      if (headerLines.length >= 2) {
        position = position || headerLines[0].trim();
        company = company || headerLines[1].trim();
      } else if (headerLine) {
        position = position || headerLine.trim();
      }
    }

    return {
      id: originalExp?.id || String(index + 1),
      position: position || `İş Deneyimi ${index + 1}`,
      company: company || `Şirket ${index + 1}`,
      city,
      country,
      startDate,
      endDate,
      bulletPoints:
        bulletPoints.length > 0
          ? bulletPoints
          : originalBullets.length > 0
            ? originalBullets
            : ["AI tarafından uyarlanmış iş deneyimi"],
    };
  });
}

function parseSkillsFromText(text, existingSkills = []) {
  const normalizedExisting = (existingSkills || [])
    .map((skill) => String(skill || "").trim())
    .filter(Boolean);

  const rawSkills = Array.isArray(text)
    ? text.map((skill) => String(skill ?? "").trim()).filter(Boolean)
    : typeof text === "string"
      ? text
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : text
        ? [String(text).trim()].filter(Boolean)
        : [];

  if (rawSkills.length === 0) return normalizedExisting;
  return rawSkills;
}

/**
 * Company-based hook ile aynı uyarlama kuralları.
 */
function applyAdaptedCvFromBundle({
  parsedCV,
  analysis,
  companyInfo,
  aiSettings = {},
  targetPosition = "",
  cvSectionLengthMode,
}) {
  const aboutEnabled = aiSettings.about !== false;
  const expEnabled = aiSettings.workExperience !== false;
  const skillsEnabled = aiSettings.skills !== false;
  const skipShortenGuard =
    parseCvSectionLengthMode(cvSectionLengthMode) === "fit_range";

  const originalAbout = parsedCV.about || "";
  let about = originalAbout;
  if (aboutEnabled) {
    const updated = analysis.updatedAbout || "";
    if (updated.trim()) {
      const o = countWords(originalAbout);
      const u = countWords(updated);
      about =
        !skipShortenGuard && o > 0 && u < o * 0.9 ? originalAbout : updated;
    }
  }

  return {
    personalInfo: {
      firstName: parsedCV.personalInfo?.firstName || "Ad",
      lastName: parsedCV.personalInfo?.lastName || "Soyad",
      title: parsedCV.personalInfo?.title || targetPosition || "Ünvan",
      country: parsedCV.personalInfo?.country || "",
      city: parsedCV.personalInfo?.city || "",
      phone: parsedCV.personalInfo?.phone || "",
      email: parsedCV.personalInfo?.email || "",
      portfolio: parsedCV.personalInfo?.portfolio || "",
      github: parsedCV.personalInfo?.github || "",
      linkedin: parsedCV.personalInfo?.linkedin || "",
      photoUrl: "",
      includePhoto: false,
    },
    about,
    workExperience: expEnabled
      ? parseWorkExperienceFromText(
          analysis.updatedExperience,
          parsedCV.workExperience || [],
          { skipShortenGuard }
        )
      : parsedCV.workExperience || [],
    education: parsedCV.education || [],
    skills: skillsEnabled
      ? parseSkillsFromText(analysis.updatedSkills, parsedCV.skills || [])
      : parsedCV.skills || [],
    languages: parsedCV.languages || [],
    companyInfo: companyInfo || undefined,
    analysisResult: analysis,
  };
}

function buildAdaptationNotes(analysis) {
  const lines = [];
  if (Array.isArray(analysis?.recommendations)) {
    for (const rec of analysis.recommendations.slice(0, 6)) {
      const t = String(rec || "").trim();
      if (t) lines.push(`• ${t}`);
    }
  }
  if (Array.isArray(analysis?.detectedKeywords) && analysis.detectedKeywords.length) {
    lines.push(`Anahtar kelimeler: ${analysis.detectedKeywords.join(", ")}`);
  }
  if (typeof analysis?.matchScore === "number" && analysis.matchScore > 0) {
    lines.push(`Eşleşme skoru: ${analysis.matchScore}`);
  }
  return lines.join("\n").trim();
}

module.exports = {
  parseWorkExperienceFromText,
  parseSkillsFromText,
  applyAdaptedCvFromBundle,
  buildAdaptationNotes,
};
