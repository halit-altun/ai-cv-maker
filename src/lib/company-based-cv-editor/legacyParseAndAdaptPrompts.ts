/**
 * Çoklu (legacy) Gemini akışındaki parse + uyarlama prompt metinleri — tek kaynak.
 * Tekli birleşik istek bu modülü birebir kullanır; yalnızca çağrı sayısı farklıdır.
 */
import type { CVAnalysisRequest, CompanyBasedUnifiedAnalysisParams } from './types';

export function sanitizeRoleTitleForPrompt(value: string | undefined): string {
  let role = (value || '').trim();
  role = role.replace(/^[\-\s:]+|[\-\s:]+$/g, '');
  role = role.replace(/\s+/g, ' ');
  role = role.replace(/^founding\s+/i, '');
  return role.trim();
}

export function mapUnifiedParamsToAdaptRequest(p: CompanyBasedUnifiedAnalysisParams): CVAnalysisRequest {
  return {
    cvText: p.cvText,
    companyUrl: p.adaptationSource === 'company' ? p.companyUrl : undefined,
    companyInfo: p.adaptationSource === 'company' ? p.companyInfo : undefined,
    jobDescriptionText: p.adaptationSource === 'text' ? p.jobDescriptionText : undefined,
    targetPosition: sanitizeRoleTitleForPrompt(p.targetPositionHint) || undefined,
    adaptationSource: p.adaptationSource,
    cvLanguage: p.cvLanguage,
    candidateExperienceYears: null,
    candidateExperienceRange: undefined,
    candidateSkills: [],
    candidateLanguages: [],
    manualMustMentionTopics: p.manualMustMentionTopics,
    manualMustNotMentionTopics: p.manualMustNotMentionTopics
  };
}

/** `parseCVDataWithAI` ile birebir aynı prompt. */
export function buildParseCvJsonPrompt(cvText: string, cvLanguage: 'turkish' | 'english'): string {
  const isEnglish = cvLanguage === 'english';
  return `
    ${isEnglish
      ? 'Analyze the CV text in detail and convert it to a structured JSON format.'
      : 'Aşağıdaki CV metnini detaylı olarak analiz et ve JSON formatında düzenli bir yapıya dönüştür.'}
    
    ${isEnglish ? 'CV Text' : 'CV Metni'}:
    ${cvText}
    
    ${isEnglish ? 'Please respond in this JSON format:' : 'Lütfen şu JSON formatında cevap ver:'}
    {
      "personalInfo": {
        "firstName": "${isEnglish ? 'First Name' : 'Ad'}",
        "lastName": "${isEnglish ? 'Last Name' : 'Soyad'}", 
        "title": "${isEnglish ? 'Title/Position' : 'Ünvan/Pozisyon'}",
        "country": "${isEnglish ? 'Country' : 'Ülke'}",
        "city": "${isEnglish ? 'City' : 'Şehir'}",
        "phone": "${isEnglish ? 'Phone' : 'Telefon'}",
        "email": "${isEnglish ? 'Email' : 'E-posta'}",
        "portfolio": "Portfolio URL",
        "github": "GitHub URL",
        "linkedin": "LinkedIn URL"
      },
      "about": "${isEnglish ? 'About section text' : 'Hakkımda bölümü metni'}",
      "workExperience": [
        {
          "id": "1",
          "position": "${isEnglish ? 'Position' : 'Pozisyon'}",
          "company": "${isEnglish ? 'Company Name' : 'Şirket Adı'}",
          "city": "${isEnglish ? 'City' : 'Şehir'}",
          "country": "${isEnglish ? 'Country' : 'Ülke'}",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM",
          "bulletPoints": ["${isEnglish ? 'Task 1' : 'Görev 1'}", "${isEnglish ? 'Task 2' : 'Görev 2'}", "${isEnglish ? 'Task 3' : 'Görev 3'}"]
        }
      ],
      "education": [
        {
          "id": "1",
          "university": "${isEnglish ? 'University Name' : 'Üniversite Adı'}",
          "department": "${isEnglish ? 'Department' : 'Bölüm'}",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM"
        }
      ],
      "skills": ["${isEnglish ? 'Skill 1' : 'Beceri 1'}", "${isEnglish ? 'Skill 2' : 'Beceri 2'}", "${isEnglish ? 'Skill 3' : 'Beceri 3'}"],
      "languages": [
        {
          "id": "1",
          "language": "${isEnglish ? 'Language Name' : 'Dil Adı'}",
          "level": "${isEnglish ? 'Level' : 'Seviye'}"
        }
      ]
    }
    
    ${isEnglish ? 'IMPORTANT RULES:' : 'ÖNEMLİ KURALLAR:'}
    1. ${isEnglish ? 'Respond only in JSON format; do not use markdown.' : 'Sadece JSON formatında cevap ver, markdown kullanma'}
    2. ${isEnglish ? 'Output dates in YYYY-MM format (e.g., 2024-01).' : "Tarihleri YYYY-MM formatında ver (örn: 2024-01)"}
    3. ${isEnglish ? 'Use empty string ("") for missing fields.' : 'Boş alanlar için boş string ("") kullan'}
    4. ${isEnglish ? 'For unavailable CV information use empty string or empty array.' : "CV'de bulunmayan bilgiler için boş string veya boş array kullan"}
    5. ${isEnglish ? 'Extract email, phone, and URLs accurately.' : "E-posta, telefon, URL'leri doğru çıkar"}
    6. ${isEnglish ? 'Include all work experiences as separate objects in workExperience array.' : "İş deneyimi varsa workExperience array'ine ekle (her iş deneyimi için ayrı obje)"}
    7. ${isEnglish ? 'Include all education records in education array.' : "Eğitim bilgisi varsa education array'ine ekle"}
    8. ${isEnglish ? 'Extract all skills to skills array as individual items.' : "Beceriler varsa skills array'ine ekle (virgülle ayrılmış)"}
    9. ${isEnglish ? 'Extract all languages to languages array as separate objects.' : "Diller varsa languages array'ine ekle (her dil için ayrı obje)"}
    10. ${isEnglish ? 'Include bullet points in bulletPoints arrays.' : "Bullet points'leri bulletPoints array'ine ekle"}
    11. ${isEnglish ? 'Use "Present" for ongoing roles.' : 'Present/Devam ediyor için "Present" kullan'}
    12. ${isEnglish ? 'Do not omit any top-level keys: personalInfo, about, workExperience, education, skills, languages.' : 'Hiçbir alanı atlama: tüm ana anahtarlar (personalInfo, about, workExperience, education, skills, languages) mutlaka dönmeli'}
    13. ${isEnglish ? 'Every workExperience and education object must include all keys (use empty string if missing).' : 'workExperience ve education içindeki her obje tüm alanları içermeli (eksikler için "")'}
    14. ${isEnglish ? 'Keep original contact/URL values from the CV text.' : "URL ve iletişim verilerini metindeki orijinal değerle döndür"}
    15. ${isEnglish ? 'If there are multiple experiences/education entries, include all of them.' : "CV'de birden fazla deneyim/eğitim varsa TAMAMINI diziye ekle"}
    16. ${isEnglish ? 'Split skills from comma/newline lists into separate array items.' : "skills alanında virgülle ayrık/ayrı satırdaki tüm becerileri tek tek dizi elemanına dönüştür"}
    17. ${isEnglish ? 'If possible, separate language name and level in languages array.' : "languages alanında dil ve seviye bilgisini mümkünse ayırarak döndür"}
    18. ${isEnglish ? 'CRITICAL: If cvLanguage is english, keep generated content in English; do not translate to Turkish.' : 'KRİTİK: cvLanguage turkish ise içerikleri Türkçe üret; İngilizceye çevirme.'}
    19. ${isEnglish ? 'Do not output any text outside JSON.' : 'JSON dışında tek bir karakter bile yazma'}
    20. ${isEnglish
      ? 'education[].university: Copy the COMPLETE institution line from the CV (exact spelling). Include city/country if they appear on the same line (e.g. "Biruni University / Turkey, Istanbul"). Never truncate or drop trailing characters (e.g. do not output "Universit" instead of "University").'
      : "education[].university: Üniversite satırını CV'dekiyle AYNEN ve EKSİKSİZ kopyala (yazım, virgül, şehir/ülke aynı satırdaysa hepsi). Asla kesme; \"Üniversitesi\" son ekini veya satır sonunu düşürme."}
    21. ${isEnglish
      ? 'If the CV shows degree/department on one line and the school+location on the next line, put ONLY the school+location line in university (not the degree line).'
      : "CV'de bölüm adı bir satırda, okul+konum bir alt satırdaysa university alanına yalnızca okul+konum satırını yaz."}
    `;
}

export type BuildAdaptCvAnalysisPromptOptions = {
  /**
   * true: çoklu akıştaki ikinci çağrıyla aynı kurallar; aday beceri/dil/yıl listeleri ayrı parametre olarak gelmez —
   * model aynı CV metninden çoklu akışta parse sonrası yapılmış gibi çıkarım yapmalıdır.
   */
  bundledSingleCall?: boolean;
};

/** `analyzeAndAdaptCV` ile birebir aynı prompt (bundledSingleCall ile tek istek varyantı). */
export function buildAdaptCvAnalysisPrompt(
  request: CVAnalysisRequest,
  options?: BuildAdaptCvAnalysisPromptOptions
): string {
  const bundledSingleCall = Boolean(options?.bundledSingleCall);
  const isEnglish = request.cvLanguage === 'english';
  const languageInstructions = isEnglish
    ? `IMPORTANT: The CV is in English. You must respond in English and adapt the CV content in English.`
    : `IMPORTANT: The CV is in Turkish. You must respond in Turkish and adapt the CV content in Turkish.`;

  const adaptationSource = request.adaptationSource ?? 'company';
  const targetTypeLabel = adaptationSource === 'company' ? 'company information' : 'job description text';
  const candidateExperienceYears = request.candidateExperienceYears ?? null;
  const candidateExperienceRange =
    request.candidateExperienceRange?.start && request.candidateExperienceRange?.end
      ? `${request.candidateExperienceRange.start} - ${request.candidateExperienceRange.end}`
      : '';
  const targetPosition = (request.targetPosition || '').trim();

  const candidateSkillsBlock = Array.isArray(request.candidateSkills) && request.candidateSkills.length > 0
    ? request.candidateSkills.join(', ')
    : 'N/A';

  const candidateLanguagesBlock = Array.isArray(request.candidateLanguages) && request.candidateLanguages.length > 0
    ? request.candidateLanguages.map((l) => `${l.language} (${l.level})`).join(', ')
    : 'N/A';
  const manualMustMention = Array.isArray(request.manualMustMentionTopics)
    ? request.manualMustMentionTopics.filter(Boolean)
    : [];
  const manualMustNotMention = Array.isArray(request.manualMustNotMentionTopics)
    ? request.manualMustNotMentionTopics.filter(Boolean)
    : [];

  const targetInfoBlock =
    adaptationSource === 'text'
      ? `Job Description Text:\n${request.jobDescriptionText || 'Job description text is missing.'}`
      : `Company Information:\n${
          request.companyInfo ? JSON.stringify(request.companyInfo, null, 2) : 'Company information is being analyzed...'
        }`;

  const candidateFactConstraints = bundledSingleCall
    ? `
    CANDIDATE FACT CONSTRAINTS (MUST NOT VIOLATE) — SINGLE-BUNDLED CALL (equivalent to multi-step after parse):
    - Never mention any experience duration/years range that comes from the job posting/company requirements.
    - Infer candidate tenure, skills list, languages list, and employment date span ONLY from the CV Text in this request, exactly as the multi-step pipeline would after structured parsing. If unclear, do NOT invent years; treat years as unknown.
    - Never claim the candidate has any skill/technology/qualification that is not present in the CV text.
    - For ALL updated fields (updatedAbout, updatedExperience, updatedSkills, updatedLanguages), every claim must be grounded in CV text only.
    - If a target requirement is not supported by CV facts, do not present it as existing competence/experience.
    `
    : `
    CANDIDATE FACT CONSTRAINTS (MUST NOT VIOLATE):
    - Never mention any experience duration/years range that comes from the job posting/company requirements.
    - If candidateExperienceYears is provided (number), you may mention experience duration ONLY using EXACTLY this value: ${candidateExperienceYears}.
      Never state higher or lower years than that.
    - If candidateExperienceYears is null/unknown, do NOT mention years/tenure at all.
    - Never claim the candidate has any skill/technology/qualification that is not present in the CV text.
    - Candidate Skills (from CV, if available): ${candidateSkillsBlock}
    - Candidate Languages (from CV, if available): ${candidateLanguagesBlock}
    - Candidate Experience Range (best-effort): ${candidateExperienceRange || 'N/A'}
    - For ALL updated fields (updatedAbout, updatedExperience, updatedSkills, updatedLanguages), every claim must be grounded in CV text only.
    - If a target requirement is not supported by CV facts, do not present it as existing competence/experience.
    `;

  const manualTopicRules = `
    MANUAL TOPIC RULES (USER-DEFINED):
    - Must mention topics (if any): ${manualMustMention.length ? manualMustMention.join(', ') : 'none'}
    - Must NOT mention topics (if any): ${manualMustNotMention.length ? manualMustNotMention.join(', ') : 'none'}
    - If a must-mention topic is not supported by CV facts, mention it in a realistic way (interest/learning/adaptation) without fake claims.
    - Must-NOT topics are strictly forbidden in output.
    - Manual topics may be written in a different language than the output language. Preserve meaning, but ALWAYS rewrite/translate them into the final output language.
    - NEVER copy-paste a manual topic sentence verbatim if its language differs from the requested output language.
    `;

  return `
    ${languageInstructions}
    
    Analyze the following CV and adapt all sections according to the provided target information (${targetTypeLabel}).
    
    CV Text:
    ${request.cvText}
    
    ${targetInfoBlock}
    
    ${candidateFactConstraints}
    
    ${manualTopicRules}

    TARGET POSITION RULE:
    - Preferred/explicit target position (if provided): ${targetPosition || 'none'}
    - If target position is provided, you MUST optimize updatedAbout/updatedExperience/updatedSkills for this role.
    - Do not rewrite factual history to force-fit the role; keep all claims CV-grounded.
    
    Positive/Negative Match Rules (fill both arrays):
    - positiveMatches: for job requirements/areas that the candidate clearly matches, add an entry with:
      - label: in Turkish, the job requirement/area (e.g., "Angular ile PWA geliştirme")
      - evidence: in Turkish, the exact CV evidence (skills or bullet content). Do not invent evidence.
    - negativeMismatches: for job requirements/areas that the candidate does NOT clearly match, add an entry with:
      - label: in Turkish, the job requirement/area
      - gap: in Turkish, a short sentence starting with "Bu ilan için uygun değil çünkü", then the reason (based only on missing/unsupported facts in the CV text). Do not invent.
      - evidence: optional, in Turkish, but do not invent.
    - If you are not 100% sure that the CV supports a requirement, it MUST go to negativeMismatches.

    Please respond in the following JSON format:
    {
      "originalAbout": "${isEnglish ? 'Original about section text' : 'Orijinal hakkımda metni'}",
      "updatedAbout": "${isEnglish ? 'Company-adapted about section text' : 'Şirket için uyarlanmış hakkımda metni'}",
      "originalExperience": "${isEnglish ? 'Original work experience text' : 'Orijinal iş deneyimi metni'}",
      "updatedExperience": "${isEnglish ? 'Company-adapted work experience text' : 'Şirket için uyarlanmış iş deneyimi metni'}",
      "originalSkills": "${isEnglish ? 'Original skills text' : 'Orijinal beceriler metni'}",
      "updatedSkills": "${isEnglish ? 'Company-adapted skills text' : 'Şirket için uyarlanmış beceriler metni'}",
      "originalLanguages": "${isEnglish ? 'Original languages text' : 'Orijinal diller metni'}",
      "updatedLanguages": "${isEnglish ? 'Company-adapted languages text' : 'Şirket için uyarlanmış diller metni'}",
      "recommendations": ["Öneri 1", "Öneri 2", "Öneri 3"],
      "matchScore": 85,
      "positiveMatches": [
        {
          "label": "İlan gereksinimi/alanı (güçlü olduğun nokta)",
          "evidence": "CV metninden/skill’lerden kanıt (uydurma yok)"
        }
      ],
      "negativeMismatches": [
        {
          "label": "İlan gereksinimi/alanı (uygun değilsin)",
          "gap": "Bu ilan için uygun değil çünkü [CV’de bu gereksinimi destekleyen bilgi bulunmuyor/kanıtlanmıyor] (uydurma yok)",
          "evidence": "Opsiyonel: CV’den ilgili kanıt/eksik görülen nokta"
        }
      ]
    }
    
    CRITICAL:
    - recommendations alanındaki tüm metinler HER ZAMAN Türkçe olmalı (cvLanguage ne olursa olsun).
    
    ${isEnglish ? 
      `IMPORTANT: Include ALL work experiences in the updatedExperience field. Write all work experiences in the same format:
      - For each work experience: Position, Company, Date, City, Description
      - Then bullet points
      - Then next work experience
      - List all experiences in the same format
      
      EXAMPLE FORMAT (if 2 work experiences):
      "Full Stack Web Developer
      Pronist Software and Consulting
      01/2025 - Present
      Istanbul, Turkey
      Company description...
      • Bullet point 1
      • Bullet point 2
      
      Intern / Backend Web Developer
      Yildiz Technical University
      08/2023 - 10/2023
      Istanbul, Turkey
      Project description...
      • Bullet point 1
      • Bullet point 2"
      
      Important rules:
      1. ABOUT SECTION RULES:
         - About section should be a professional paragraph introducing the person
         - Not writing to the company, but introducing oneself
         - Should include: Profession/expertise area, experience/strengths, goals, standout skills
         - Use the target requirements/values but maintain personal tone
         - Do NOT add any new skill/technology/experience that is not explicitly supported by CV text.
         - Example format: "I work as a [profession] with developed problem-solving skills, strong research orientation and ability to produce innovative solutions. [Strengths] with [goals/objectives]. [Learning/contribution goals]."
      2. WORK EXPERIENCE RULES:
         - NEVER CHANGE POSITION, COMPANY NAME, DATE, ADDRESS INFORMATION
         - ONLY REWRITE BULLET POINT CONTENT
         - DON'T USE TARGET COMPANY NAME, KEEP PERSON'S REAL COMPANY NAME
         - Write bullet points with this principle: "What I did + How I did it + What was the result"
         - Start with strong verbs: "Developed", "Managed", "Increased", "Provided"
         - Use numbers: "%20", "200+", "5-person team" etc.
         - Be concrete and clear: Not "I was successful" → "I reduced time by 15%"
         - Align with the target requirements/values but keep real experience
         - Example format: "Developed e-commerce platform using Next.js and .NET and increased customer experience by 30%"
         - IMPORTANT: Adapt all work experiences in CV, not just the first one
         - Process each work experience separately and make bullet points target requirements focused
      3. In skills section, emphasize technical skills the target is looking for
         - Write skills only as short names (e.g. "HTML", "Time Management", "React")
         - Use maximum 2 words, don't write long descriptions
         - Only write skill name, don't add descriptions
         - Keep existing CV skills; you may append extra skills ONLY if they are explicitly evidenced in CV text/work experience/projects.
         - Never add a skill just because it appears in target requirements.
      4. Languages should stay CV-grounded; do not invent language proficiency
      5. Match score should be 0-100
      6. Only respond in JSON format, don't use markdown format
      7. Use proper English characters` :
      `ÖNEMLİ: updatedExperience alanında TÜM iş deneyimlerini dahil et. CV'de kaç tane iş deneyimi varsa hepsini aynı formatta yaz:
      - Her iş deneyimi için: Pozisyon, Şirket, Tarih, Şehir, Açıklama
      - Sonra bullet point'ler
      - Sonra bir sonraki iş deneyimi
      - Tüm deneyimleri aynı formatta sırala
      
      ÖRNEK FORMAT (2 iş deneyimi varsa):
      "Full Stack Web Developer
      Pronist Yazılım ve Danışmanlık
      01/2025 - Present
      İstanbul, Türkiye
      Şirket açıklaması...
      • Bullet point 1
      • Bullet point 2
      
      Stajyer / Backend Web Developer
      Yıldız Teknik Üniversitesi
      08/2023 - 10/2023
      İstanbul, Türkiye
      Proje açıklaması...
      • Bullet point 1
      • Bullet point 2"
      
      Önemli kurallar:
      1. HAKKIMDA BÖLÜMÜ İÇİN ÖZEL KURALLAR:
         - Hakkımda bölümü kişinin kendini tanıttığı profesyonel bir paragraf olmalı
         - Şirkete mesaj yazma, kişinin kendini tanıtması
         - İçermesi gerekenler: Meslek/uzmanlık alanı, tecrübe/güçlü yönler, hedef, öne çıkan yetenekler
         - Hedefin değerlerine/önceliklerine uygun ama kişisel bir ton kullan
         - CV metninde açıkça geçmeyen hiçbir beceri/teknoloji/deneyim ekleme.
         - Örnek format: "Problem çözme becerisi gelişmiş, araştırma yönü güçlü ve yenilikçi çözümler üretebilen bir [meslek] olarak çalışıyorum. [Güçlü yönler] ile [hedef/amaç]. [Öğrenme/katkı hedefi]."
      2. İŞ DENEYİMİ İÇİN ÖZEL KURALLAR:
         - POZİSYON, ŞİRKET ADI, TARİH, ADRES BİLGİLERİNİ ASLA DEĞİŞTİRME
         - SADECE BULLET POINT'LERİN İÇERİĞİNİ YENİDEN YAZ
         - HEDEF ŞİRKET ADINI KULLANMA, KİŞİNİN GERÇEK ÇALIŞTIĞI ŞİRKET ADINI KORU
         - Bullet point'leri şu prensiple yaz: "Ne yaptım + Nasıl yaptım + Sonuç ne oldu"
         - Güçlü fiillerle başla: "Geliştirdim", "Yönettim", "Artırdım", "Sağladım"
         - Rakam kullan: "%20", "200+", "5 kişilik ekip" gibi
         - Somut ve net ol: "Başarılı oldum" değil → "Süreyi %15 kısalttım"
         - Hedef şirketin değerlerine uygun ama gerçek deneyimi koru
         - Örnek format: "Next.js ve .NET kullanarak e-ticaret platformu geliştirdim ve müşteri deneyimini %30 artırdım"
         - ÖNEMLİ: CV'de kaç tane iş deneyimi varsa hepsini uyarla, sadece ilkini değil
         - Her iş deneyimini ayrı ayrı işle ve bullet point'lerini hedef şirket odaklı yap
      3. Beceriler bölümünde şirketin aradığı teknik becerileri vurgula
         - Becerileri sadece kısa isimlerle yaz (örn: "HTML", "Zaman Yönetimi", "React")
         - En fazla 2 kelime kullan, uzun açıklamalar yazma
         - Sadece beceri adını yaz, açıklama ekleme
         - CV'deki mevcut becerileri koru; ekleme yapılacaksa yalnızca CV metni/iş deneyimi/projelerde açıkça kanıtı olan beceriler eklenebilir.
         - Sırf ilanda geçti diye CV'de olmayan beceriyi ekleme.
      4. Diller bölümü CV gerçeklerine bağlı kalmalı; seviye/dil uydurma yapma
      5. Match score 0-100 arasında olsun
      6. Sadece JSON formatında cevap ver, markdown formatı kullanma
      7. Türkçe karakterleri doğru kullan`
    }
    `;
}
