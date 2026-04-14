/**
 * Çoklu akıştaki cover letter + LinkedIn prompt metinleri — tek kaynak.
 * `generateCompanyCoverLetter` / `generateCompanyLinkedInMessage` bu stringleri kullanır.
 */
import type { CompanyBasedCVData, CompanyInfo } from './types';
import { sanitizeRoleTitleForPrompt } from './legacyParseAndAdaptPrompts';

export interface CompanyCoverLetterPromptParams {
  source: 'company' | 'text';
  companyInfo?: CompanyInfo;
  jobDescriptionText?: string;
  personalInfo?: Partial<CompanyBasedCVData['personalInfo']>;
  about?: string;
  cvLanguage?: 'turkish' | 'english';
  candidateExperienceYears?: number | null;
  candidateSkills?: string[];
  candidateHighlights?: string[];
  recipientName?: string;
  recipientCompanyName?: string;
  targetPosition?: string;
  manualMustMentionTopics?: string[];
  manualMustNotMentionTopics?: string[];
}

export type CompanyCoverLetterPromptOptions = {
  /** Tek çağrılık birleşik akış: aday alanları TASK A/B JSON çıktısından okunur. */
  bundleFieldHints?: boolean;
  bundleAboutSource?: 'parsedCV.about' | 'analysis.updatedAbout';
};

export interface CompanyLinkedInPromptParams extends CompanyCoverLetterPromptParams {}

export type CompanyLinkedInPromptOptions = CompanyCoverLetterPromptOptions;

function buildBundleCoverCandidateBlock(
  isEnglish: boolean,
  bundleAboutSource: 'parsedCV.about' | 'analysis.updatedAbout'
): string {
  if (isEnglish) {
    return `
      Candidate Information (SINGLE-BUNDLED JSON — read from YOUR OWN structured outputs in this response; same semantics as multi-step after parse+adapt):
      - Full Name: concatenate parsedCV.personalInfo.firstName + " " + parsedCV.personalInfo.lastName
      - Title: parsedCV.personalInfo.title
      - City/Country: parsedCV.personalInfo.city + ", " + parsedCV.personalInfo.country
      - About: ${bundleAboutSource} (must match the UI rule: use adapted about only when that field is selected)
      - Candidate Skills (comma list): join parsedCV.skills array items (same as legacy structured skills list)
      - Candidate CV highlights: pick up to 8 lines from parsedCV.workExperience[*].bulletPoints, prefer bullets containing digits or "%" when possible (same selection spirit as legacy pipeline)
      `;
  }
  return `
      Aday Bilgileri (TEK JSON — bu yanıtta ürettiğin yapılandırılmış çıktılardan oku; çoklu akışta parse+uyarlama sonrasıyla aynı anlam):
      - Ad Soyad: parsedCV.personalInfo.firstName + " " + parsedCV.personalInfo.lastName
      - Ünvan: parsedCV.personalInfo.title
      - Şehir/Ülke: parsedCV.personalInfo.city + ", " + parsedCV.personalInfo.country
      - Hakkımda: ${bundleAboutSource} (UI kuralıyla aynı: yalnızca seçiliyse uyarlanmış about)
      - Aday becerileri (virgüllü): parsedCV.skills dizisini birleştir (çoklu akıştaki yapılandırılmış liste ile aynı)
      - Aday CV highlightları: parsedCV.workExperience[*].bulletPoints içinden en fazla 8 satır; mümkünse rakam veya % içerenleri tercih et (çoklu akıştaki seçim mantığıyla aynı)
      `;
}

/** `generateCompanyCoverLetter` içindeki prompt ile birebir aynı metin. */
export function buildCompanyCoverLetterPrompt(
  params: CompanyCoverLetterPromptParams,
  options?: CompanyCoverLetterPromptOptions
): string {
  const {
    source,
    companyInfo,
    jobDescriptionText,
    personalInfo,
    about,
    cvLanguage = 'turkish',
    candidateExperienceYears = null,
    candidateSkills,
    candidateHighlights,
    recipientName,
    recipientCompanyName,
    targetPosition,
    manualMustMentionTopics,
    manualMustNotMentionTopics
  } = params;

  const isEnglish = cvLanguage === 'english';
  const bundleFieldHints = Boolean(options?.bundleFieldHints);
  const bundleAboutSource = options?.bundleAboutSource || 'parsedCV.about';

  const targetPositionClean = sanitizeRoleTitleForPrompt(targetPosition) || 'Full Stack Web Developer';
  const recipientNameClean = recipientName?.trim() ? recipientName.trim() : undefined;
  const recipientCompanyNameClean = recipientCompanyName?.trim() ? recipientCompanyName.trim() : undefined;
  const headerFormatRule = recipientCompanyNameClean
    ? `"${targetPositionClean} - ${recipientCompanyNameClean}"`
    : `"${targetPositionClean}"`;
  const englishGreeting = recipientNameClean ? `Dear ${recipientNameClean},` : 'Dear Hiring Team,';
  const turkishGreeting = recipientNameClean ? `Sayın ${recipientNameClean},` : 'Sayın İşe Alma Ekibi,';
  const candidateSkillsBlock = bundleFieldHints
    ? '(Derive from parsedCV.skills in your TASK A JSON output; comma-separated.)'
    : Array.isArray(candidateSkills) && candidateSkills.length > 0
      ? candidateSkills.join(', ')
      : 'N/A';

  const highlightsBlock = bundleFieldHints
    ? '(Derive from parsedCV.workExperience bulletPoints as described in Candidate Information above.)'
    : Array.isArray(candidateHighlights) && candidateHighlights.length > 0
      ? candidateHighlights.slice(0, 8).join('\n')
      : '';
  const manualMustMention = Array.isArray(manualMustMentionTopics) ? manualMustMentionTopics.filter(Boolean) : [];
  const manualMustNotMention = Array.isArray(manualMustNotMentionTopics) ? manualMustNotMentionTopics.filter(Boolean) : [];

  const candidateExperienceRule = bundleFieldHints
    ? isEnglish
      ? 'Infer whether to mention years ONLY from parsedCV employment dates (same discipline as multi-step). If unclear, do not mention years.'
      : 'Deneyim yılından bahsedip bahsetmeyi yalnızca parsedCV iş tarihlerinden çıkar (çoklu akışla aynı). Belirsizse yıl yazma.'
    : candidateExperienceYears !== null && candidateExperienceYears !== undefined
      ? `Candidate experience duration (from CV): exactly ${candidateExperienceYears} years. Do not mention any other experience duration.`
      : `Candidate experience duration is unknown from structured data. Do not mention any experience years.`;

  const targetInfoBlock =
    source === 'text'
      ? `Job Description Text:\n${jobDescriptionText || 'Job description text is missing.'}`
      : `Target Company Information:\n${
          companyInfo
            ? `- Company Name: ${companyInfo.name}\n- Industry: ${companyInfo.industry}\n- Description: ${companyInfo.description}\n- Values: ${(companyInfo.values || []).join(', ')}\n- Requirements: ${(companyInfo.requirements || []).join(', ')}\n- Culture: ${companyInfo.culture || ''}`
            : '- Company information is missing.'
        }`;

  const candidateInfoBlock = bundleFieldHints
    ? buildBundleCoverCandidateBlock(isEnglish, bundleAboutSource)
    : isEnglish
      ? `
      Candidate Information:
      - Full Name: ${(personalInfo?.firstName || '').trim()} ${(personalInfo?.lastName || '').trim()}
      - Title: ${personalInfo?.title || ''}
      - Target Position for header/body (MUST USE): ${targetPositionClean}
      - City/Country: ${personalInfo?.city || ''}, ${personalInfo?.country || ''}
      - About: ${about || ''}
      - Recipient name (optional): ${recipientNameClean || 'none'}
      - Company name (optional): ${recipientCompanyNameClean || 'none'}
      - Manual must mention topics: ${manualMustMention.length ? manualMustMention.join(', ') : 'none'}
      - Manual must NOT mention topics: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'none'}
      `
      : `
      Aday Bilgileri:
      - Ad Soyad: ${(personalInfo?.firstName || '').trim()} ${(personalInfo?.lastName || '').trim()}
      - Ünvan: ${personalInfo?.title || ''}
      - Başlık/gövde için hedef pozisyon (MUTLAKA KULLAN): ${targetPositionClean}
      - Şehir/Ülke: ${personalInfo?.city || ''}, ${personalInfo?.country || ''}
      - Hakkımda: ${about || ''}
      - Alıcı adı (opsiyonel): ${recipientNameClean || 'yok'}
      - Alıcı şirket adı (opsiyonel): ${recipientCompanyNameClean || 'yok'}
      - Manuel bahsedilsin konuları: ${manualMustMention.length ? manualMustMention.join(', ') : 'yok'}
      - Manuel bahsedilmesin konuları: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'yok'}
      `;

  return isEnglish
    ? `
      Write a professional, concise, and persuasive cover letter tailored to the provided target.

      ${targetInfoBlock}

      ${candidateInfoBlock}

      Candidate constraints (MUST NOT VIOLATE):
      - Do NOT mention any experience years/range from the job posting/company requirements.
      - ${candidateExperienceRule}
      - Never claim the candidate has any skill/technology/qualification that is not present in the CV text.
      - Candidate Skills (from CV, if available): ${candidateSkillsBlock}
      - If the job mentions preferred qualifications, mention them ONLY if supported by the CV text.
      - TARGET-ONLY NAMED TECH (CRITICAL): In the letter body, do NOT name any programming language, framework, library, database, cloud vendor, or tool unless that item (or a synonym explicitly used in the same target text, e.g. "JS" only if the posting says JavaScript/JS) appears in the job posting / target information above. Even if the CV lists Node.js, Next.js, .NET, MongoDB, etc., you MUST NOT mention them if the employer's text does not. Never imply the employer asked for a stack they did not cite. Align claims to the employer's stated requirements (e.g. Python, Django, React, PostgreSQL when those appear in the posting). You may describe outcomes (integrations, APIs, reliability, security mindset) without naming CV-only technologies the target text omits.

      Rules:
      1. Language: English.
      1.1 CRITICAL: Output must be fully in English only. Do not include Turkish words/sentences.
      2. Length: 250-350 words TOTAL, including the closing and contact/signature block that will be appended by the app.
         - Assume signature block is ~20-30 words, so keep the letter body concise enough to stay within 250-350 total words.
      3. Paragraph structure: exactly 3-4 paragraphs for the letter body.
         - Paragraph 1: application + role fit
         - Paragraph 2: relevant experience + quantified results
         - Paragraph 3 (and optional 4th): motivation + concise closing
      3. Professional tone and highly persuasive but realistic.
      4. Must market the candidate without exaggeration.
      5. Must be tailored: use keywords and requirements that actually appear in the target text; explicitly connect them to CV evidence. Do not pad with technologies from the CV that the target text never mentions.
      VERY IMPORTANT: Directly address the job requirements mentioned in the job posting/target text.
      - In the body, explicitly reference at least 3 concrete job requirements.
      - For each referenced requirement, show how the candidate's skills and experience match or solve it (use only CV evidence; do not invent).
      - Focus on the employer's needs and outcomes, not just your general background.
      6. If the job mentions technologies you do NOT see in the CV text/skills (e.g., Angular/Azure), you MUST NOT claim experience. You may only mention eagerness to learn/adapt in this environment.
      7. Structure + formatting (plain text, NO markdown):
         - Include a simple header line at the top with this exact format: ${headerFormatRule}
         - NEVER use "Founding" as the main role title in header unless it is explicitly provided as targetPosition.
         - VERY IMPORTANT: If no company name is provided, DO NOT write any company name and DO NOT use "[company]" placeholder anywhere.
         - Include greeting: The greeting line MUST be exactly: ${englishGreeting}
         - Opening paragraph: state the position and direct fit to the role.
         - Body: stay in 3-4 paragraph total structure.
         - Closing paragraph: reconfirm interest and thank them.
         - Do NOT use bullet lists.
         - Do not write headings like "Body" or "Closing".
      8. Highlights facts:
         - Use only the provided Candidate CV highlights for achievements/metrics (if present). Do not invent numbers.
         - Candidate CV highlights (facts only):
           ${highlightsBlock || 'N/A'}
      8.1 Manual topic enforcement:
         - MUST include all "Manual must mention topics".
         - MUST NOT include any "Manual must NOT mention topics".
         - If a must-mention topic is not supported by CV facts, mention it as interest/learning/adaptation only (no fake claims).
      - Manual topics can be Turkish/English mixed; in English output, rewrite all manual topics in natural English only (no Turkish sentence allowed).
      9. Call-to-action: The final sentence MUST be exactly:
         "I would welcome the opportunity to discuss how my skills can support your team in this role."
      10. Do not repeat the same idea/phrase more than once (e.g., duplicated "I am confident", "I believe", "I am eager").
      11. Do NOT use these phrases: "I invite you to contact me".
      12. Do NOT include any signature block text (do not write "Best regards," and do not add contact details). The app will append the signature.
      13. Return only the final cover letter text (without signature).
      `
    : `
      Verilen hedefe göre, profesyonel, kısa ve etkileyici bir ön yazı (cover letter) hazırla.

      ${targetInfoBlock}

      ${candidateInfoBlock}

      Aday kısıtları (UYULMALI):
      - İlan/şirket gerekliliklerindeki deneyim yılı aralıklarını asla yazma (ör. “4-5 yıl” gibi).
      - ${candidateExperienceRule}
      - Adayın CV’sinde geçmeyen hiçbir yetkinlik/teknoloji/nitelik iddia etme.
      - CV’den elde edilen aday becerileri (varsa): ${candidateSkillsBlock}
      - Tercihler (preferred qualifications) yalnızca CV metniyle destekleniyorsa eklenebilir.
      - HEDEF METNİNDE GEÇENLER (KRİTİK): Kapak yazısı gövdesinde programlama dili, framework, veritabanı, bulut ürünü veya araç adı YALNIZCA yukarıdaki ilan / hedef metninde (veya aynı metinde açıkça kullanılan eşanlamlıda) geçiyorsa yazılabilir. CV’de Node.js, .NET, MongoDB vb. olsa bile ilanda geçmiyorsa bu isimleri kullanma; işverenin sormadığı stack’i sormuş gibi yazma. Uyumu işverenin yazdığı gereksinimlerle kur (ör. ilanda Python, Django, React, PostgreSQL geçiyorsa onlara odaklan). İlanda olmayan teknoloji adlarını vermeden sonuç/entegrasyon/kalite gibi ifadelerle anlatım yapılabilir.

      Kurallar:
      1. Dil: Türkçe.
      1.1 KRİTİK: Çıktı tamamen Türkçe olmalı. İngilizce cümle/paragraf kullanma.
      2. Uzunluk: TOPLAM 250-350 kelime olacak (imza/iletişim bloğu dahil).
         - Uygulama imza bloğunu sona eklediği için, gövdeyi bu sınıra göre kısa ve net tut.
      3. Paragraf yapısı: gövde tam 3-4 paragraf olmalı.
         - Paragraf 1: başvuru + pozisyona uyum
         - Paragraf 2: deneyim + ölçülebilir sonuçlar
         - Paragraf 3 (opsiyonel 4): motivasyon + kısa kapanış
      3. Ton: Profesyonel, akıcı, ikna edici.
      4. Adayı pazarlasın ama abartı ve gerçek dışı ifade kullanmasın.
      5. Her ilana göre özelleştir: yalnızca ilan/hedef metninde geçen anahtar kelime ve gereksinimleri kullan; CV’de olup ilanda geçmeyen teknoloji adlarıyla doldurma.
      VERY IMPORTANT: Kapak yazısında iş ilanındaki gereklilikleri DOĞRUDAN ele al.
      - Gövdede, ilan metninden en az 3 somut gerekliliği açıkça referansla.
      - Her gereklilik için adayın becerileri/deneyimi nasıl eşleşiyor ya da nasıl çözüm sağlıyor göster (yalnızca CV kanıtlarını kullan; uydurma yapma).
      - Sadece kendi geçmişini anlatma; işverenin ihtiyaçlarına ve beklenen sonuca odaklan.
      6. Job ilanında geçen ve CV’de açıkça olmayan teknolojiler için (ör. Angular/Azure) deneyim iddia etme. Sadece bu ortamda öğrenmeye/adapte olmaya hevesli olduğunu söyleyebilirsin.
      7. Yapı + biçim (düz metin, NO markdown):
         - En üstte basit başlık satırı: "[Pozisyon] - [Şirket]"
         - Başlık satırı şu formatla birebir uyumlu olmalı: ${headerFormatRule}
         - Hedef pozisyon dışında farklı bir rol adı yazma.
         - VERY IMPORTANT: Eğer alıcı şirket adı verilmediyse, hiçbir şirket adını yazma ve "[company]" placeholder kullanma.
         - Selamlama: Selamlama satırı MUST be exactly: ${turkishGreeting}
         - Açılış paragrafı: pozisyonu ve role uyumu net belirt.
         - Gövde: toplam 3-4 paragraf yapısında kal.
         - Kapanış: ilgini yeniden belirt ve zaman ayırdıkları için teşekkür et.
         - Madde işareti/bullet list kullanma.
         - "Body", "Closing" gibi başlıklar yazma.
      8. Aday CV kanıtları:
         - Başarı/iddialar için yalnızca sağlanan aday CV highlightlarını kullan. Rakam/başarı uydurma.
         - Aday CV highlightları (yalnızca kanıt):
           ${highlightsBlock || 'N/A'}
      8.1 Manuel konu zorunluluğu:
         - "Manuel bahsedilsin konuları" mutlaka geçsin.
         - "Manuel bahsedilmesin konuları" kesinlikle geçmesin.
         - Eğer "bahsedilsin" konusu CV ile desteklenmiyorsa, sadece ilgi/öğrenme/adapte olma şeklinde yaz; asla sahte deneyim iddia etme.
      - Manuel konular İngilizce/Türkçe karışık gelebilir; Türkçe çıktı üretirken anlamı koruyarak TÜMÜNÜ doğal Türkçeye çevir, farklı dilde cümleyi aynen kopyalama.
      9. Call-to-action: Son cümlede şu kapanış olsun:
         "Bu rol kapsamında ekibinize nasıl katkı sağlayabileceğimi görüşme fırsatını memnuniyetle değerlendiririm."
      10. Aynı fikri/ifade kalıbını tekrar etme (örn. iki kez "eminim", "inanıyorum", "istekliyim" gibi).
      11. "Benimle iletişime geçmenizi rica ederim" gibi ifadeler kullanma.
      12. "Best regards," ve iletişim imzasını yazma; app sonuna ekleyecek.
      13. Sadece nihai ön yazı metnini döndür (imzasız).
      `;
}

function buildBundleLinkedInCandidateBlock(
  isEnglish: boolean,
  bundleAboutSource: 'parsedCV.about' | 'analysis.updatedAbout'
): string {
  if (isEnglish) {
    return `
      Candidate Information (SINGLE-BUNDLED JSON — read from YOUR OWN structured outputs in this response; same semantics as multi-step after parse+adapt):
      - Full Name: concatenate parsedCV.personalInfo.firstName + " " + parsedCV.personalInfo.lastName
      - Title: parsedCV.personalInfo.title
      - City/Country: parsedCV.personalInfo.city + ", " + parsedCV.personalInfo.country
      - About: ${bundleAboutSource}
      - Candidate Skills (comma list): join parsedCV.skills array items
      - Candidate CV highlights: pick up to 8 lines from parsedCV.workExperience[*].bulletPoints, prefer numeric/% bullets when possible
      `;
  }
  return `
      Aday bilgileri (TEK JSON — bu yanıtta ürettiğin yapılandırılmış çıktılardan oku; çoklu akışla aynı anlam):
      - Ad Soyad: parsedCV.personalInfo.firstName + " " + parsedCV.personalInfo.lastName
      - Ünvan: parsedCV.personalInfo.title
      - Şehir/Ülke: parsedCV.personalInfo.city + ", " + parsedCV.personalInfo.country
      - Hakkımda: ${bundleAboutSource}
      - Aday becerileri: parsedCV.skills birleştir
      - Aday CV highlightları: parsedCV.workExperience bulletPoints üzerinden en fazla 8 satır; mümkünse rakam/% öncelikli
      `;
}

/** `generateCompanyLinkedInMessage` içindeki prompt ile birebir aynı metin. */
export function buildCompanyLinkedInMessagePrompt(
  params: CompanyLinkedInPromptParams,
  options?: CompanyLinkedInPromptOptions
): string {
  const {
    source,
    companyInfo,
    jobDescriptionText,
    personalInfo,
    about,
    cvLanguage = 'turkish',
    candidateExperienceYears = null,
    candidateSkills,
    candidateHighlights,
    recipientName,
    recipientCompanyName,
    targetPosition,
    manualMustMentionTopics,
    manualMustNotMentionTopics
  } = params;

  const isEnglish = cvLanguage === 'english';
  const bundleFieldHints = Boolean(options?.bundleFieldHints);
  const bundleAboutSource = options?.bundleAboutSource || 'parsedCV.about';

  const targetPositionClean = sanitizeRoleTitleForPrompt(targetPosition) || 'Full Stack Web Developer';
  const recipientNameClean = recipientName?.trim() ? recipientName.trim() : undefined;
  const recipientCompanyNameClean = recipientCompanyName?.trim() ? recipientCompanyName.trim() : undefined;
  const englishGreeting = recipientNameClean ? `Dear ${recipientNameClean},` : 'Dear Hiring Team,';
  const turkishGreeting = recipientNameClean ? `Sayın ${recipientNameClean},` : 'Sayın İşe Alma Ekibi,';
  const candidateSkillsBlock = bundleFieldHints
    ? '(Derive from parsedCV.skills in your TASK A JSON output; comma-separated.)'
    : Array.isArray(candidateSkills) && candidateSkills.length > 0
      ? candidateSkills.join(', ')
      : 'N/A';

  const highlightsBlock = bundleFieldHints
    ? '(Derive from parsedCV.workExperience bulletPoints as described in Candidate Information above.)'
    : Array.isArray(candidateHighlights) && candidateHighlights.length > 0
      ? candidateHighlights.slice(0, 8).join('\n')
      : '';
  const manualMustMention = Array.isArray(manualMustMentionTopics) ? manualMustMentionTopics.filter(Boolean) : [];
  const manualMustNotMention = Array.isArray(manualMustNotMentionTopics) ? manualMustNotMentionTopics.filter(Boolean) : [];

  const candidateExperienceRule = bundleFieldHints
    ? isEnglish
      ? 'Infer whether to mention years ONLY from parsedCV employment dates (same discipline as multi-step). If unclear, do not mention years.'
      : 'Deneyim yılından bahsedip bahsetmeyi yalnızca parsedCV iş tarihlerinden çıkar (çoklu akışla aynı). Belirsizse yıl yazma.'
    : candidateExperienceYears !== null && candidateExperienceYears !== undefined
      ? `Candidate experience duration (from CV): exactly ${candidateExperienceYears} years. Do not mention any other experience duration.`
      : `Candidate experience duration is unknown from structured data. Do not mention any experience years.`;

  const targetInfoBlock =
    source === 'text'
      ? `Job Description Text:\n${jobDescriptionText || 'Job description text is missing.'}`
      : `Target Company Information:\n${
          companyInfo
            ? `- Company Name: ${companyInfo.name}\n- Industry: ${companyInfo.industry}\n- Description: ${companyInfo.description}\n- Values: ${(companyInfo.values || []).join(', ')}\n- Requirements: ${(companyInfo.requirements || []).join(', ')}\n- Culture: ${companyInfo.culture || ''}`
            : '- Company information is missing.'
        }`;

  const candidateInfoBlock = bundleFieldHints
    ? buildBundleLinkedInCandidateBlock(isEnglish, bundleAboutSource)
    : isEnglish
      ? `
      Candidate Information (for tailoring only — do not put contact details in the body; the app appends a signature):
      - Full Name: ${(personalInfo?.firstName || '').trim()} ${(personalInfo?.lastName || '').trim()}
      - Title: ${personalInfo?.title || ''}
      - Target role to reference in the message (MUST USE): ${targetPositionClean}
      - City/Country: ${personalInfo?.city || ''}, ${personalInfo?.country || ''}
      - About: ${about || ''}
      - Recipient name (optional): ${recipientNameClean || 'none'}
      - Company name (optional): ${recipientCompanyNameClean || 'none'}
      - Manual must mention topics: ${manualMustMention.length ? manualMustMention.join(', ') : 'none'}
      - Manual must NOT mention topics: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'none'}
      `
      : `
      Aday bilgileri (yalnızca bağlam; gövdede iletişim yazma — uygulama imza ekler):
      - Ad Soyad: ${(personalInfo?.firstName || '').trim()} ${(personalInfo?.lastName || '').trim()}
      - Ünvan: ${personalInfo?.title || ''}
      - Mesajda referans verilecek hedef rol (MUTLAKA KULLAN): ${targetPositionClean}
      - Şehir/Ülke: ${personalInfo?.city || ''}, ${personalInfo?.country || ''}
      - Hakkımda: ${about || ''}
      - Alıcı adı (opsiyonel): ${recipientNameClean || 'yok'}
      - Alıcı şirket adı (opsiyonel): ${recipientCompanyNameClean || 'yok'}
      - Manuel bahsedilsin konuları: ${manualMustMention.length ? manualMustMention.join(', ') : 'yok'}
      - Manuel bahsedilmesin konuları: ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'yok'}
      `;

  return isEnglish
    ? `
      Write a short LinkedIn outreach message (connection/DM style) tailored to the provided target.
      Apply the SAME evidence and honesty rules as a formal cover letter, but compressed for LinkedIn.

      ${targetInfoBlock}

      ${candidateInfoBlock}

      Candidate constraints (MUST NOT VIOLATE):
      - Do NOT mention any experience years/range from the job posting/company requirements.
      - ${candidateExperienceRule}
      - Never claim the candidate has any skill/technology/qualification that is not present in the CV text.
      - Candidate Skills (from CV, if available): ${candidateSkillsBlock}
      - If the job mentions preferred qualifications, mention them ONLY if supported by the CV text.
      - TARGET-ONLY NAMED TECH (CRITICAL): Same as cover letter — in the message body, do NOT name any programming language, framework, database, cloud vendor, or tool unless it (or an explicit synonym in the same target text) appears in the job posting / target information above. CV-only stacks (e.g. Node.js if the posting does not mention Node) must not appear. Align briefly to the employer's stated stack only.

      Rules:
      1. Language: English only. No Turkish.
      2. Length: 50-70 words for the MESSAGE BODY ONLY (hard requirement).
         - The app will append a separate contact/signature block after your text (same style as cover letter). Do NOT write that block yourself.
         - The appended signature/contact block does NOT count toward the 50-70 word limit — keep the body strictly within 50-70 words regardless.
      3. This is NOT an email/cover letter: no letterhead line, no formal multi-paragraph essay.
         - After the greeting line, use 1-2 short paragraphs (max 2).
      4. Tone: professional, warm, persuasive but realistic.
      5. Tailor tightly: use only keywords/requirements that appear in the target text; connect them to CV evidence. Do not name CV-only technologies the posting omits.
      VERY IMPORTANT: Reference at least 2 concrete requirements from the job posting/target text.
      - For each, show a brief match using ONLY CV evidence (no invention).
      6. If the job mentions technologies you do NOT see in the CV text/skills, you MUST NOT claim experience. You may only mention willingness to learn/adapt.
      7. Formatting: plain text only, NO markdown, NO bullet lists, NO numbered lists.
      8. Greeting: The first line MUST be exactly: ${englishGreeting}
      9. Highlights facts:
         - Use only the provided Candidate CV highlights for achievements/metrics (if present). Do not invent numbers.
         - Candidate CV highlights (facts only):
           ${highlightsBlock || 'N/A'}
      9.1 Manual topic enforcement:
         - MUST include all "Manual must mention topics" (briefly).
         - MUST NOT include any "Manual must NOT mention topics".
         - If a must-mention topic is not supported by CV facts, mention it as interest/learning/adaptation only (no fake claims).
      - Manual topics can be Turkish/English mixed; in English output, rewrite all manual topics in natural English only.
      10. Call-to-action: The final sentence MUST be exactly:
          "I'd welcome a quick conversation if there's a good fit."
      11. Do not repeat the same idea/phrase more than once.
      12. Do NOT use: "I invite you to contact me".
      13. CRITICAL — Body only: Do NOT include phone, email, LinkedIn URL, portfolio/GitHub URLs, mailing address, or any sign-off ("Best regards", name line). The app appends the signature. Your output must end with the required CTA sentence.
      14. VERY IMPORTANT: If no company name is provided, DO NOT invent a company name and DO NOT use "[company]" placeholder.
      15. Return only the message body text (no signature).
      `
    : `
      Verilen hedefe göre LinkedIn üzerinden gönderilecek kısa, profesyonel bir mesaj yaz.
      Kurallar cover letter ile aynı kanıt/dürüstlük çerçevesindedir; biçim LinkedIn mesajına uygundur.

      ${targetInfoBlock}

      ${candidateInfoBlock}

      Aday kısıtları (UYULMALI):
      - İlan/şirket gerekliliklerindeki deneyim yılı aralıklarını asla yazma.
      - ${candidateExperienceRule}
      - Adayın CV’sinde geçmeyen hiçbir yetkinlik/teknoloji/nitelik iddia etme.
      - CV’den elde edilen aday becerileri (varsa): ${candidateSkillsBlock}
      - Tercihler yalnızca CV metniyle destekleniyorsa eklenebilir.
      - HEDEF METNİNDE GEÇENLER (KRİTİK): Cover letter ile aynı — mesaj gövdesinde teknoloji/araç adı yalnızca ilan veya hedef metinde geçiyorsa yaz; CV’de olup ilanda olmayanları (ör. Node.js) yazma.

      Kurallar:
      1. Dil: Türkçe. İngilizce cümle kullanma.
      2. Uzunluk: Yalnızca MESAJ GÖVDESİ 50-70 kelime olacak (zorunlu).
         - Uygulama, cover letter ile aynı biçimde ayrı bir iletişim/imza bloğunu sona ekleyecek; sen o bloğu yazma.
         - Eklenen imza/iletişim kelime sayısına dahil edilmez — gövde her durumda 50-70 kelime aralığında kalmalıdır.
      3. Bu bir e-posta veya kapak yazısı değil: üstte formal başlık satırı yok; selamlamadan sonra en fazla 2 kısa paragraf.
      4. Ton: profesyonel, sıcak, ikna edici ama gerçekçi.
      5. Hedef metinde geçen anahtar kelime ve gereksinimleri kullan; CV kanıtıyla bağla. İlanda geçmeyen teknoloji adlarını ekleme.
      VERY IMPORTANT: İlan/hedeften en az 2 somut gerekliliği açıkça referansla; her biri için yalnızca CV kanıtıyla kısa eşleşme göster (uydurma yok).
      6. CV’de olmayan teknolojiler için deneyim iddia etme; yalnızca öğrenme/adapte olma hevesinden bahsedebilirsin.
      7. Biçim: düz metin, markdown yok, madde işareti yok, numaralı liste yok.
      8. Selamlama: İlk satır TAM olarak şu olmalı: ${turkishGreeting}
      9. Aday CV kanıtları:
         - Başarı/iddialar için yalnızca sağlanan highlightları kullan. Rakam uydurma.
         - Aday CV highlightları:
           ${highlightsBlock || 'N/A'}
      9.1 Manuel konu zorunluluğu:
         - "Manuel bahsedilsin konuları" mutlaka geçsin (kısaca).
         - "Manuel bahsedilmesin konuları" kesinlikle geçmesin.
         - CV ile desteklenmiyorsa yalnızca ilgi/öğrenme/adapte olma şeklinde yaz.
      - Manuel konular karışık gelebilir; çıktıda tümünü doğal Türkçeye çevir.
      10. Son cümle TAM olarak şu olsun:
          "Uygun olursa kısa bir görüşmeyi memnuniyetle değerlendiririm."
      11. Aynı fikri/ifadeyi tekrarlama.
      12. "Benimle iletişime geçmenizi rica ederim" gibi ifadeler kullanma.
      13. KRİTİK — Yalnızca gövde: Telefon, e-posta, LinkedIn/portfolio/GitHub linki, adres veya imza kapanışı yazma; uygulama ekleyecek. Çıktı zorunlu son cümleyle bitsin.
      14. VERY IMPORTANT: Alıcı şirket adı verilmediyse şirket adı uydurma ve "[company]" placeholder kullanma.
      15. Sadece gövde metnini döndür (imzasız).
      `;
}
