/**
 * Company-based / bulk: Hakkımda ve deneyim maddesi karakter aralığı modu.
 * fit_range = yeni yapı (aralığa çek). keywords_only = mevcut KW-only davranış.
 */

const { stripCvMarkdownEmphasis } = require("./cv-plain-text");

const CV_SECTION_LENGTH_MODES = new Set(["fit_range", "keywords_only"]);

const ABOUT_CHAR_MIN = 300;
const ABOUT_CHAR_MAX = 600;
const BULLET_CHAR_MIN = 130;
const BULLET_CHAR_MAX = 150;
/** Kısa metin: min + bu kadar (Hakkımda 300–350). */
const ABOUT_SHORT_AIM_EXTRA = 50;
/** Uzun metin: max − bu kadar (Hakkımda 560–600). */
const ABOUT_LONG_AIM_SHRINK = 40;
const BULLET_SHORT_AIM_EXTRA = 10;
const BULLET_LONG_AIM_SHRINK = 10;

function parseCvSectionLengthMode(value, fallback = "fit_range") {
  const raw = String(value || "").trim();
  if (CV_SECTION_LENGTH_MODES.has(raw)) return raw;
  return fallback === "keywords_only" ? "keywords_only" : "fit_range";
}

function collapseWs(text) {
  return stripCvMarkdownEmphasis(String(text || ""))
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nearBoundRange(originalLen, hardMin, hardMax, shortExtra, longShrink) {
  if (originalLen < hardMin) {
    return { lo: hardMin, hi: Math.min(hardMax, hardMin + shortExtra) };
  }
  if (originalLen > hardMax) {
    return { lo: Math.max(hardMin, hardMax - longShrink), hi: hardMax };
  }
  return { lo: hardMin, hi: hardMax };
}

function compressToMax(text, lo, hi) {
  const s = collapseWs(text);
  if (s.length <= hi) return s;
  const slice = s.slice(0, hi);
  const minKeep = Math.min(Math.max(0, lo), hi);
  for (let i = slice.length - 1; i >= minKeep; i -= 1) {
    const ch = slice[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
      let end = i + 1;
      while (end < slice.length && /["'”’)\]]/.test(slice[end])) end += 1;
      const cut = slice.slice(0, end).trim();
      if (cut.length >= minKeep) return cut;
    }
  }
  const sp = slice.lastIndexOf(" ");
  if (sp >= minKeep) return slice.slice(0, sp).trim();
  return slice.trim();
}

/**
 * Prompt kurallarını kodda katı uygular: kısa → min yakını, uzun → max yakını.
 * Uydurma yok; min'in altındaysa genişletilmez.
 */
function fitTextToNearBound(
  candidate,
  original,
  hardMin,
  hardMax,
  shortExtra,
  longShrink
) {
  const orig = collapseWs(original);
  const cand = collapseWs(candidate) || orig;
  if (!cand) return "";

  const origLen = orig.length;
  const { lo, hi } = nearBoundRange(
    origLen,
    hardMin,
    hardMax,
    shortExtra,
    longShrink
  );
  const origInHard = origLen >= hardMin && origLen <= hardMax;

  let text = cand;
  if (text.length > hi) text = compressToMax(text, lo, hi);

  if (text.length < lo) {
    if (origInHard) return orig;
    if (origLen > hi) {
      const fromOrig = compressToMax(orig, lo, hi);
      if (fromOrig.length >= lo) return fromOrig;
    }
    return text;
  }

  if (text.length > hardMax) {
    text = compressToMax(text, hardMin, hardMax);
  }
  return text;
}

function fitAboutText(candidate, original) {
  return fitTextToNearBound(
    candidate,
    original,
    ABOUT_CHAR_MIN,
    ABOUT_CHAR_MAX,
    ABOUT_SHORT_AIM_EXTRA,
    ABOUT_LONG_AIM_SHRINK
  );
}

function fitBulletText(candidate, original) {
  return fitTextToNearBound(
    candidate,
    original,
    BULLET_CHAR_MIN,
    BULLET_CHAR_MAX,
    BULLET_SHORT_AIM_EXTRA,
    BULLET_LONG_AIM_SHRINK
  );
}

function fitExperienceBulletLines(updatedText, originalWorkExperience = []) {
  const origBullets = (Array.isArray(originalWorkExperience)
    ? originalWorkExperience
    : []
  ).flatMap((exp) =>
    Array.isArray(exp?.bulletPoints)
      ? exp.bulletPoints.map((b) => String(b || "").trim()).filter(Boolean)
      : []
  );
  let bulletIdx = 0;
  return String(updatedText || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!/^[•\-*]/.test(trimmed)) return line;
      const prefixMatch = line.match(/^\s*[•\-*]\s*/);
      const prefix = prefixMatch ? prefixMatch[0].replace(/\s+$/, " ") : "• ";
      const body = trimmed.replace(/^[•\-*]\s*/, "");
      const original = origBullets[bulletIdx] || body;
      bulletIdx += 1;
      return `${prefix}${fitBulletText(body, original)}`;
    })
    .join("\n");
}

function enforceFitRangeOnAnalysis(
  analysis,
  parsedCV = {},
  { mode, aboutEnabled, experienceEnabled } = {}
) {
  if (!analysis || parseCvSectionLengthMode(mode) !== "fit_range") {
    return analysis;
  }
  if (aboutEnabled) {
    const original = String(
      analysis.originalAbout || parsedCV.about || ""
    ).trim();
    analysis.updatedAbout = fitAboutText(
      analysis.updatedAbout || original,
      original
    );
  }
  if (experienceEnabled) {
    analysis.updatedExperience = fitExperienceBulletLines(
      analysis.updatedExperience,
      parsedCV.workExperience || []
    );
  }
  return analysis;
}

function buildCvSectionLengthPromptAddon({ mode, kwAbout, kwExp }) {
  if (mode !== "fit_range") {
    return `
2b) SECTION LENGTH MODE = keywords_only (LEGACY — no character-band targeting):
   Follow rule 2 exactly. Do NOT shorten/compress to hit a character count.
   Weave KWs only when they fit naturally; if a KW cannot be woven, skip it (integratedIn="none").
   Character ranges below do NOT apply.
`;
  }

  const aboutBlock = kwAbout
    ? `HAKKIMDA (about=YES) — CHARACTERS including spaces/punctuation (JS string.length):
   Hard band: ${ABOUT_CHAR_MIN}–${ABOUT_CHAR_MAX} characters. Range WINS over KW weaving.
   - If original about is SHORTER than ${ABOUT_CHAR_MIN} (e.g. 200): expand to AT LEAST ${ABOUT_CHAR_MIN} and a little above (aim ${ABOUT_CHAR_MIN}–${ABOUT_CHAR_MIN + 50}). Do NOT stretch toward ${ABOUT_CHAR_MAX}. Do not invent jobs, employers, metrics, skills, or tools. Expand only by completing existing ideas with natural phrasing already implied by the CV (same stack, same role, same outcomes).
   - If original about is LONGER than ${ABOUT_CHAR_MAX}: compress to ${ABOUT_CHAR_MAX} or slightly below (aim ${ABOUT_CHAR_MAX - 40}–${ABOUT_CHAR_MAX}). Do NOT collapse toward ${ABOUT_CHAR_MIN}. Keep all core facts/tech/metrics; cut only redundancy/filler.
   - If original is already ${ABOUT_CHAR_MIN}–${ABOUT_CHAR_MAX}: stay inside the band. Weave KWs only if they still fit; if not, skip KW rather than leaving the band.
   - KW may or may not be added — the finished about MUST be ${ABOUT_CHAR_MIN}–${ABOUT_CHAR_MAX} when about=YES.`
    : `HAKKIMDA is NO — do not rewrite about for length; keep original about.`;

  const expBlock = kwExp
    ? `WORK EXPERIENCE BULLETS (workExperience=YES) — EACH bullet, CHARACTERS (JS string.length):
   Hard band per bullet: ${BULLET_CHAR_MIN}–${BULLET_CHAR_MAX}. Apply to ALL bullets in ALL jobs (e.g. 6 bullets → all 6). Same bullet COUNT; never add/remove bullets.
   - If a bullet is SHORTER than ${BULLET_CHAR_MIN}: expand to ${BULLET_CHAR_MIN} and a little above (aim ${BULLET_CHAR_MIN}–${BULLET_CHAR_MIN + 10}). Do NOT stretch to ${BULLET_CHAR_MAX}. No invented facts/metrics/employers.
   - If a bullet is LONGER than ${BULLET_CHAR_MAX}: compress to ${BULLET_CHAR_MAX} or slightly below (aim ${BULLET_CHAR_MAX - 10}–${BULLET_CHAR_MAX}). Do NOT collapse to ${BULLET_CHAR_MIN}. Keep platforms/tech/metrics; cut filler only.
   - If already ${BULLET_CHAR_MIN}–${BULLET_CHAR_MAX}: keep in band; weave KW only if it still fits.
   - Range WINS over KW. Preserve originality, meaning, and logic.`
    : `WORK EXPERIENCE is NO — do not rewrite bullets for length.`;

  return `
2b) SECTION LENGTH MODE = fit_range (OVERRIDES rule 2 "never shorten" ONLY to enter the near-bound band):
   Count CHARACTERS, not words. Do not invent facts. Do not add things that were not in the CV.
   Near-bound rule: too-short → approach MIN (a little above), never the MAX; too-long → approach MAX (a little below), never the MIN.
   ${aboutBlock}
   ${expBlock}
`;
}

module.exports = {
  ABOUT_CHAR_MIN,
  ABOUT_CHAR_MAX,
  BULLET_CHAR_MIN,
  BULLET_CHAR_MAX,
  ABOUT_SHORT_AIM_EXTRA,
  ABOUT_LONG_AIM_SHRINK,
  BULLET_SHORT_AIM_EXTRA,
  BULLET_LONG_AIM_SHRINK,
  parseCvSectionLengthMode,
  buildCvSectionLengthPromptAddon,
  fitAboutText,
  fitBulletText,
  fitExperienceBulletLines,
  enforceFitRangeOnAnalysis,
};
