import type { CompanyBasedUnifiedAnalysisParams } from './types';
import {
  buildParseCvJsonPrompt,
  buildAdaptCvAnalysisPrompt,
  mapUnifiedParamsToAdaptRequest,
  sanitizeRoleTitleForPrompt
} from './legacyParseAndAdaptPrompts';
import { buildCompanyCoverLetterPrompt, buildCompanyLinkedInMessagePrompt } from './legacyOutreachPrompts';

/**
 * Tek Gemini isteği: çoklu akıştaki AYNI prompt bloklarını sırayla uygular; tek fark tek HTTP çağrısıdır.
 * Çıktı: tek JSON — parsedCV (Aşama 1 şeması), analysis (Aşama 2 şeması), coverLetterBody, linkedinMessageBody.
 */
export function buildCompanyBasedUnifiedPrompt(p: CompanyBasedUnifiedAnalysisParams): string {
  const isEnglish = p.cvLanguage === 'english';
  const adaptationSource = p.adaptationSource;
  const targetInfoForAdaptation =
    adaptationSource === 'text'
      ? `Job Description Text:\n${p.jobDescriptionText || 'Job description text is missing.'}`
      : `Company Information:\n${p.companyInfo ? JSON.stringify(p.companyInfo, null, 2) : 'Company information is missing.'}`;

  const manualMustMention = Array.isArray(p.manualMustMentionTopics) ? p.manualMustMentionTopics.filter(Boolean) : [];
  const manualMustNotMention = Array.isArray(p.manualMustNotMentionTopics) ? p.manualMustNotMentionTopics.filter(Boolean) : [];

  const targetPositionClean = sanitizeRoleTitleForPrompt(p.targetPositionHint) || '';

  const aboutForOutreachRule = p.aiAdaptation.about
    ? isEnglish
      ? 'For outreach fields (coverLetterBody / linkedinMessageBody), use analysis.updatedAbout as the candidate "about" context.'
      : 'Outreach alanları (coverLetterBody / linkedinMessageBody) için aday "hakkımda" bağlamı olarak analysis.updatedAbout kullan.'
    : isEnglish
      ? 'For outreach fields, use parsedCV.about as the candidate "about" context (do not use updatedAbout for outreach).'
      : 'Outreach alanları için aday "hakkımda" bağlamı olarak parsedCV.about kullan (updatedAbout outreach için kullanılmasın).';

  const jsonShape = `
Return ONE JSON object only (no markdown fences). Top-level keys MUST be exactly:
{
  "parsedCV": { ... },
  "analysis": { ... },
  "coverLetterBody": string,
  "linkedinMessageBody": string
}

parsedCV MUST match the exact JSON schema and rules from LEGACY STEP A (same keys as multi-step parse).
analysis MUST match the exact JSON schema and rules from LEGACY STEP B (same keys as multi-step analyzeAndAdaptCV).

If generateCoverLetter is false for this request, set coverLetterBody to "".
If generateLinkedInMessage is false for this request, set linkedinMessageBody to "".
`;

  const stepA = buildParseCvJsonPrompt(p.cvText, p.cvLanguage);
  const stepB = buildAdaptCvAnalysisPrompt(mapUnifiedParamsToAdaptRequest(p), { bundledSingleCall: true });

  const outreachBundleAbout = p.aiAdaptation.about ? 'analysis.updatedAbout' : 'parsedCV.about';

  const coverStepParams = {
    source: p.coverLetterSource,
    companyInfo: p.coverLetterSource === 'company' ? p.companyInfo : undefined,
    jobDescriptionText: p.coverLetterSource === 'text' ? p.jobDescriptionText : undefined,
    personalInfo: {},
    about: '',
    cvLanguage: p.cvLanguage,
    candidateExperienceYears: null as number | null,
    candidateSkills: [] as string[],
    candidateHighlights: [] as string[],
    recipientName: p.coverLetterRecipientName,
    recipientCompanyName: p.coverLetterCompanyName,
    targetPosition: p.targetPositionHint,
    manualMustMentionTopics: p.manualMustMentionTopics,
    manualMustNotMentionTopics: p.manualMustNotMentionTopics
  };

  const stepC = p.generateCoverLetter
    ? `
=== LEGACY STEP C — SAME PROMPT AS generateCompanyCoverLetter (cover body only; app still appends signature) ===
${buildCompanyCoverLetterPrompt(coverStepParams, {
  bundleFieldHints: true,
  bundleAboutSource: outreachBundleAbout
})}
`
    : '';

  const linkedinStepParams = {
    source: p.linkedinTargetSource,
    companyInfo: p.linkedinTargetSource === 'company' ? p.companyInfo : undefined,
    jobDescriptionText: p.linkedinTargetSource === 'text' ? p.jobDescriptionText : undefined,
    personalInfo: {},
    about: '',
    cvLanguage: p.cvLanguage,
    candidateExperienceYears: null as number | null,
    candidateSkills: [] as string[],
    candidateHighlights: [] as string[],
    recipientName: p.coverLetterRecipientName,
    recipientCompanyName: p.coverLetterCompanyName,
    targetPosition: p.targetPositionHint,
    manualMustMentionTopics: p.manualMustMentionTopics,
    manualMustNotMentionTopics: p.manualMustNotMentionTopics
  };

  const stepD = p.generateLinkedInMessage
    ? `
=== LEGACY STEP D — SAME PROMPT AS generateCompanyLinkedInMessage (message body only; app still appends signature) ===
${buildCompanyLinkedInMessagePrompt(linkedinStepParams, {
  bundleFieldHints: true,
  bundleAboutSource: outreachBundleAbout
})}
`
    : '';

  const languagePreamble = isEnglish
    ? `GLOBAL LANGUAGE: English for parsedCV and for analysis text fields. Exception: recommendations MUST ALWAYS be Turkish.`
    : `GENEL DİL: parsedCV ve analysis metinleri Türkçe. İstisna: recommendations her zaman Türkçe.`;

  return `
You will perform the FULL multi-step company-based CV pipeline in ONE response. The ONLY difference vs multi-step mode is that you return a single JSON object instead of separate API calls.

${jsonShape}

${languagePreamble}

CV Text (authoritative source for facts — same as legacy):
${p.cvText}

Adaptation target (${adaptationSource === 'text' ? 'job description' : 'company'}) — same block as legacy step B:
${targetInfoForAdaptation}

Optional company URL context (may be empty): ${p.companyUrl || 'none'}

Manual must-mention topics: ${manualMustMention.length ? manualMustMention.join(', ') : 'none'}
Manual must-not-mention topics: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'none'}

Preferred target position hint (outreach headers; if weak, fall back to parsedCV.personalInfo.title): ${targetPositionClean || 'derive from parsedCV.personalInfo.title'}

${aboutForOutreachRule}

Produce parsedCV and analysis FIRST (internally), then write coverLetterBody / linkedinMessageBody using those results, following LEGACY STEP C/D field-hint rules above.

=== LEGACY STEP A — SAME PROMPT AS parseCVDataWithAI ===
${stepA}

=== LEGACY STEP B — SAME PROMPT AS analyzeAndAdaptCV (single-call candidate inference mode) ===
${stepB}

${stepC}

${stepD}

CRITICAL: Output valid JSON only. No markdown fences. No commentary outside JSON.
`.trim();
}
