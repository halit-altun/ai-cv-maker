/**
 * Company-based runFullOptimizationBundle prompt — Frontend service.ts ile birebir aynı metin.
 * Prompt kurallarına dokunmayın; yalnızca taşıyın.
 */
function buildFullOptimizationBundlePrompt(request) {
  const {
    parseCvSectionLengthMode,
    buildCvSectionLengthPromptAddon,
  } = require("../../utils/cv-section-length");
  const isEnglish = request.cvLanguage === "english";
  const lang = isEnglish ? "English" : "Turkish";
  const adaptSource = request.adaptationSource ?? "company";
  const wantCover = Boolean(request.generateCoverLetter);
  const wantLinkedIn = Boolean(request.generateLinkedInMessage);
  const wantCold = Boolean(request.generateColdEmail);
  const coldLang = request.coldEmailLanguage === "english" ? "English" : "Turkish";
  const lengthMode = parseCvSectionLengthMode(request.cvSectionLengthMode);
  /** LinkedIn: cold mail dili varsa onu kullan (toplu outreach tutarlılığı) */
  const linkedInLang = wantCold ? coldLang : lang;
  const companyKeywords = Array.isArray(request.companyInfo?.extractedKeywords)
    ? request.companyInfo.extractedKeywords.filter(Boolean)
    : [];
  const mustMention = (request.manualMustMentionTopics || []).filter(Boolean);
  const mustNot = (request.manualMustNotMentionTopics || []).filter(Boolean);
  const kwAbout = request.keywordTargetSections?.about === true;
  const kwExp = request.keywordTargetSections?.workExperience === true;
  const kwSkills = request.keywordTargetSections?.skills === true;
  const targetPosition = (request.targetPosition || "").trim();
  const recipientName = (request.recipientName || "").trim();
  const recipientCompany =
    (request.recipientCompanyName || "").trim() ||
    (request.companyInfo?.name || "").trim();
  const {
    buildGenericInboxRoutingPromptAddon,
  } = require("../../utils/cold-email-generic-inbox");
  const wantGenericInboxRouting = Boolean(request.coldEmailGenericInboxRouting);
  const genericInboxAddon =
    wantCold && wantGenericInboxRouting
      ? `\n${buildGenericInboxRoutingPromptAddon({
          language: coldLang,
          companyName: recipientCompany,
        })}\n`
      : "";
  const hasCompanyPages =
    Array.isArray(request.companyPages) && request.companyPages.length > 0;
  const needCompanyExtract =
    adaptSource === "company" && !request.companyInfo && hasCompanyPages;

  const pagesBlock = hasCompanyPages
    ? request.companyPages
        .map(
          (p, i) => `
--- PAGE ${i + 1} ---
URL: ${p.url}
Type: ${p.pageType || p.description || "n/a"}
TEXT:
${(p.pageText || "").slice(0, 10000) || "(empty)"}
`
        )
        .join("\n")
    : "";

  const targetBlock =
    adaptSource === "text"
      ? `JOB DESCRIPTION:\n${request.jobDescriptionText || "N/A"}`
      : request.companyInfo
        ? `COMPANY PROFILE:\n${JSON.stringify(
            {
              name: request.companyInfo.name,
              industry: request.companyInfo.industry,
              description: request.companyInfo.description,
              values: request.companyInfo.values,
              requirements: request.companyInfo.requirements,
              culture: request.companyInfo.culture,
              extractedKeywords: companyKeywords,
            },
            null,
            2
          )}`
        : `COMPANY PAGES (extract profile from these):\n${pagesBlock || "N/A"}`;

  const prompt = `
You are a CV optimizer. Do EVERYTHING in ONE JSON response. Output language for CV/adapted text: ${lang}.
LANGUAGE LOCK (CRITICAL): parsedCV and analysis adapted fields (about, experience, skills, languages, titles) MUST be entirely in ${lang}. The company website / job-ad language MUST NOT change the CV language. If ${lang} is Turkish, never switch headings or body to English (no "About Me", no English about/experience). If ${lang} is English, never switch CV body to Turkish.

CV TEXT:
${request.cvText}

${targetBlock}

TARGET POSITION (if any): ${targetPosition || "none"}
KEYWORD SECTIONS: about=${kwAbout ? "YES" : "NO"}, workExperience=${kwExp ? "YES" : "NO"}, skills=${kwSkills ? "YES" : "NO"}
SECTION LENGTH MODE: ${lengthMode}${
    lengthMode === "fit_range"
      ? " (fit character bands even if KW cannot be woven)"
      : " (no character-band targeting; KW weave only if natural)"
  }
Company KW hint: ${companyKeywords.length ? companyKeywords.join(", ") : "extract from pages/profile"}
Must mention: ${mustMention.length ? mustMention.join(", ") : "none"}
Must NOT mention: ${mustNot.length ? mustNot.join(", ") : "none"}
Extract companyInfo: ${needCompanyExtract ? "YES (required)" : "NO (omit or null)"}

GENERATE FLAGS:
- coverLetter: ${wantCover ? "YES" : "NO"}
- linkedinMessage: ${wantLinkedIn ? "YES" : "NO"}
- coldEmail: ${wantCold ? "YES" : "NO"} (language: ${coldLang})

Return ONLY this JSON shape:
{
  "companyInfo": ${
    needCompanyExtract
      ? `{
    "name": "", "website": "", "description": "", "industry": "",
    "values": [], "requirements": [], "culture": "",
    "extractedKeywords": ["up to 10 candidate KWs"], "detectedLanguage": "turkish|english|other",
    "analyzedLinks": [{ "url": "", "description": "", "pageType": "" }]
  }`
      : "null"
  },
  "parsedCV": {
    "personalInfo": {
      "firstName": "", "lastName": "", "title": "", "country": "", "city": "",
      "phone": "", "email": "", "portfolio": "", "github": "", "linkedin": ""
    },
    "about": "",
    "workExperience": [
      {
        "id": "1", "position": "", "company": "", "city": "", "country": "",
        "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present",
        "bulletPoints": ["..."]
      }
    ],
    "education": [
      { "id": "1", "university": "", "department": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM" }
    ],
    "skills": ["..."],
    "languages": [{ "id": "1", "language": "", "level": "" }]
  },
  "analysis": {
    "originalAbout": "",
    "updatedAbout": ${
      lengthMode === "fit_range" && kwAbout
        ? '"300–600 characters; near-bound fit; preserve original meaning"'
        : '""'
    },
    "originalExperience": "plain text of experiences with • bullets",
    "updatedExperience": ${
      lengthMode === "fit_range" && kwExp
        ? '"same jobs + SAME bullet count; EACH bullet 130–150 chars (near-bound); KW only if still in band"'
        : '"same jobs + SAME bullet count; unchanged bullets EXACT copy; KW bullets keep all original detail (may be slightly longer)"'
    },
    "originalSkills": "",
    "updatedSkills": "comma-separated short skill names",
    "originalLanguages": "",
    "updatedLanguages": "",
    "recommendations": ["Türkçe öneri 1", "Türkçe öneri 2"],
    "matchScore": 0,
    "detectedKeywords": ["max 5 weave KWs not already in CV"],
    "candidateKeywords": ["up to 10 candidates from target"],
    "keywordIntegrationReport": [
      { "keyword": "KW1", "integratedIn": "about|experience|both|none|already_present", "note": "..." }
    ],
    "positiveMatches": [{ "label": "...", "evidence": "..." }],
    "negativeMismatches": [{ "label": "...", "gap": "Bu ilan için uygun değil çünkü ...", "evidence": "" }]
  },
  "coverLetter": ${wantCover ? '"full cover letter body WITHOUT signature"' : '""'},
  "linkedinMessage": ${
    wantLinkedIn
      ? `"60-90 word LinkedIn cold-outreach body in ${linkedInLang} WITHOUT signature"`
      : '""'
  },
  "coldEmail": ${
    wantCold
      ? '{ "subject": "...", "body": "full cold email WITH signature lines" }'
      : "null"
  }
}

CRITICAL RULES:
1) Parse ALL CV facts accurately; do not invent experience/skills/metrics.
2) PRESERVE DETAIL (CRITICAL — DO NOT SHORTEN):
   - Adaptation means ADDING target KWs into existing wording when needed — NOT rewriting from scratch.
   - updatedAbout must keep (or slightly expand) the original about meaning/detail. Never drop facts, tech names, metrics, or scope. If SECTION LENGTH MODE=fit_range, follow 2b character bands (near-bound expand/compress) instead of "never shorten".
   - For EACH work-experience bullet:
     * If SECTION LENGTH MODE=fit_range and the bullet is outside 130–150 chars → rewrite that bullet to the near bound (even if no KW). Exact-copy does NOT apply to out-of-band bullets.
     * If that bullet does NOT need a KW and is already in-band (or mode=keywords_only) → copy the original bullet text EXACTLY (character-faithful).
     * If that bullet needs a KW → weave the KW into the SAME bullet; keep all original details; in keywords_only the sentence may get slightly longer (+10–15 words ideal, +25 hard max). In fit_range, KW weave must still leave the bullet in 130–150 chars.
   - FORBIDDEN: summarizing, compressing, shortening, or replacing detailed bullets with shorter generic versions — EXCEPT when SECTION LENGTH MODE=fit_range and the original is outside the character band (see 2b). Then compress/expand only to the NEAR bound, never the far bound.
   - FORBIDDEN: removing platforms/tech/metrics that existed in the original (e.g. Hepsiburada, SQL Server, TypeScript, % numbers, frontend %).
   - Same bullet COUNT as original; never add/remove bullets.
${buildCvSectionLengthPromptAddon({
  mode: lengthMode,
  kwAbout,
  kwExp,
})}
3) MAIN TARGET KWs — CANDIDATE POOL → FILTER → WEAVE (≤5):
   Step A: Extract up to 10 important candidate KWs from the target (job/pages). Prefer hard skills/tools/domain terms.
   Step B: Scan the FULL CV text. If a candidate KW already appears anywhere in the CV → DO NOT weave it; mark integratedIn="already_present" with note "CV'de zaten geçiyor".
   Step C: From the remaining candidates (not already in CV), keep at most 5 by importance + natural applicability. These are detectedKeywords (length ≤ 5).
   Step D: Weave ONLY those ≤5 into the PRIMARY selected section (see rule 4). Do not force every page keyword into the CV.
   Also return candidateKeywords (≤10) listing the Step A pool (including already-present ones).
   keywordIntegrationReport must cover: already_present KWs + the ≤5 weave KWs (and any skipped with "none").
4) KW weaving (ONE PLACE — PRIMARY SECTION):
   Allowed: about=${kwAbout ? "YES" : "NO"}, workExperience=${kwExp ? "YES" : "NO"}.
   PRIMARY section to weave into:
     ${
       kwAbout && !kwExp
         ? "about ONLY"
         : kwExp && !kwAbout
           ? "experience ONLY"
           : kwAbout && kwExp
             ? "about FIRST (primary). Prefer putting all weave KWs into about; use experience only if about cannot fit a KW naturally."
             : "NONE (do not force-weave KWs)"
     }
   - Each weave KW must appear in AT MOST ONE adapted section.
   - NEVER invent "both" for newly woven KWs. integratedIn="both" ONLY if ORIGINAL already had it in both.
   - If a weave KW cannot fit primary → try the other allowed section if YES; else integratedIn="none".
   - Skills/languages/education: NEVER force-weave for this purpose.
5) recommendations ALWAYS Turkish.
6) Cover letter (if YES): 250-350 words total intent, 3-4 paragraphs, ${lang}, no signature, no markdown. Use only target keywords grounded in CV.
7) LinkedIn cold outreach (if YES) — ${linkedInLang}, plain text, NO markdown, NO signature/contact block (app appends it):
   LENGTH: 60-90 words body (hard). Aim ~400-600 characters; mobile-readable without scroll.
   FORMAT: Short paragraphs with blank lines between them; corporate-letter tone avoided; not an email essay.
   GREETING: First line exactly "Merhaba," (TR) or "Hi," (EN). LinkedIn is 1:1 to one person — never use "[Company] team/Ekibi", "Hiring Team", or put a company/person name in the greeting.
   A→Z FLOW (required):
     (A) Opening & context: 1 grounded sentence showing interest in THIS company's work (tech focus / sector / growth / recent focus) — ONLY from target pages/profile. No fake flattery.
     (B) Value proposition: 1-2 sentences summarizing the candidate (role + stack from CV) and how they can help THIS company's focus. Prefer real CV∩company overlap; never claim company-domain tech absent from CV.
     (C) CTA: Soft ask to review profile/CV fit and a short chat — NOT pushy interview demand. Do NOT say "I am looking for a job at your company"; frame as sharing how you can contribute.
   FORBIDDEN: long biography, fake praise, link/PDF bombardment, listing multiple URLs, "please interview me" pressure, inventing company products/clients/awards.
   Do NOT mention attaching a PDF filename in the body.
8) Cold email (if YES): language ${coldLang}, max ~150 words, greeting + short body + Best regards/Saygılarımla + name/title/email/phone/links if known.
   RESEARCHED / COMPANY-FIT VIBE (REQUIRED) + ZERO HALLUCINATION:
   - Reader must feel you looked at THIS company (not a mass blast).
   - Ground EVERY company claim ONLY in the target block (company pages / companyInfo / JD). If a fact is not there, do NOT write it.
   - FORBIDDEN for the company: inventing products, services, clients, partners, awards, funding, headcount, offices, tech stack, culture slogans, or "you work with X".
   - Allowed company hook: only industry / work-area / domain phrases that are explicitly present or clearly paraphrased from the target text.
   - If work-area is unclear/thin in the target data: use a cautious hook (company name + role interest) WITHOUT inventing a domain — better sparse than fake.
   MATCH PRIORITY (CRITICAL — candidate claims):
   - Prefer highlighting skills/tech/experience that appear BOTH in the company/JD target AND in the candidate CV (real overlap).
   - NEVER claim ownership of a company-domain technology that is NOT in the CV (e.g. company=telecom, CV has no telecom/X → do NOT write "I have X for telecom" / "telekomünikasyon için X teknolojisine sahibim").
   - If domain is relevant but CV lacks that stack: use interest/learning/contribution intent only ("bu alana katkı vermek istiyorum", "ilgi duyuyorum", "öğrenmeye açığım") — never fake mastery.
   - Achievements/metrics in the middle MUST come from CV highlights only.
   - Avoid empty flattery without a grounded work-area detail.
   - Subject may lightly reflect role + grounded domain (keep short).
   - Do NOT mention CV attachment, filename, or "CV eki" in the body — PDF is attached separately; naming it is unprofessional.
${genericInboxAddon}9) Recipient name: ${recipientName || "none"}; company for outreach: ${recipientCompany || "none"}.
10) Outreach optional links if non-empty: LinkedIn=${request.outreachLinkedinUrl || "n/a"}, Portfolio=${request.outreachPortfolioUrl || "n/a"}, Website=${request.outreachWebsiteUrl || "n/a"}, Phone=${request.outreachPhone || "n/a"}.
11) If a GENERATE flag is NO, return empty string / null for that field.
12) If Extract companyInfo=YES, fill companyInfo from pages; extractedKeywords may list up to 10 candidate hints (pipeline will filter). companyInfo.name MUST be the brand/legal company name only — NEVER a URL, www., or domain (put those in website).
`;

  return {
    prompt,
    meta: {
      isEnglish,
      lang,
      adaptSource,
      wantCover,
      wantLinkedIn,
      wantCold,
      coldLang,
      linkedInLang,
      kwAbout,
      kwExp,
      kwSkills,
      lengthMode,
      targetPosition,
      recipientName,
      recipientCompany,
      needCompanyExtract,
    },
  };
}

module.exports = {
  buildFullOptimizationBundlePrompt,
};
