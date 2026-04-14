import type { CompanyBasedUnifiedAnalysisParams } from './types';

const sanitizeRoleTitle = (value: string | undefined) => {
  let role = (value || '').trim();
  role = role.replace(/^[\-\s:]+|[\-\s:]+$/g, '');
  role = role.replace(/\s+/g, ' ');
  role = role.replace(/^founding\s+/i, '');
  return role.trim();
};

export function buildCompanyBasedUnifiedPrompt(p: CompanyBasedUnifiedAnalysisParams): string {
  const isEnglish = p.cvLanguage === 'english';
  const adaptationSource = p.adaptationSource;
  const targetInfoForAdaptation =
    adaptationSource === 'text'
      ? `Job Description Text:\n${p.jobDescriptionText || 'Job description text is missing.'}`
      : `Company Information:\n${p.companyInfo ? JSON.stringify(p.companyInfo, null, 2) : 'Company information is missing.'}`;

  const companyBlock = p.companyInfo
    ? `- Company Name: ${p.companyInfo.name}\n- Industry: ${p.companyInfo.industry}\n- Description: ${p.companyInfo.description}\n- Values: ${(p.companyInfo.values || []).join(', ')}\n- Requirements: ${(p.companyInfo.requirements || []).join(', ')}\n- Culture: ${p.companyInfo.culture || ''}`
    : '- Company information is missing.';

  const jobBlock = `Job Description Text:\n${p.jobDescriptionText || 'Job description text is missing.'}`;

  const coverTargetBlock = p.generateCoverLetter
    ? p.coverLetterSource === 'text'
      ? jobBlock
      : `Target Company Information:\n${companyBlock}`
    : '';

  const linkedinTargetBlock = p.generateLinkedInMessage
    ? p.linkedinTargetSource === 'text'
      ? jobBlock
      : `Target Company Information:\n${companyBlock}`
    : '';

  const manualMustMention = Array.isArray(p.manualMustMentionTopics) ? p.manualMustMentionTopics.filter(Boolean) : [];
  const manualMustNotMention = Array.isArray(p.manualMustNotMentionTopics) ? p.manualMustNotMentionTopics.filter(Boolean) : [];

  const targetPositionClean = sanitizeRoleTitle(p.targetPositionHint) || '';

  const recipientNameClean = p.coverLetterRecipientName?.trim() ? p.coverLetterRecipientName.trim() : undefined;
  const recipientCompanyNameClean = p.coverLetterCompanyName?.trim() ? p.coverLetterCompanyName.trim() : undefined;
  const englishGreeting = recipientNameClean ? `Dear ${recipientNameClean},` : 'Dear Hiring Team,';
  const turkishGreeting = recipientNameClean ? `Sayın ${recipientNameClean},` : 'Sayın İşe Alma Ekibi,';

  const aboutForOutreachRule = p.aiAdaptation.about
    ? isEnglish
      ? 'For outreach fields, use analysis.updatedAbout as the candidate "about" context.'
      : 'Outreach alanları için aday "hakkımda" bağlamı olarak analysis.updatedAbout kullan.'
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

parsedCV MUST include ALL keys: personalInfo, about, workExperience, education, skills, languages — same structure as structured CV extraction from the CV text.
analysis MUST include ALL keys required by the adaptation schema (original/updated fields, recommendations, matchScore, positiveMatches, negativeMismatches).

If generateCoverLetter is false for this request, set coverLetterBody to "".
If generateLinkedInMessage is false for this request, set linkedinMessageBody to "".
`;

  if (isEnglish) {
    return `
You will process the CV text in a SINGLE response. ${jsonShape}

GLOBAL LANGUAGE: English for CV field values in parsedCV and for adapted CV text fields in analysis (updatedAbout, updatedExperience, updatedSkills, updatedLanguages, originals as copied/adapted from CV). 
Exception: recommendations MUST ALWAYS be written in Turkish (every string in recommendations array), even if the CV is English.

CV Text:
${p.cvText}

Adaptation target (${adaptationSource === 'text' ? 'job description' : 'company'}):
${targetInfoForAdaptation}

Optional company URL context (may be empty): ${p.companyUrl || 'none'}

Manual must-mention topics: ${manualMustMention.length ? manualMustMention.join(', ') : 'none'}
Manual must-not-mention topics: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'none'}
Preferred target position hint (for outreach headers; if weak, fall back to parsedCV.personalInfo.title): ${targetPositionClean || 'derive from parsedCV.personalInfo.title'}

${aboutForOutreachRule}

STEP 1 — parsedCV:
Extract structured data from CV Text only. Rules:
- Output dates in YYYY-MM where applicable; use "Present" for ongoing roles.
- Include all work experiences and education entries as separate array items.
- skills: array of short skill names; languages: array of {id, language, level}.
- personalInfo must include email/phone/urls when present in CV text.
- Do not invent facts.

STEP 2 — analysis:
Analyze + adapt the CV against the adaptation target above.
Hard constraints:
- Never mention any experience duration/years range from the job posting/company requirements.
- Compute candidate tenure ONLY from parsedCV.workExperience dates if you mention years; if unclear, omit years entirely.
- Never claim skills/technologies/experiences not evidenced in CV text.
- Use parsedCV.skills and parsedCV.languages as candidate skill/language facts when judging grounding.
- positiveMatches / negativeMismatches: labels and evidence/gap in Turkish; follow the same intent as a strict job-vs-CV audit.
- recommendations: ALWAYS Turkish strings.
- updatedExperience must include ALL roles; never change position/company/dates/locations; rewrite bullet content only.
- Do not use the target company's name as if the candidate worked there.

STEP 3 — coverLetterBody (only if requested):
Requested: ${p.generateCoverLetter ? 'YES' : 'NO'}
${p.generateCoverLetter ? `Target information for cover letter:\n${coverTargetBlock}\n` : ''}
If YES:
- English cover letter body WITHOUT signature/contact block (app will append).
- Header line format: "${targetPositionClean || '[Title from parsedCV]'}" optionally with " - [Recipient company]" ONLY if recipient company name is provided: ${recipientCompanyNameClean || 'none'}.
- Greeting MUST be exactly: ${englishGreeting}
- 250-350 words total INCLUDING the signature block the app will append (~20-30 words) — keep body shorter accordingly.
- Plain text, no markdown, no bullet lists.
- Do NOT name technologies unless they appear in the cover letter target text above (posting/company text). CV-only stacks must not be named if absent from target text.
- Final sentence MUST be exactly: "I would welcome the opportunity to discuss how my skills can support your team in this role."
- Do NOT include phone/email/LinkedIn/GitHub/address or "Best regards".
- If no recipient company name is provided, DO NOT invent company names and DO NOT output "[company]".
- Enforce manual must / must-not topics.
If NO: coverLetterBody must be "".

STEP 4 — linkedinMessageBody (only if requested):
Requested: ${p.generateLinkedInMessage ? 'YES' : 'NO'}
${p.generateLinkedInMessage ? `Target information for LinkedIn message:\n${linkedinTargetBlock}\n` : ''}
If YES:
- English, 50-70 words for MESSAGE BODY only (signature not included; app appends).
- First line MUST be exactly: ${englishGreeting}
- 1-2 short paragraphs after greeting; plain text; no bullets; no markdown.
- Same honesty + target-only tech naming rules as cover letter.
- Reference at least 2 concrete requirements from the LinkedIn target text with CV-grounded matches.
- Final sentence MUST be exactly: "I'd welcome a quick conversation if there's a good fit."
- No contact details / no sign-off.
- If no recipient company name is provided, DO NOT invent company names and DO NOT output "[company]".
If NO: linkedinMessageBody must be "".

CRITICAL: Output valid JSON only. No markdown. No commentary.
`;
  }

  return `
Aşağıdaki CV metnini TEK yanıtta işle. ${jsonShape}

GENEL DİL: parsedCV ve analysis içindeki uyarlanmış metinler Türkçe olmalı (cvLanguage=turkish).
İstisna: recommendations dizisindeki HER metin daima Türkçe olmalı.

CV Metni:
${p.cvText}

Uyarlama hedefi (${adaptationSource === 'text' ? 'ilan metni' : 'şirket'}):
${targetInfoForAdaptation}

Opsiyonel şirket URL bağlamı (boş olabilir): ${p.companyUrl || 'yok'}

Manuel bahsedilsin konuları: ${manualMustMention.length ? manualMustMention.join(', ') : 'yok'}
Manuel bahsedilmesin konuları: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'yok'}
Tercih edilen hedef pozisyon (outreach başlığı; zayıfsa parsedCV.personalInfo.title kullan): ${targetPositionClean || 'parsedCV.personalInfo.title üzerinden türet'}

${aboutForOutreachRule}

ADIM 1 — parsedCV:
CV metninden yapılandırılmış veri çıkar.
- Tarihler YYYY-MM; devam edenler "Present".
- Tüm iş deneyimi ve eğitim kayıtları ayrı elemanlar.
- skills: kısa isimler dizisi; languages: {id, language, level}.
- personalInfo: CV’de geçen e-posta/telefon/url’leri doğru aktar.
- Uydurma yok.

ADIM 2 — analysis:
CV’yi hedefe göre analiz et ve uyarla.
Sert kurallar:
- İlan/şirket metnindeki deneyim yılı aralıklarını asla yazma.
- Deneyim süresi gerekiyorsa yalnızca parsedCV.workExperience tarihlerinden türet; belirsizse yıl yazma.
- CV metninde kanıtı olmayan yetkinlik/deneyim iddia etme.
- positiveMatches / negativeMismatches: label ve evidence/gap Türkçe; sahte kanıt yok.
- recommendations: her zaman Türkçe.
- updatedExperience: tüm roller dahil; pozisyon/şirket/tarih/lokasyon değişmez; yalnızca bullet içerikleri yeniden yazılır.
- Hedef şirkette çalışıyormuş gibi yazma.

ADIM 3 — coverLetterBody (istek):
İsteniyor mu: ${p.generateCoverLetter ? 'EVET' : 'HAYIR'}
${p.generateCoverLetter ? `Cover letter hedef bilgisi:\n${coverTargetBlock}\n` : ''}
EVET ise:
- Türkçe gövde; imza/iletişim YOK (uygulama ekleyecek).
- Başlık formatı: ${targetPositionClean || '[parsedCV ünvanı]'}${recipientCompanyNameClean ? ` - ${recipientCompanyNameClean}` : ''} (şirket adı yoksa başlıkta şirket uydurma, "[company]" yok).
- Selamlama satırı TAM olarak: ${turkishGreeting}
- TOPLAM 250-350 kelime (uygulamanın ekleyeceği imza dahil) — gövdeyi buna göre kısalt.
- Düz metin; markdown yok; madde listesi yok.
- Teknoloji adı yalnızca cover hedef metninde geçiyorsa; CV’de olup ilanda olmayan stack isimlerini yazma.
- Son cümle TAM olarak: "Bu rol kapsamında ekibinize nasıl katkı sağlayabileceğimi görüşme fırsatını memnuniyetle değerlendiririm."
- Telefon/e-posta/LinkedIn/GitHub/adres veya "Best regards" yazma.
- Manuel konu kurallarına uy.
HAYIR ise: coverLetterBody = "".

ADIM 4 — linkedinMessageBody (istek):
İsteniyor mu: ${p.generateLinkedInMessage ? 'EVET' : 'HAYIR'}
${p.generateLinkedInMessage ? `LinkedIn mesaj hedef bilgisi:\n${linkedinTargetBlock}\n` : ''}
EVET ise:
- Türkçe; yalnızca gövde 50-70 kelime (imza hariç; uygulama ekler).
- İlk satır TAM olarak: ${turkishGreeting}
- Selamlamadan sonra en fazla 2 kısa paragraf; düz metin; madde yok.
- Cover letter ile aynı kanıt ve hedef-metinde-geçen-teknoloji kuralları.
- Hedef metinden en az 2 somut gereklilik + CV kanıtıyla kısa eşleşme.
- Son cümle TAM olarak: "Uygun olursa kısa bir görüşmeyi memnuniyetle değerlendiririm."
- İletişim/imza yok; şirket adı yoksa uydurma yok; "[company]" yok.
HAYIR ise: linkedinMessageBody = "".

KRİTİK: Yalnızca geçerli JSON döndür. Markdown yok. Açıklama metni yok.
`;
}
