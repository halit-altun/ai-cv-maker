import { 
  CompanyInfo, 
  CompanyLink,
  CVAnalysisRequest, 
  CVAnalysisResponse, 
  GeminiAPIRequest, 
  GeminiAPIResponse,
  CompanyBasedCVData
} from './types';

// Gemini API Keys - Environment only (no hardcoded fallback)
const GEMINI_API_KEYS = [process.env.NEXT_PUBLIC_GEMINI_API_KEY_1].filter((key): key is string =>
  Boolean(key && key.trim())
);
const DEFAULT_GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** Kapatılan 2.0 modellerini otomatik olarak güncel modele yönlendirir. */
function resolveGeminiApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_GEMINI_API_URL || DEFAULT_GEMINI_API_URL;
  return url
    .replace(/models\/gemini-2\.0-flash-lite(?:-001)?/g, 'models/gemini-2.5-flash-lite')
    .replace(/models\/gemini-2\.0-flash(?:-001)?/g, 'models/gemini-2.5-flash');
}

const GEMINI_API_URL = resolveGeminiApiUrl();

/** Başarılı Gemini çağrısı bittikten sonra bir sonraki isteğe geçmeden önce sabit bekleme (429 riskini azaltır). */
const GEMINI_POST_SUCCESS_DELAY_MS = 10000;

/** Aynı istek için yeniden deneme sayısı (ilk deneme + bu kadar = toplam GEMINI_MAX_RETRIES + 1 çağrı). */
const GEMINI_MAX_RETRIES = 3;

/** Yeniden denemeden önce bekleme (ms). */
const GEMINI_RETRY_DELAY_MS = 15_000;

// API Key rotation system
let currentApiKeyIndex = 0;

export class CompanyBasedCVService {
  
  // Şirket bilgilerini analiz et
  static async analyzeCompany(companyUrls: CompanyLink[]): Promise<CompanyInfo> {
    console.log('=== COMPANY ANALYSIS STARTED ===');
    console.log('Number of links to analyze:', companyUrls.length);
    console.log('Links:', companyUrls.map(link => ({ url: link.url, description: link.description })));
    
    // Her linki sırayla analiz et
    const linkAnalysisResults = [];
    for (let i = 0; i < companyUrls.length; i++) {
      const link = companyUrls[i];
      console.log(`Analyzing link ${i + 1}/${companyUrls.length}: ${link.url}`);
      
      try {
        const linkPrompt = `
        Aşağıdaki şirket web sitesi sayfasını analiz et:
        URL: ${link.url}
        Açıklama: ${link.description}
        
        Bu sayfadan şirket hakkında şu bilgileri çıkar:
        - Şirket adı
        - Şirket açıklaması
        - Sektör
        - Şirket değerleri
        - Şirket kültürü
        - İş gereksinimleri
        - Bu sayfaya özel bilgiler
        
        Lütfen şu JSON formatında cevap ver:
        {
          "name": "Şirket adı",
          "description": "Bu sayfadan çıkarılan şirket açıklaması",
          "industry": "Sektör",
          "values": ["Değer 1", "Değer 2", "Değer 3"],
          "requirements": ["Gereksinim 1", "Gereksinim 2", "Gereksinim 3"],
          "culture": "Şirket kültürü açıklaması",
          "pageSpecificInfo": "Bu sayfaya özel bilgiler"
        }
        
        Sadece JSON formatında cevap ver, başka açıklama ekleme.
        `;
        
        const linkResponse = await this.callGeminiAPI(linkPrompt, { jsonMode: true });
        const linkData = this.parseJSONResponse(linkResponse);
        linkAnalysisResults.push({
          link: link,
          data: linkData
        });
        
        console.log(`Link ${i + 1} analysis completed:`, linkData);
      } catch (error) {
        console.error(`Error analyzing link ${i + 1}:`, error);
        linkAnalysisResults.push({
          link: link,
          data: null,
          error: error
        });
      }
    }
    
    // Tüm link analizlerini birleştir
    const combinedPrompt = `
    Aşağıdaki şirket web sitesi sayfalarının analiz sonuçlarını birleştir ve kapsamlı bir şirket profili oluştur:
    
    ${linkAnalysisResults.map((result, index) => `
    Link ${index + 1}:
    URL: ${result.link.url}
    Açıklama: ${result.link.description}
    Analiz Sonucu: ${result.data ? JSON.stringify(result.data, null, 2) : 'Analiz başarısız'}
    `).join('\n')}
    
    Tüm sayfaların bilgilerini birleştirerek şu JSON formatında cevap ver:
    {
      "name": "Şirket adı",
      "website": "Ana web sitesi URL'si",
      "description": "Birleştirilmiş şirket açıklaması",
      "industry": "Sektör",
      "values": ["Değer 1", "Değer 2", "Değer 3"],
      "requirements": ["Gereksinim 1", "Gereksinim 2", "Gereksinim 3"],
      "culture": "Şirket kültürü açıklaması",
      "analyzedLinks": [
        {
          "url": "URL 1",
          "description": "Açıklama 1"
        }
      ]
    }
    
    Önemli kurallar:
    1. Tüm sayfaların bilgilerini birleştir
    2. Çelişkili bilgiler varsa en güncel olanı kullan
    3. Her sayfadan önemli bilgileri dahil et
    4. analyzedLinks array'ine tüm analiz edilen linkleri ekle
    5. Sadece JSON formatında cevap ver
    `;
    
    const combinedResponse = await this.callGeminiAPI(combinedPrompt, { jsonMode: true });
    const finalResult = this.parseJSONResponse(combinedResponse);
    
    console.log('=== COMPANY ANALYSIS COMPLETED ===');
    console.log('Final result:', finalResult);
    
    return finalResult;
  }

  // CV'yi İngilizce'den Türkçe'ye çevir
  static async translateCVToTurkish(cvData: CompanyBasedCVData): Promise<CompanyBasedCVData> {
    const prompt = `
    Aşağıdaki CV verilerini Türkçe'ye çevir. ÖNEMLİ KURALLAR:
    
    1. BİREBİR ÇEVİRİ: Hiçbir anlam ekleme veya çıkarma yapma
    2. KORUMA: Şirket isimlerini, pozisyon isimlerini aynen koru
    3. FORMAT: JSON yapısını tamamen koru
    4. PROFESYONEL: İş dünyasına uygun Türkçe kullan
    5. TUTARLILIK: Aynı terimler için aynı Türkçe karşılığı kullan
    
    ÇEVİRİ KURALLARI - MUTLAKA UYGULA:
    
    TARİH ÇEVİRİLERİ (ZORUNLU):
    - "Oct" → "Eki"
    - "Aug" → "Ağu" 
    - "Jan" → "Oca"
    - "Feb" → "Şub"
    - "Mar" → "Mar"
    - "Apr" → "Nis"
    - "May" → "May"
    - "Jun" → "Haz"
    - "Jul" → "Tem"
    - "Sep" → "Eyl"
    - "Nov" → "Kas"
    - "Dec" → "Ara"
    
    ÖRNEK TARİH ÇEVİRİLERİ:
    - "Oct 2023 - Aug 2024" → "Eki 2023 - Ağu 2024"
    - "Jan 2022 - Present" → "Oca 2022 - Present"
    - "Jun 2021 - Sep 2022" → "Haz 2021 - Eyl 2022"
    
    DİĞER ÇEVİRİLER:
    - Şehir isimleri: "Istanbul" → "İstanbul", "Ankara" → "Ankara"
    - Ülke isimleri: "Turkey" → "Türkiye"
    - Beceriler: "Analytical thinking" → "Analitik düşünme", "Problem solving" → "Problem çözme", "Teamwork" → "Takım çalışması", "Time management" → "Zaman yönetimi"
    - Diller: "Arabic" → "Arapça", "English" → "İngilizce", "Turkish" → "Türkçe"
    - Hakkımda içeriği: Tam cümleleri Türkçe'ye çevir
    - İş deneyimi açıklamaları: Bullet point'leri Türkçe'ye çevir
    - Eğitim açıklamaları: Bölüm ve okul açıklamalarını Türkçe'ye çevir
    
    EĞİTİM ÇEVİRİ KURALLARI:
    - Bölüm isimlerini Türkçe'ye çevir: "Computer Engineering" → "Bilgisayar Mühendisliği"
    - Üniversite isimlerini KORU: "İstanbul Teknik University" → "İstanbul Teknik Üniversitesi"
    - Sadece "University" kelimesini çevir: "University" → "Üniversitesi"
    - Tarih formatı: "08/2025" gibi format kullan
    
    EĞİTİM ÇEVİRİ ÖRNEKLERİ:
    - "Computer Engineering" → "Bilgisayar Mühendisliği"
    - "Software Engineering" → "Yazılım Mühendisliği"
    - "Industrial Engineering" → "Endüstri Mühendisliği"
    - "Electrical Engineering" → "Elektrik Mühendisliği"
    - "Mechanical Engineering" → "Makine Mühendisliği"
    - "Business Administration" → "İşletme"
    - "Economics" → "İktisat"
    - "Psychology" → "Psikoloji"
    - "İstanbul Teknik University" → "İstanbul Teknik Üniversitesi"
    - "Boğaziçi University" → "Boğaziçi Üniversitesi"
    - "Orta Doğu Teknik University" → "Orta Doğu Teknik Üniversitesi"
    - "Biruni University, Istanbul, Turkey" → "Biruni Üniversitesi, İstanbul, Türkiye" (tam satır; eksik harf bırakma)
    
    BECERİ ÇEVİRİ KURALLARI:
    - İngilizce beceri isimlerini Türkçe'ye çevir: "Problem solving" → "Problem çözme"
    - Teknik terimleri KORU: "React", "NextJS", "JavaScript", "TypeScript", "Node.js", "Python", "Java", "C#", "SQL", "MongoDB", "PostgreSQL", "Git", "Docker", "AWS", "Azure", "Figma", "Photoshop", "Adobe XD"
    - Sadece İngilizce cümleleri çevir, teknik terimlere dokunma
    
    BECERİ ÇEVİRİ ÖRNEKLERİ:
    - "Problem solving" → "Problem çözme"
    - "Teamwork" → "Takım çalışması"
    - "Time management" → "Zaman yönetimi"
    - "Analytical thinking" → "Analitik düşünme"
    - "Communication skills" → "İletişim becerileri"
    - "Leadership" → "Liderlik"
    - "Creativity" → "Yaratıcılık"
    - "Adaptability" → "Adaptasyon"
    - "React" → "React" (değişmez)
    - "NextJS" → "NextJS" (değişmez)
    - "JavaScript" → "JavaScript" (değişmez)
    
    KORUNACAK ALANLAR:
    - Şirket isimleri: "Kafein Teknoloji" → "Kafein Teknoloji" (aynı kalır)
    - Pozisyon isimleri: "Full Stack Developer" → "Full Stack Developer" (aynı kalır)
    - Sayısal tarihler: "01/2025 - Present" → "01/2025 - Present" (aynı kalır)
    
    CV Verisi:
    ${JSON.stringify(cvData, null, 2)}
    
    ÖNEMLİ: 
    1. Sadece geçerli JSON formatında cevap ver
    2. JSON dışında hiçbir metin ekleme
    3. Tüm string değerleri çift tırnak içinde yaz
    4. TARİHLERİ MUTLAKA ÇEVİR: "Oct" → "Eki", "Aug" → "Ağu"
    5. Tüm İngilizce metinleri Türkçe'ye çevir
    6. JSON YAPISINI KORU: workExperience array olarak kalmalı, skills array olarak kalmalı
    7. TÜM ARRAY YAPILARINI KORU: workExperience, skills, languages, education
    
    Örnek format:
    {
      "personalInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "city": "İstanbul",
        "country": "Türkiye"
      },
      "about": "Profesyonel bir...",
      "workExperience": [
        {
          "id": "1",
          "position": "Full Stack Developer",
          "company": "Şirket Adı",
          "startDate": "Eki 2023",
          "endDate": "Ağu 2024",
          "city": "İstanbul",
          "country": "Türkiye",
          "bulletPoints": ["Web uygulamaları geliştirdim", "Takım projelerini yönettim"]
        }
      ],
      "skills": ["Analitik düşünme", "Problem çözme"],
      "languages": [
        {
          "id": "1",
          "language": "İngilizce",
          "level": "İleri"
        }
      ]
    }
    `;

    const response = await this.callGeminiAPI(prompt, { jsonMode: true });
    const translatedData = this.parseJSONResponse(response);
    
    // Veri yapısını doğrula ve düzelt
    return this.validateAndFixCVData(translatedData, cvData);
  }

  // CV'yi analiz et ve şirket için uyarla
  static async translateCVToEnglish(cvData: CompanyBasedCVData): Promise<CompanyBasedCVData> {
    const prompt = `
    Aşağıdaki CV verilerini İngilizce'ye çevir. ÖNEMLİ KURALLAR:
    
    1. BİREBİR ÇEVİRİ: Hiçbir anlam ekleme veya çıkarma yapma
    2. KORUMA: Şirket isimlerini, pozisyon isimlerini aynen koru
    3. FORMAT: JSON yapısını tamamen koru
    4. PROFESYONEL: İş dünyasına uygun İngilizce kullan
    5. TUTARLILIK: Aynı terimler için aynı İngilizce karşılığı kullan
    
    ÇEVİRİ KURALLARI - MUTLAKA UYGULA:
    
    TARİH ÇEVİRİLERİ (ZORUNLU):
    - "Eki" → "Oct"
    - "Ağu" → "Aug" 
    - "Oca" → "Jan"
    - "Şub" → "Feb"
    - "Mar" → "Mar"
    - "Nis" → "Apr"
    - "May" → "May"
    - "Haz" → "Jun"
    - "Tem" → "Jul"
    - "Eyl" → "Sep"
    - "Kas" → "Nov"
    - "Ara" → "Dec"
    
    ÖRNEK TARİH ÇEVİRİLERİ:
    - "Eki 2023 - Ağu 2024" → "Oct 2023 - Aug 2024"
    - "Oca 2022 - Present" → "Jan 2022 - Present"
    - "Haz 2021 - Eyl 2022" → "Jun 2021 - Sep 2022"
    
    DİĞER ÇEVİRİLER:
    - Şehir isimleri: "İstanbul" → "Istanbul", "Ankara" → "Ankara"
    - Ülke isimleri: "Türkiye" → "Turkey"
    - Beceriler: "Analitik düşünme" → "Analytical thinking", "Problem çözme" → "Problem solving", "Takım çalışması" → "Teamwork", "Zaman yönetimi" → "Time management"
    - Diller: "Arapça" → "Arabic", "İngilizce" → "English", "Türkçe" → "Turkish"
    - Hakkımda içeriği: Tam cümleleri İngilizce'ye çevir
    - İş deneyimi açıklamaları: Bullet point'leri İngilizce'ye çevir
    - Eğitim açıklamaları: Bölüm ve okul açıklamalarını İngilizce'ye çevir
    
    EĞİTİM ÇEVİRİ KURALLARI:
    - Bölüm isimlerini İngilizce'ye çevir: "Bilgisayar Mühendisliği" → "Computer Engineering"
    - Üniversite isimlerini KORU: "İstanbul Teknik Üniversitesi" → "İstanbul Teknik University"
    - Sadece "Üniversitesi" kelimesini çevir: "Üniversitesi" → "University"
    - Tarih formatı: "08/2025" gibi format kullan
    
    EĞİTİM ÇEVİRİ ÖRNEKLERİ:
    - "Bilgisayar Mühendisliği" → "Computer Engineering"
    - "Yazılım Mühendisliği" → "Software Engineering"
    - "Endüstri Mühendisliği" → "Industrial Engineering"
    - "Elektrik Mühendisliği" → "Electrical Engineering"
    - "Makine Mühendisliği" → "Mechanical Engineering"
    - "İşletme" → "Business Administration"
    - "İktisat" → "Economics"
    - "Psikoloji" → "Psychology"
    - "İstanbul Teknik Üniversitesi" → "İstanbul Teknik University"
    - "Boğaziçi Üniversitesi" → "Boğaziçi University"
    - "Orta Doğu Teknik Üniversitesi" → "Orta Doğu Teknik University"
    - "Biruni Üniversitesi, İstanbul, Türkiye" → "Biruni University, Istanbul, Turkey" (tam satır; "Universit" gibi yarım bırakma)
    
    BECERİ ÇEVİRİ KURALLARI:
    - Türkçe beceri isimlerini İngilizce'ye çevir: "Problem çözme" → "Problem solving"
    - Teknik terimleri KORU: "React", "NextJS", "JavaScript", "TypeScript", "Node.js", "Python", "Java", "C#", "SQL", "MongoDB", "PostgreSQL", "Git", "Docker", "AWS", "Azure", "Figma", "Photoshop", "Adobe XD"
    - Sadece Türkçe cümleleri çevir, teknik terimlere dokunma
    
    BECERİ ÇEVİRİ ÖRNEKLERİ:
    - "Problem çözme" → "Problem solving"
    - "Takım çalışması" → "Teamwork"
    - "Zaman yönetimi" → "Time management"
    - "Analitik düşünme" → "Analytical thinking"
    - "İletişim becerileri" → "Communication skills"
    - "Liderlik" → "Leadership"
    - "Yaratıcılık" → "Creativity"
    - "Adaptasyon" → "Adaptability"
    - "React" → "React" (değişmez)
    - "NextJS" → "NextJS" (değişmez)
    - "JavaScript" → "JavaScript" (değişmez)
    
    KORUNACAK ALANLAR:
    - Şirket isimleri: "Kafein Teknoloji" → "Kafein Teknoloji" (aynı kalır)
    - Pozisyon isimleri: "Full Stack Developer" → "Full Stack Developer" (aynı kalır)
    - Sayısal tarihler: "01/2025 - Present" → "01/2025 - Present" (aynı kalır)
    
    CV Verisi:
    ${JSON.stringify(cvData, null, 2)}
    
    ÖNEMLİ: 
    1. Sadece geçerli JSON formatında cevap ver
    2. JSON dışında hiçbir metin ekleme
    3. Tüm string değerleri çift tırnak içinde yaz
    4. TARİHLERİ MUTLAKA ÇEVİR: "Eki" → "Oct", "Ağu" → "Aug"
    5. Tüm Türkçe metinleri İngilizce'ye çevir
    6. JSON YAPISINI KORU: workExperience array olarak kalmalı, skills array olarak kalmalı
    7. TÜM ARRAY YAPILARINI KORU: workExperience, skills, languages, education
    
    Örnek format:
    {
      "personalInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "city": "Istanbul",
        "country": "Turkey"
      },
      "about": "I am a professional...",
      "workExperience": [
        {
          "id": "1",
          "position": "Full Stack Developer",
          "company": "Company Name",
          "startDate": "Oct 2023",
          "endDate": "Aug 2024",
          "city": "Istanbul",
          "country": "Turkey",
          "bulletPoints": ["Developed web applications", "Managed team projects"]
        }
      ],
      "skills": ["Analytical thinking", "Problem solving"],
      "languages": [
        {
          "id": "1",
          "language": "English",
          "level": "Advanced"
        }
      ]
    }
    `;

    const response = await this.callGeminiAPI(prompt, { jsonMode: true });
    const translatedData = this.parseJSONResponse(response);
    
    // Veri yapısını doğrula ve düzelt
    return this.validateAndFixCVData(translatedData, cvData);
  }

  // Çeviri sonrası veri yapısını doğrula ve düzelt
  private static validateAndFixCVData(translatedData: any, originalData: CompanyBasedCVData): CompanyBasedCVData {
    try {
      // Orijinal veri yapısını koru
      const fixedData: CompanyBasedCVData = {
        personalInfo: translatedData.personalInfo || originalData.personalInfo,
        about: translatedData.about || originalData.about,
        workExperience: Array.isArray(translatedData.workExperience) 
          ? translatedData.workExperience 
          : originalData.workExperience,
        education: Array.isArray(translatedData.education) 
          ? translatedData.education 
          : originalData.education,
        skills: Array.isArray(translatedData.skills) 
          ? translatedData.skills 
          : originalData.skills,
        languages: Array.isArray(translatedData.languages) 
          ? translatedData.languages 
          : originalData.languages,
        companyInfo: translatedData.companyInfo || originalData.companyInfo
      };

      console.log('Fixed CV data structure:', fixedData);
      return fixedData;
    } catch (error) {
      console.error('Error fixing CV data structure:', error);
      // Hata durumunda orijinal veriyi döndür
      return originalData;
    }
  }

  static async analyzeAndAdaptCV(request: CVAnalysisRequest): Promise<CVAnalysisResponse> {
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

    const candidateFactConstraints = `
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

    const prompt = `
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

    const response = await this.callGeminiAPI(prompt, { jsonMode: true });
    return this.normalizeCVAnalysisResponse(this.parseJSONResponse(response, { useCompanyFallback: false }));
  }

  private static normalizeCVAnalysisResponse(parsed: Record<string, unknown>): CVAnalysisResponse {
    const toText = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ');
      }
      return value != null ? String(value) : '';
    };

    const toStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
      if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
      return [];
    };

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
      matchScore: typeof parsed.matchScore === 'number' ? parsed.matchScore : Number(parsed.matchScore) || 0,
      positiveMatches: Array.isArray(parsed.positiveMatches) ? parsed.positiveMatches as CVAnalysisResponse['positiveMatches'] : [],
      negativeMismatches: Array.isArray(parsed.negativeMismatches) ? parsed.negativeMismatches as CVAnalysisResponse['negativeMismatches'] : [],
    };
  }

  private static normalizeOutreachLetterFormatting(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\s*•\s*/g, '\n• ')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static buildOutreachSignatureBlock(personalInfo?: Partial<CompanyBasedCVData['personalInfo']>): string {
    const normalizeUrlForSignature = (value: string | undefined) => {
      const v = (value || '').trim();
      return v
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/$/, '');
    };

    const fullName = `${(personalInfo?.firstName || '').trim()} ${(personalInfo?.lastName || '').trim()}`.trim();
    const title = (personalInfo?.title || '').trim();
    const email = (personalInfo as any)?.email ? String((personalInfo as any).email).trim() : '';
    const phone = (personalInfo as any)?.phone ? String((personalInfo as any).phone).trim() : '';
    const linkedin = normalizeUrlForSignature(personalInfo?.linkedin);
    const portfolio = normalizeUrlForSignature(personalInfo?.portfolio);

    return `Best regards,\n${fullName}\n${title}\n${email}\n${phone}\n${linkedin}\n${portfolio}`;
  }

  /**
   * Cover letter / LinkedIn için uygulamanın sonuna eklediği imza bloğunu metinden ayırır.
   * Kelime hedefi (ör. LinkedIn gövde 50-70) yalnızca dönen metin üzerinden sayılmalıdır.
   */
  static stripAppendedOutreachSignature(fullText: string): string {
    const sig = '\n\nBest regards,';
    const i = fullText.lastIndexOf(sig);
    if (i === -1) return (fullText || '').trim();
    return fullText.slice(0, i).trim();
  }

  // Cover letter üret (şirket bilgisi veya ilan metnine göre)
  static async generateCompanyCoverLetter(params: {
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
  }): Promise<string> {
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
    const sanitizeRoleTitle = (value: string | undefined) => {
      let role = (value || '').trim();
      role = role.replace(/^[\-\s:]+|[\-\s:]+$/g, '');
      role = role.replace(/\s+/g, ' ');
      role = role.replace(/^founding\s+/i, '');
      return role.trim();
    };

    const targetPositionClean = sanitizeRoleTitle(targetPosition) || 'Full Stack Web Developer';
    const recipientNameClean = recipientName?.trim() ? recipientName.trim() : undefined;
    const recipientCompanyNameClean = recipientCompanyName?.trim() ? recipientCompanyName.trim() : undefined;
    const headerFormatRule = recipientCompanyNameClean
      ? `"${targetPositionClean} - ${recipientCompanyNameClean}"`
      : `"${targetPositionClean}"`;
    const englishGreeting = recipientNameClean ? `Dear ${recipientNameClean},` : 'Dear Hiring Team,';
    const turkishGreeting = recipientNameClean ? `Sayın ${recipientNameClean},` : 'Sayın İşe Alma Ekibi,';
    const candidateSkillsBlock = Array.isArray(candidateSkills) && candidateSkills.length > 0
      ? candidateSkills.join(', ')
      : 'N/A';

    const highlightsBlock = Array.isArray(candidateHighlights) && candidateHighlights.length > 0
      ? candidateHighlights.slice(0, 8).join('\n')
      : '';
    const manualMustMention = Array.isArray(manualMustMentionTopics) ? manualMustMentionTopics.filter(Boolean) : [];
    const manualMustNotMention = Array.isArray(manualMustNotMentionTopics) ? manualMustNotMentionTopics.filter(Boolean) : [];

    const candidateExperienceRule = candidateExperienceYears !== null && candidateExperienceYears !== undefined
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

    const prompt = isEnglish
      ? `
      Write a professional, concise, and persuasive cover letter tailored to the provided target.

      ${targetInfoBlock}

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

    const response = await this.callGeminiAPI(prompt);
    let letter = response.trim().replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim();

    // Safety net: never leave [company] placeholder in final output.
    letter = CompanyBasedCVService.normalizeOutreachLetterFormatting(letter.replace(/\[company\]/gi, ''));

    // If company name is explicitly provided, ensure the first header line includes it.
    if (recipientCompanyNameClean) {
      const lines = letter.split('\n');
      if (lines.length > 0 && !lines[0].includes(recipientCompanyNameClean)) {
        lines[0] = `${lines[0].replace(/\s*-\s*$/, '').trim()} - ${recipientCompanyNameClean}`;
        letter = lines.join('\n');
      }
    } else {
      // If company is not provided, scrub extracted company name if it appears from analyzed metadata.
      if (companyInfo?.name) {
        const escaped = companyInfo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        letter = CompanyBasedCVService.normalizeOutreachLetterFormatting(letter.replace(new RegExp(escaped, 'gi'), ''));
      }
      // Clean possible dangling "Position -" header.
      letter = letter.replace(/-\s*\n/, '\n');
    }

    const signatureBlock = CompanyBasedCVService.buildOutreachSignatureBlock(personalInfo);

    return `${letter}\n\n${signatureBlock}`.trim();
  }

  // LinkedIn mesajı (cover letter ile aynı kanıt/kısıt kuralları; gövde 50-70 kelime, imza uygulama ekler)
  static async generateCompanyLinkedInMessage(params: {
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
  }): Promise<string> {
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
    const sanitizeRoleTitle = (value: string | undefined) => {
      let role = (value || '').trim();
      role = role.replace(/^[\-\s:]+|[\-\s:]+$/g, '');
      role = role.replace(/\s+/g, ' ');
      role = role.replace(/^founding\s+/i, '');
      return role.trim();
    };

    const targetPositionClean = sanitizeRoleTitle(targetPosition) || 'Full Stack Web Developer';
    const recipientNameClean = recipientName?.trim() ? recipientName.trim() : undefined;
    const recipientCompanyNameClean = recipientCompanyName?.trim() ? recipientCompanyName.trim() : undefined;
    const englishGreeting = recipientNameClean ? `Dear ${recipientNameClean},` : 'Dear Hiring Team,';
    const turkishGreeting = recipientNameClean ? `Sayın ${recipientNameClean},` : 'Sayın İşe Alma Ekibi,';
    const candidateSkillsBlock = Array.isArray(candidateSkills) && candidateSkills.length > 0
      ? candidateSkills.join(', ')
      : 'N/A';

    const highlightsBlock = Array.isArray(candidateHighlights) && candidateHighlights.length > 0
      ? candidateHighlights.slice(0, 8).join('\n')
      : '';
    const manualMustMention = Array.isArray(manualMustMentionTopics) ? manualMustMentionTopics.filter(Boolean) : [];
    const manualMustNotMention = Array.isArray(manualMustNotMentionTopics) ? manualMustNotMentionTopics.filter(Boolean) : [];

    const candidateExperienceRule = candidateExperienceYears !== null && candidateExperienceYears !== undefined
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

    const prompt = isEnglish
      ? `
      Write a short LinkedIn outreach message (connection/DM style) tailored to the provided target.
      Apply the SAME evidence and honesty rules as a formal cover letter, but compressed for LinkedIn.

      ${targetInfoBlock}

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

    const response = await this.callGeminiAPI(prompt);
    let message = response.trim().replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim();

    message = CompanyBasedCVService.normalizeOutreachLetterFormatting(message.replace(/\[company\]/gi, ''));

    if (!recipientCompanyNameClean && companyInfo?.name) {
      const escaped = companyInfo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      message = CompanyBasedCVService.normalizeOutreachLetterFormatting(message.replace(new RegExp(escaped, 'gi'), ''));
    }

    const signatureBlock = CompanyBasedCVService.buildOutreachSignatureBlock(personalInfo);

    return `${message}\n\n${signatureBlock}`.trim();
  }

  private static isRetriableGeminiHttpStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  // Gemini API'yi çağır; geçici hatalarda aynı istek için en fazla GEMINI_MAX_RETRIES kez 15 sn bekleyip yeniden dener
  private static async callGeminiAPI(
    prompt: string,
    options?: { jsonMode?: boolean }
  ): Promise<string> {
    const requestBody: GeminiAPIRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      ...(options?.jsonMode
        ? { generationConfig: { responseMimeType: 'application/json' } }
        : {}),
    };

    if (GEMINI_API_KEYS.length === 0) {
      throw new Error('No valid API keys found. Please check your environment variables.');
    }

    let lastError: unknown = new Error('Gemini API çağrısı başarısız');

    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
      const currentApiKey = GEMINI_API_KEYS[currentApiKeyIndex];

      if (!currentApiKey) {
        throw new Error(`API key at index ${currentApiKeyIndex} is undefined.`);
      }

      const logPrefix = `[Gemini deneme ${attempt + 1}/${GEMINI_MAX_RETRIES + 1}]`;

      try {
        console.log(`${logPrefix} API key ${currentApiKeyIndex + 1}/${GEMINI_API_KEYS.length}: ${currentApiKey.substring(0, 10)}...`);

        const response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': currentApiKey
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          lastError = new Error(`Gemini API error: ${response.status} ${response.statusText}`);
          if (this.isRetriableGeminiHttpStatus(response.status) && attempt < GEMINI_MAX_RETRIES) {
            console.warn(
              `${logPrefix} ${response.status} — ${GEMINI_RETRY_DELAY_MS / 1000} sn sonra aynı istek tekrarlanacak.`
            );
            await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
            continue;
          }
          throw lastError;
        }

        const data: GeminiAPIResponse = await response.json();

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string' && text.length > 0) {
          console.log(`${logPrefix} başarılı (key ${currentApiKeyIndex + 1})`);
          await new Promise((resolve) => setTimeout(resolve, GEMINI_POST_SUCCESS_DELAY_MS));
          return text;
        }

        lastError = new Error('Gemini API did not return valid response');
        if (attempt < GEMINI_MAX_RETRIES) {
          console.warn(`${logPrefix} geçersiz/boş yanıt — ${GEMINI_RETRY_DELAY_MS / 1000} sn sonra tekrarlanacak.`);
          await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
          continue;
        }
        throw lastError;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        const isNetwork =
          error instanceof TypeError ||
          /failed to fetch|networkerror|load failed|fetch/i.test(msg);
        const isJsonParse = error instanceof SyntaxError;

        if ((isNetwork || isJsonParse) && attempt < GEMINI_MAX_RETRIES) {
          console.warn(
            `${logPrefix} ağ/parse hatası — ${GEMINI_RETRY_DELAY_MS / 1000} sn sonra tekrarlanacak:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
          continue;
        }

        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private static stripMarkdownCodeFences(text: string): string {
    return text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();
  }

  private static extractJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }

    return null;
  }

  private static sanitizeJsonString(jsonStr: string): string {
    return jsonStr
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, '$1');
  }

  /** JSON string değerleri içindeki kaçışsız satır sonlarını düzeltir. */
  private static escapeControlCharsInJsonStrings(jsonStr: string): string {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];

      if (!inString) {
        result += char;
        if (char === '"') inString = true;
        continue;
      }

      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        result += char;
        inString = false;
        continue;
      }

      if (char === '\n') {
        result += '\\n';
        continue;
      }

      if (char === '\r') continue;

      if (char === '\t') {
        result += '\\t';
        continue;
      }

      result += char;
    }

    return result;
  }

  private static tryParseJsonCandidates(response: string): unknown | null {
    const stripped = this.stripMarkdownCodeFences(response);
    const extracted = this.extractJsonObject(stripped) ?? stripped;
    const candidates = Array.from(
      new Set([
        stripped,
        extracted,
        this.sanitizeJsonString(stripped),
        this.sanitizeJsonString(extracted),
        this.escapeControlCharsInJsonStrings(this.sanitizeJsonString(extracted)),
        this.escapeControlCharsInJsonStrings(this.sanitizeJsonString(stripped)),
      ])
    ).filter((candidate) => candidate.includes('{'));

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Sonraki adayı dene
      }
    }

    return null;
  }

  // JSON response'u parse et
  private static parseJSONResponse(
    response: string,
    options?: { useCompanyFallback?: boolean }
  ): any {
    console.log('Raw response length:', response.length);

    const parsed = this.tryParseJsonCandidates(response);
    if (parsed != null) {
      console.log('Parsed successfully');
      return parsed;
    }

    console.error('JSON parsing failed. Preview:', response.substring(0, 500));

    if (options?.useCompanyFallback !== false) {
      console.log('Using company fallback values');
      return {
        name: 'Şirket Adı',
        website: 'https://example.com',
        description: 'Şirket açıklaması alınamadı',
        industry: 'Teknoloji',
        values: ['İnovasyon', 'Kalite', 'Müşteri Odaklılık'],
        requirements: ['Deneyim', 'Ekip Çalışması', 'Problem Çözme'],
        culture: 'Dinamik ve yenilikçi çalışma ortamı',
      };
    }

    throw new Error('AI yanıtı geçerli JSON formatında ayrıştırılamadı. Lütfen tekrar deneyin.');
  }

  // PDF'den metin çıkar
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      // 1) Server-side extraction only (avoids browser pdfjs chunk/worker issues)
      const formData = new FormData();
      formData.append('file', file, file.name);

      const apiUrl = (typeof window !== 'undefined' && window.location?.origin)
        ? `${window.location.origin}/api/extract-pdf-text`
        : '/api/extract-pdf-text';

      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.text) {
        return String(json.text);
      }

      const serverErr = json?.error ? String(json.error) : (res.statusText || 'Unknown error');
      throw new Error(`Server PDF parse failed: ${serverErr}`);
    } catch (error) {
      console.error('PDF extraction error:', error);

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`PDF dosyası okunamadı. ${details}`.trim());
    }
  }

  // PDF.js ile text extraction
  private static async extractWithPDFJS(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    // Legacy build; tarayıcı tarafında worker/DOMMatrix tarafındaki tutarsızlıklarda daha stabil olur.
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const pdfjsVersion =
      typeof (pdfjsLib as { version?: string }).version === 'string'
        ? (pdfjsLib as { version: string }).version
        : '5.5.207';
    const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

    const buildTextFromDocument = async (pdfDocument: any) => {
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items || [])
          .map((item: any) => item?.str)
          .filter(Boolean)
          .join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    };

    // 1) Worker ile dene
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDocument = await loadingTask.promise;
      return await buildTextFromDocument(pdfDocument);
    } catch (workerError) {
      console.warn('PDF.js worker extraction error, retrying with disableWorker=true...', workerError);
    }

    // 2) Worker'sız dene
    const loadingTaskNoWorker = pdfjsLib.getDocument({
      data: arrayBuffer,
      disableWorker: true
    } as any);
    const pdfDocumentNoWorker = await loadingTaskNoWorker.promise;
    return await buildTextFromDocument(pdfDocumentNoWorker);
  }

  // React-PDF ile text extraction
  private static async extractWithReactPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const reactPdf = await import('react-pdf');
    
    // React-PDF tipik olarak `pdfjs` export eder.
    const pdfjs =
      (reactPdf as any).pdfjs ||
      (reactPdf as any).default?.pdfjs ||
      (reactPdf as any).pdfjsLib ||
      (reactPdf as any).default?.pdfjsLib;

    if (!pdfjs) {
      throw new Error('React-PDF pdfjs not found');
    }
    
    const pdfjsVersion =
      typeof (pdfjs as { version?: string }).version === 'string'
        ? (pdfjs as { version: string }).version
        : '5.4.296';
    const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

    // WorkerSrc zorunludur.
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText;
  }

  // Basit text extraction fallback
  private static async simpleTextExtraction(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;

          const useSampleCV = process.env.NEXT_PUBLIC_USE_SAMPLE_CV === 'true';
          const looksBinary = text.includes('%PDF') || text.length < 100;

          // Eğer PDF binary data ise, örnek CV metni döndürmek yerine
          // PDF.js / react-pdf fallback'e geçmek için hata fırlatalım.
          if (looksBinary) {
            if (useSampleCV) {
              console.log('PDF binary data detected, using sample CV text (override)');
            } else {
              reject(new Error('PDF binary or too short for text extraction; use PDF.js/react-pdf.'));
              return;
            }

            const sampleCVText = `
Halit ALTUN
Full Stack Web Developer
Gelişime açık, analitik ve yenilikçi bir full stack web developer.

İletişim Bilgileri:
Email: halitaltun002@gmail.com
Telefon: +90 531 382 50 79
Konum: Güngören, İstanbul
LinkedIn: linkedin.com/in/halit-altun-923207258
Portfolio: halitaltun.netlify.app/
GitHub: github.com/halit-altun

EĞİTİM (EDUCATION):
Bilgisayar Mühendisliği
Biruni Üniversitesi, İstanbul, Türkiye
10/2020 - 06/2024
Tezler/Projeler: Makine Öğrenimi, Hasta Röntgenleri Kullanılarak Yapay Sinir Ağı Teşhisi, Veri Bilimi, Büyük Dil Modeli

DENEYİM (EXPERIENCE):
Full Stack Web Developer
Pronist Yazılım ve Danışmanlık
01/2025 - Present
İstanbul, Türkiye
Pronist Yazılım, e-ticaret çözümleri alanında uzmanlaşmış, özellikle pazaryeri entegrasyon projeleri geliştiren bir yazılım firmasıdır.
• Next.js, .NET, SQL Server ve Figma kullanarak full stack geliştirici rolünde kapsamlı web uygulamaları geliştirildi
• E-ticaret pazaryeri entegrasyon projesinde öncü rol alınarak Amazon, Trendyol ve Hepsiburada gibi büyük platformların API entegrasyonları başarıyla gerçekleştirildi
• Şirket içi projelerde sergilenen üstün performans, hızlı adaptasyon ve teknik uzmanlık sayesinde görevin ilk 3 ayında takım lideri tarafından erken terfiye hak kazanıldı
• Pazaryeri entegrasyonları için geliştirilen özel çözümler ve otomatikleştirilen iş süreçleri ile operasyonel verimlilikte önemli artış sağlandı
• Full-stack web uygulamaları geliştirilirken güvenlik odaklı bir yaklaşım benimsenerek, modern kimlik doğrulama ve yetkilendirme sistemleri (JWT) implementasyonu yapıldı
• Çoklu kullanıcı rollerini destekleyen dinamik yetkilendirme mekanizmaları tasarlandı, rol ve talep tabanlı erişim kontrol sistemleri oluşturuldu

Stajyer / Backend Web Developer
Yıldız Teknik Üniversitesi, Bilgi Teknolojileri ve Siber Güvenlik
08/2023 - 10/2023
İstanbul, Türkiye
Proje: Kullanıcı Kimlik Doğrulama ve Yetkilendirme Projesi /.NET Core Identity Framework
• .NET Core Identity Framework kullanarak çok katmanlı bir web uygulaması mimarisini başarıyla geliştirildi
• Kullanıcı rollerini ve yetkilerini dinamik olarak yönetmek için özel rol tabanlı ve talep tabanlı yetkilendirme stratejileri tasarlandı
• JWT (JSON Web Token) tabanlı kimlik doğrulama uygulandı, güvenli ve ölçeklenebilir bir kimlik yönetimi altyapısı oluşturuldu

BECERİLER (SKILLS):
Teknik Beceriler: Node.JS, Html, Css, React, Sql, MongoDB, JavaScript, C#, .NET, Docker, NextJS, Github, Figma, Bitbucket, Jira
Yumuşak Beceriler: Ekip Çalışması, Kendini İfade Etme, Stres Yönetimi, Analitik Düşünme, Zaman Yönetimi, Disiplin

KİŞİSEL PROJELER (PERSONAL PROJECTS):
Full Stack E-Ticaret Web Projesi
11/2024 - 11/2024
React, Node.js, Express ve MongoDB ile oluşturulmuş full stack bir e-ticaret platformudur.
Özellikler: Kullanıcı Doğrulama & Yetkilendirme, Ürün Tarama & Arama, Alışveriş Sepeti Yönetimi, Sipariş İşlemi, Adres Yönetimi, Güvenli Ödeme Süreci, Responsive Tasarım, CSRF Koruması, E-posta ile Şifre Sıfırlama, Material-UI Bileşenleri, İngilizce-Türkçe Dil Desteği

Full Stack Kişisel Blog Sayfası Projesi
11/2024 - 12/2024
React ve Node.js ile oluşturulmuş, dinamik animasyonlar ve etkileşimli öğeler içeren şık bir cyberpunk esintili tasarıma sahip modern, efektif bir full stack web uygulamasıdır.
Özellikler: Modern UI/UX Tasarımı, Portföy Bölümü, Blog Sistemi, İletişim Sistemi, E-posta bildirim sistemi

SERTİFİKALAR (CERTIFICATES):
Udemy'den "Pratik Web Geliştirme Eğitimi" Kurs Tamamlama Sertifikası (109 saat) - 09/2024 - 10/2024
Udemy'den "Node.js ile Sıfırdan İleri Düzey Web Geliştirme" Kurs Tamamlama Sertifikası (24 saat) - 10/2024 - 10/2024
Udemy'den "Sıfırdan İleri Seviye React Kursu" Kurs Tamamlama Sertifikası (25 saat) - 10/2024 - 11/2024
Udemy'den "A'dan Z'ye Docker" Kurs Tamamlama Sertifikası (16.5 saat) - 12/2024 - 12/2024
Udemy'den "Sıfırdan, İleri Seviye Next.js 13 ile Web App Geliştirme" Kurs Tamamlama Sertifikası (9 saat) - 01/2025 - 01/2025

DİLLER (LANGUAGES):
Arapça (C1) - Native or Bilingual Proficiency
İngilizce (B1) - Limited Working Proficiency
            `;
            resolve(sampleCVText);
          } else {
            resolve(text);
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // AI ile CV'yi analiz et ve proje formatına dönüştür
  static async parseCVDataWithAI(
    cvText: string,
    cvLanguage: 'turkish' | 'english' = 'turkish'
  ): Promise<Partial<CompanyBasedCVData>> {
    console.log('=== CV TEXT ANALYSIS ===');
    console.log('Raw CV Text Length:', cvText.length);
    console.log('CV Text Preview (first 500 chars):', cvText.substring(0, 500));
    console.log('CV Text Preview (last 500 chars):', cvText.substring(cvText.length - 500));
    console.log('========================');

    const isEnglish = cvLanguage === 'english';

    const prompt = `
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
      : 'education[].university: Üniversite satırını CV\'dekiyle AYNEN ve EKSİKSİZ kopyala (yazım, virgül, şehir/ülke aynı satırdaysa hepsi). Asla kesme; "Üniversitesi" son ekini veya satır sonunu düşürme.'}
    21. ${isEnglish
      ? 'If the CV shows degree/department on one line and the school+location on the next line, put ONLY the school+location line in university (not the degree line).'
      : 'CV\'de bölüm adı bir satırda, okul+konum bir alt satırdaysa university alanına yalnızca okul+konum satırını yaz.'}
    `;

    try {
      console.log('=== AI PARSING STARTED ===');
      const response = await this.callGeminiAPI(prompt, { jsonMode: true });
      console.log('AI Response Length:', response.length);
      console.log('AI Response Preview:', response.substring(0, 500));
      
      const parsedData = this.parseJSONResponse(response);
      console.log('=== AI PARSED CV DATA ===');
      console.log('Personal Info:', parsedData.personalInfo);
      console.log('Work Experience Count:', parsedData.workExperience?.length || 0);
      console.log('Education Count:', parsedData.education?.length || 0);
      console.log('Skills Count:', parsedData.skills?.length || 0);
      console.log('Languages Count:', parsedData.languages?.length || 0);
      console.log('About Length:', parsedData.about?.length || 0);
      console.log('========================');
      
      return this.normalizeParsedCVData(parsedData, cvText);
    } catch (error) {
      console.error('AI CV parsing error:', error);
      // Fallback: Basit parsing
      return this.parseCVDataSimple(cvText);
    }
  }

  /** CV metninde EĞİTİM / EDUCATION ile sonraki ana başlık arası satırlar. */
  private static getCvEducationSectionLines(cvText: string): string[] {
    const lines = cvText.split(/\r?\n/).map((l) => l.trim());
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase();
      if (
        /^\s*(eğitim|education)\b/i.test(lines[i]) &&
        (low.includes(':') || low.includes('(') || lines[i].length <= 24)
      ) {
        start = i + 1;
        break;
      }
    }
    if (start === -1) return [];

    const out: string[] = [];
    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (CompanyBasedCVService.isSectionHeader(line)) break;
      out.push(line);
    }
    return out;
  }

  private static pickRicherUniversityLineFromEducationSection(
    sectionLines: string[],
    currentUniversity: string
  ): string | null {
    const u = currentUniversity.trim();
    if (!u) return null;

    const anchor = u
      .split(/[\s,/|()]+/)
      .map((t) => t.trim())
      .find((t) => t.length >= 4 && !/^(the|and|for|von|der)$/i.test(t));
    if (!anchor) return null;

    const uniLike = (line: string) =>
      /üni|universit|college|institute|academy|politeknik|school\b/i.test(line);

    const hasAnchor = (line: string) => line.toLowerCase().includes(anchor.toLowerCase());

    const looksTruncated = /universit$/i.test(u) || /üniversite$/i.test(u);

    let best: string | null = null;
    for (const line of sectionLines) {
      if (!hasAnchor(line)) continue;
      if (!uniLike(line) && line.length < u.length + 6) continue;
      const better = line.length > u.length + 2 || looksTruncated;
      if (better && (!best || line.length > best.length)) {
        best = line;
      }
    }
    return best;
  }

  private static repairEducationUniversitiesFromCvText(
    education: Array<{ id: string; university: string; department: string; startDate: string; endDate: string }>,
    cvText: string
  ): Array<{ id: string; university: string; department: string; startDate: string; endDate: string }> {
    if (!cvText?.trim() || !education.length) return education;

    const sectionLines = CompanyBasedCVService.getCvEducationSectionLines(cvText);
    if (!sectionLines.length) return education;

    const uniLikeLines = sectionLines.filter((line) =>
      /üni|universit|college|institute|academy|politeknik|school\b/i.test(line)
    );

    return education.map((edu, index) => {
      const u = (edu.university || '').trim();
      if (!u) return edu;

      let replacement = CompanyBasedCVService.pickRicherUniversityLineFromEducationSection(sectionLines, u);

      if (!replacement && uniLikeLines[index]) {
        const cand = uniLikeLines[index];
        const token = u.split(/[\s,/]+/).find((w) => w.length >= 4);
        if (token && cand.toLowerCase().includes(token.toLowerCase())) {
          replacement = cand;
        }
      }

      if (replacement && replacement.trim() !== u) {
        return { ...edu, university: replacement.trim() };
      }
      return edu;
    });
  }

  // AI cevabını şemaya zorla ve eksikleri metinden tamamla
  private static normalizeParsedCVData(parsedData: any, cvText: string): Partial<CompanyBasedCVData> {
    const fallback = this.parseCVDataSimple(cvText);
    const parsedPersonal = parsedData?.personalInfo || {};
    const fallbackPersonal = fallback.personalInfo || ({} as any);

    const linkedin = parsedPersonal.linkedin || fallbackPersonal.linkedin || '';
    const github = parsedPersonal.github || fallbackPersonal.github || '';
    const portfolio = parsedPersonal.portfolio || fallbackPersonal.portfolio || '';

    const workExperience = Array.isArray(parsedData?.workExperience)
      ? parsedData.workExperience
          .filter((item: any) => item)
          .map((item: any, index: number) => ({
            id: String(item.id ?? index + 1),
            position: String(item.position ?? ''),
            company: String(item.company ?? ''),
            city: String(item.city ?? ''),
            country: String(item.country ?? ''),
            startDate: this.normalizeDateToYYYYMM(String(item.startDate ?? '')),
            endDate: this.normalizeDateToYYYYMM(String(item.endDate ?? '')),
            bulletPoints: Array.isArray(item.bulletPoints)
              ? item.bulletPoints.map((bp: any) => String(bp ?? '')).filter((bp: string) => bp.trim().length > 0)
              : []
          }))
      : [];

    const educationRaw = Array.isArray(parsedData?.education)
      ? parsedData.education
          .filter((item: any) => item)
          .map((item: any, index: number) => ({
            id: String(item.id ?? index + 1),
            university: String(item.university ?? ''),
            department: String(item.department ?? ''),
            startDate: this.normalizeDateToYYYYMM(String(item.startDate ?? '')),
            endDate: this.normalizeDateToYYYYMM(String(item.endDate ?? ''))
          }))
      : [];

    const education = CompanyBasedCVService.repairEducationUniversitiesFromCvText(educationRaw, cvText);

    const skills = this.normalizeSkills(parsedData?.skills);
    const languages = this.normalizeLanguages(parsedData?.languages);

    return {
      personalInfo: {
        firstName: String(parsedPersonal.firstName ?? fallbackPersonal.firstName ?? ''),
        lastName: String(parsedPersonal.lastName ?? fallbackPersonal.lastName ?? ''),
        title: String(parsedPersonal.title ?? fallbackPersonal.title ?? ''),
        country: String(parsedPersonal.country ?? fallbackPersonal.country ?? ''),
        city: String(parsedPersonal.city ?? fallbackPersonal.city ?? ''),
        phone: String(parsedPersonal.phone ?? fallbackPersonal.phone ?? ''),
        email: String(parsedPersonal.email ?? fallbackPersonal.email ?? ''),
        portfolio: String(portfolio),
        github: String(github),
        linkedin: String(linkedin)
      },
      about: String(parsedData?.about ?? ''),
      workExperience,
      education,
      skills,
      languages
    };
  }

  private static normalizeSkills(skills: any): string[] {
    if (Array.isArray(skills)) {
      return skills.map((skill: any) => String(skill ?? '').trim()).filter((skill: string) => skill.length > 0);
    }
    if (typeof skills === 'string') {
      return skills
        .split(/,|\n|•|·|-/g)
        .map((skill: string) => skill.trim())
        .filter((skill: string) => skill.length > 0);
    }
    return [];
  }

  private static normalizeLanguages(languages: any): Array<{ id: string; language: string; level: string }> {
    if (!Array.isArray(languages)) return [];
    return languages
      .filter((item: any) => item)
      .map((item: any, index: number) => ({
        id: String(item.id ?? index + 1),
        language: String(item.language ?? ''),
        level: String(item.level ?? '')
      }))
      .filter((item: { language: string; level: string }) => item.language.trim().length > 0 || item.level.trim().length > 0);
  }

  private static normalizeDateToYYYYMM(rawDate: string): string {
    if (!rawDate) return '';
    const date = rawDate.trim();
    if (!date) return '';
    if (/present|devam|current/i.test(date)) return 'Present';

    const directMatch = date.match(/^(\d{4})[-\/.](\d{1,2})$/);
    if (directMatch) {
      const year = directMatch[1];
      const month = directMatch[2].padStart(2, '0');
      return `${year}-${month}`;
    }

    const reverseMatch = date.match(/^(\d{1,2})[-\/.](\d{4})$/);
    if (reverseMatch) {
      const month = reverseMatch[1].padStart(2, '0');
      const year = reverseMatch[2];
      return `${year}-${month}`;
    }

    const monthMap: Record<string, string> = {
      jan: '01', oca: '01',
      feb: '02', sub: '02', şub: '02',
      mar: '03',
      apr: '04', nis: '04',
      may: '05',
      jun: '06', haz: '06',
      jul: '07', tem: '07',
      aug: '08', agu: '08', ağu: '08',
      sep: '09', eyl: '09',
      oct: '10', eki: '10',
      nov: '11', kas: '11',
      dec: '12', ara: '12'
    };

    const monthYear = date.toLowerCase().match(/([a-zçğıöşü]+)\s+(\d{4})/i);
    if (monthYear) {
      const monthToken = monthYear[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const year = monthYear[2];
      const month = monthMap[monthToken];
      if (month) return `${year}-${month}`;
    }

    return date;
  }

  // Basit CV parsing (fallback)
  private static parseCVDataSimple(cvText: string): Partial<CompanyBasedCVData> {
    const lines = cvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Kişisel bilgileri çıkarmaya çalış
    const personalInfo: any = {};
    
    // Email bul
    const emailMatch = cvText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) personalInfo.email = emailMatch[1];
    
    // Telefon bul
    const phoneMatch = cvText.match(/(\+?[0-9\s\-\(\)]{10,})/);
    if (phoneMatch) personalInfo.phone = phoneMatch[1];
    
    // LinkedIn, GitHub, Portfolio bul
    const linkedinMatch = cvText.match(/(linkedin\.com\/in\/[a-zA-Z0-9\-]+)/i);
    if (linkedinMatch) personalInfo.linkedin = `https://${linkedinMatch[1]}`;
    
    const githubMatch = cvText.match(/(github\.com\/[a-zA-Z0-9\-]+)/i);
    if (githubMatch) personalInfo.github = `https://${githubMatch[1]}`;
    
    const portfolioMatch = cvText.match(/(https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})/);
    if (portfolioMatch) personalInfo.portfolio = portfolioMatch[1];
    
    return {
      personalInfo: {
        firstName: personalInfo.firstName || '',
        lastName: personalInfo.lastName || '',
        title: personalInfo.title || 'Software Developer',
        country: personalInfo.country || '',
        city: personalInfo.city || '',
        phone: personalInfo.phone || '',
        email: personalInfo.email || '',
        portfolio: personalInfo.portfolio || '',
        github: personalInfo.github || '',
        linkedin: personalInfo.linkedin || ''
      },
      about: '',
      workExperience: [],
      education: [],
      skills: [],
      languages: []
    };
  }

  // Belirli bir bölümü çıkar
  private static extractSection(text: string, keywords: string[]): string {
    const lines = text.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;
    
    // Bölüm başlangıcını bul
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        sectionStart = i;
        break;
      }
    }
    
    if (sectionStart === -1) return '';
    
    // Bölüm sonunu bul (sonraki başlık veya boş satır)
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '' || this.isSectionHeader(line)) {
        sectionEnd = i;
        break;
      }
    }
    
    if (sectionEnd === -1) sectionEnd = lines.length;
    
    return lines.slice(sectionStart + 1, sectionEnd)
      .join(' ')
      .trim();
  }

  // Başlık olup olmadığını kontrol et
  private static isSectionHeader(line: string): boolean {
    const headers = ['deneyim', 'experience', 'eğitim', 'education', 'beceriler', 'skills', 'diller', 'languages'];
    return headers.some(header => line.toLowerCase().includes(header));
  }
}
