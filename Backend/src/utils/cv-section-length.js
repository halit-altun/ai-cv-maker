/**
 * Company-based / bulk: Hakkımda ve deneyim maddesi karakter aralığı modu.
 * fit_range = yeni yapı (aralığa çek). keywords_only = mevcut KW-only davranış.
 */

const CV_SECTION_LENGTH_MODES = new Set(["fit_range", "keywords_only"]);

const ABOUT_CHAR_MIN = 450;
const ABOUT_CHAR_MAX = 600;
const BULLET_CHAR_MIN = 130;
const BULLET_CHAR_MAX = 150;

function parseCvSectionLengthMode(value, fallback = "fit_range") {
  const raw = String(value || "").trim();
  if (CV_SECTION_LENGTH_MODES.has(raw)) return raw;
  return fallback === "keywords_only" ? "keywords_only" : "fit_range";
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
   - If original about is SHORTER than ${ABOUT_CHAR_MIN} (e.g. 350): expand to AT LEAST ${ABOUT_CHAR_MIN} and a little above (aim ${ABOUT_CHAR_MIN}–${ABOUT_CHAR_MIN + 50}). Do NOT stretch toward ${ABOUT_CHAR_MAX}. Do not invent jobs, employers, metrics, skills, or tools. Expand only by completing existing ideas with natural phrasing already implied by the CV (same stack, same role, same outcomes).
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
  parseCvSectionLengthMode,
  buildCvSectionLengthPromptAddon,
};
