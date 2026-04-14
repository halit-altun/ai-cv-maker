import { 
  CompanyInfo, 
  CompanyLink,
  CVAnalysisRequest, 
  CVAnalysisResponse, 
  GeminiAPIRequest, 
  GeminiAPIResponse,
  CompanyBasedCVData,
  CompanyBasedUnifiedAnalysisParams,
  CompanyBasedUnifiedAnalysisResult
} from './types';
import { buildCompanyBasedUnifiedPrompt } from './unifiedCompanyAnalysisPrompt';
import { buildParseCvJsonPrompt, buildAdaptCvAnalysisPrompt } from './legacyParseAndAdaptPrompts';
import { buildCompanyCoverLetterPrompt, buildCompanyLinkedInMessagePrompt } from './legacyOutreachPrompts';

// Gemini API Keys - Environment only (no hardcoded fallback)
const GEMINI_API_KEYS = [process.env.NEXT_PUBLIC_GEMINI_API_KEY_1].filter((key): key is string =>
  Boolean(key && key.trim())
);
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// API Key rotation system
let currentApiKeyIndex = 0;

/** Çoklu Gemini modunda ardışık istekler arası sabit bekleme (rate limit için) */
const LEGACY_GEMINI_STAGGER_MS = 7000;

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
        
        const linkResponse = await this.callGeminiAPI(linkPrompt);
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
    
    const combinedResponse = await this.callGeminiAPI(combinedPrompt);
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

    const response = await this.callGeminiAPI(prompt);
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

    const response = await this.callGeminiAPI(prompt);
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
    const prompt = buildAdaptCvAnalysisPrompt(request, { bundledSingleCall: false });

    const response = await this.callGeminiAPI(prompt);
    return this.parseJSONResponse(response);
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
    const { companyInfo, personalInfo, recipientCompanyName } = params;
    const recipientCompanyNameClean = recipientCompanyName?.trim() ? recipientCompanyName.trim() : undefined;

    const prompt = buildCompanyCoverLetterPrompt({
      ...params,
      cvLanguage: params.cvLanguage ?? 'turkish',
      candidateExperienceYears: params.candidateExperienceYears ?? null
    });

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
    const { companyInfo, personalInfo, recipientCompanyName } = params;
    const recipientCompanyNameClean = recipientCompanyName?.trim() ? recipientCompanyName.trim() : undefined;

    const prompt = buildCompanyLinkedInMessagePrompt({
      ...params,
      cvLanguage: params.cvLanguage ?? 'turkish',
      candidateExperienceYears: params.candidateExperienceYears ?? null
    });

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

  // Gemini API'yi çağır - Fallback sistemi ile
  private static async callGeminiAPI(prompt: string, retryCount: number = 0): Promise<string> {
    const requestBody: GeminiAPIRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    // API key kontrolü
    if (GEMINI_API_KEYS.length === 0) {
      throw new Error('No valid API keys found. Please check your environment variables.');
    }

    const currentApiKey = GEMINI_API_KEYS[currentApiKeyIndex];
    
    if (!currentApiKey) {
      throw new Error(`API key at index ${currentApiKeyIndex} is undefined.`);
    }
    
    try {
      console.log(`Using API key ${currentApiKeyIndex + 1}/${GEMINI_API_KEYS.length}: ${currentApiKey.substring(0, 10)}...`);
      
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': currentApiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Rate limit hatası (429) veya diğer hatalar
        if (response.status === 429) {
          console.warn(`Rate limit hit with API key ${currentApiKeyIndex + 1}, trying next key...`);
          
          // Sonraki API key'e geç
          currentApiKeyIndex = (currentApiKeyIndex + 1) % GEMINI_API_KEYS.length;
          
          // Eğer tüm API key'ler denendiyse ve hala hata varsa
          if (retryCount >= GEMINI_API_KEYS.length - 1) {
            throw new Error(`All API keys exhausted. Last error: ${response.status} ${response.statusText}`);
          }
          
          // Kısa bir bekleme sonrası tekrar dene
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.callGeminiAPI(prompt, retryCount + 1);
        }
        
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiAPIResponse = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        console.log(`API call successful with key ${currentApiKeyIndex + 1}`);
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Gemini API did not return valid response');
      }
    } catch (error) {
      console.error(`Gemini API call failed with key ${currentApiKeyIndex + 1}:`, error);
      
      // Eğer rate limit hatası değilse veya tüm key'ler denendiyse hatayı fırlat
      if (!(error as Error).message.includes('429') || retryCount >= GEMINI_API_KEYS.length - 1) {
        throw error;
      }
      
      // Sonraki API key'e geç ve tekrar dene
      currentApiKeyIndex = (currentApiKeyIndex + 1) % GEMINI_API_KEYS.length;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.callGeminiAPI(prompt, retryCount + 1);
    }
  }

  // JSON response'u parse et
  private static parseJSONResponse(response: string): any {
    console.log('Raw response:', response);
    
    try {
      // Markdown code block'ları temizle
      let cleanResponse = response.trim();
      
      // ```json ve ``` karakterlerini kaldır
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      cleanResponse = cleanResponse.replace(/```\s*/g, '');
      
      // Başında ve sonunda gereksiz karakterler varsa temizle
      cleanResponse = cleanResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Eğer hala ``` karakterleri varsa, onları da temizle
      cleanResponse = cleanResponse.replace(/```/g, '');
      
      console.log('Cleaned response:', cleanResponse);
      
      const parsed = JSON.parse(cleanResponse);
      console.log('Parsed successfully:', parsed);
      return parsed;
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Original response:', response);
      
      // Daha agresif temizleme dene
      try {
        let aggressiveClean = response;
        
        // Tüm markdown karakterlerini kaldır
        aggressiveClean = aggressiveClean.replace(/```json\s*/g, '');
        aggressiveClean = aggressiveClean.replace(/```\s*/g, '');
        aggressiveClean = aggressiveClean.replace(/```/g, '');
        
        // Başlangıç ve bitiş metinlerini kaldır
        aggressiveClean = aggressiveClean.replace(/^[^{]*/, '');
        aggressiveClean = aggressiveClean.replace(/[^}]*$/, '');
        
        // JSON objesini bul
        const jsonMatch = aggressiveClean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          
          // Son kalan karakterleri temizle
          jsonStr = jsonStr.replace(/,\s*}/g, '}');
          jsonStr = jsonStr.replace(/,\s*]/g, ']');
          
          console.log('Extracted JSON:', jsonStr);
          return JSON.parse(jsonStr);
        }
      } catch (secondError) {
        console.error('Second parsing attempt failed:', secondError);
      }
      
      // Fallback: Varsayılan değerler döndür
      console.log('Using fallback values');
      return {
        name: "Şirket Adı",
        website: "https://example.com",
        description: "Şirket açıklaması alınamadı",
        industry: "Teknoloji",
        values: ["İnovasyon", "Kalite", "Müşteri Odaklılık"],
        requirements: ["Deneyim", "Ekip Çalışması", "Problem Çözme"],
        culture: "Dinamik ve yenilikçi çalışma ortamı"
      };
    }
  }

  /** Birleşik analiz yanıtı için: şirket fallback'i olmadan JSON zorunlu */
  private static parseJSONResponseStrict(response: string): any {
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    cleanResponse = cleanResponse.replace(/```/g, '');
    cleanResponse = cleanResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    try {
      return JSON.parse(cleanResponse);
    } catch (firstError) {
      let aggressiveClean = response;
      aggressiveClean = aggressiveClean.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/```/g, '');
      aggressiveClean = aggressiveClean.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      const jsonMatch = aggressiveClean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        jsonStr = jsonStr.replace(/,\s*}/g, '}');
        jsonStr = jsonStr.replace(/,\s*]/g, ']');
        return JSON.parse(jsonStr);
      }
      throw firstError instanceof Error ? firstError : new Error('JSON parse failed');
    }
  }

  private static coerceCvAnalysisResponse(raw: any): CVAnalysisResponse {
    const score = typeof raw?.matchScore === 'number' ? raw.matchScore : Number(raw?.matchScore);
    const matchScore = Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 0;
    const pm = Array.isArray(raw?.positiveMatches) ? raw.positiveMatches : [];
    const nm = Array.isArray(raw?.negativeMismatches) ? raw.negativeMismatches : [];
    return {
      originalAbout: String(raw?.originalAbout ?? ''),
      updatedAbout: String(raw?.updatedAbout ?? ''),
      originalExperience: CompanyBasedCVService.stringifyAnalysisField(raw?.originalExperience),
      updatedExperience: CompanyBasedCVService.stringifyAnalysisField(raw?.updatedExperience),
      originalSkills: CompanyBasedCVService.stringifyAnalysisField(raw?.originalSkills),
      updatedSkills: CompanyBasedCVService.stringifyAnalysisField(raw?.updatedSkills),
      originalLanguages: CompanyBasedCVService.stringifyAnalysisField(raw?.originalLanguages),
      updatedLanguages: CompanyBasedCVService.stringifyAnalysisField(raw?.updatedLanguages),
      recommendations: Array.isArray(raw?.recommendations)
        ? raw.recommendations.map((x: any) => String(x ?? '')).filter(Boolean)
        : [],
      matchScore,
      positiveMatches: pm
        .map((x: any) => ({
          label: String(x?.label ?? ''),
          evidence: String(x?.evidence ?? '')
        }))
        .filter((x: { label: string }) => x.label.trim().length > 0),
      negativeMismatches: nm
        .map((x: any) => ({
          label: String(x?.label ?? ''),
          gap: String(x?.gap ?? ''),
          evidence: x?.evidence !== undefined ? String(x.evidence) : undefined
        }))
        .filter((x: { label: string }) => x.label.trim().length > 0)
    };
  }

  private static finalizeCoverLetterFromAiBody(
    letter: string,
    personalInfo: Partial<CompanyBasedCVData['personalInfo']> | undefined,
    companyInfo: CompanyInfo | undefined,
    recipientCompanyNameClean: string | undefined
  ): string {
    let out = letter.trim().replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim();
    out = CompanyBasedCVService.normalizeOutreachLetterFormatting(out.replace(/\[company\]/gi, ''));
    if (recipientCompanyNameClean) {
      const lines = out.split('\n');
      if (lines.length > 0 && !lines[0].includes(recipientCompanyNameClean)) {
        lines[0] = `${lines[0].replace(/\s*-\s*$/, '').trim()} - ${recipientCompanyNameClean}`;
        out = lines.join('\n');
      }
    } else {
      if (companyInfo?.name) {
        const escaped = companyInfo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = CompanyBasedCVService.normalizeOutreachLetterFormatting(out.replace(new RegExp(escaped, 'gi'), ''));
      }
      out = out.replace(/-\s*\n/, '\n');
    }
    const signatureBlock = CompanyBasedCVService.buildOutreachSignatureBlock(personalInfo);
    return `${out}\n\n${signatureBlock}`.trim();
  }

  private static finalizeLinkedInFromAiBody(
    message: string,
    personalInfo: Partial<CompanyBasedCVData['personalInfo']> | undefined,
    companyInfo: CompanyInfo | undefined,
    recipientCompanyNameClean: string | undefined
  ): string {
    let out = message.trim().replace(/^```[\s\S]*?\n/, '').replace(/```$/, '').trim();
    out = CompanyBasedCVService.normalizeOutreachLetterFormatting(out.replace(/\[company\]/gi, ''));
    if (!recipientCompanyNameClean && companyInfo?.name) {
      const escaped = companyInfo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = CompanyBasedCVService.normalizeOutreachLetterFormatting(out.replace(new RegExp(escaped, 'gi'), ''));
    }
    const signatureBlock = CompanyBasedCVService.buildOutreachSignatureBlock(personalInfo);
    return `${out}\n\n${signatureBlock}`.trim();
  }

  /**
   * Şirket/ilan bazlı tam analiz: PDF sonrası tek Gemini isteği (parse + uyarlama + isteğe bağlı cover/LinkedIn gövdesi).
   */
  static async analyzeCompanyBasedCvUnified(
    params: CompanyBasedUnifiedAnalysisParams
  ): Promise<CompanyBasedUnifiedAnalysisResult> {
    const prompt = buildCompanyBasedUnifiedPrompt(params);
    const raw = await this.callGeminiAPI(prompt);
    let data: any;
    try {
      data = CompanyBasedCVService.parseJSONResponseStrict(raw);
    } catch (e) {
      console.error('Unified analysis JSON parse failed:', e);
      throw new Error('Tek seferlik AI analizi JSON olarak çözülemedi. Lütfen tekrar deneyin.');
    }

    const parsedCVData = CompanyBasedCVService.normalizeParsedCVData(data?.parsedCV ?? {}, params.cvText);
    const analysis = CompanyBasedCVService.coerceCvAnalysisResponse(data?.analysis ?? {});

    const recipientCompanyNameClean = params.coverLetterCompanyName?.trim()
      ? params.coverLetterCompanyName.trim()
      : undefined;

    let coverLetter = '';
    if (params.generateCoverLetter) {
      const body = String(data?.coverLetterBody ?? '').trim();
      const companyForPolish =
        params.coverLetterSource === 'company' ? params.companyInfo : undefined;
      coverLetter = CompanyBasedCVService.finalizeCoverLetterFromAiBody(
        body,
        parsedCVData.personalInfo,
        companyForPolish,
        recipientCompanyNameClean
      );
    }

    let linkedinMessage = '';
    if (params.generateLinkedInMessage) {
      const body = String(data?.linkedinMessageBody ?? '').trim();
      const companyForPolish =
        params.linkedinTargetSource === 'company' ? params.companyInfo : undefined;
      linkedinMessage = CompanyBasedCVService.finalizeLinkedInFromAiBody(
        body,
        parsedCVData.personalInfo,
        companyForPolish,
        recipientCompanyNameClean
      );
    }

    return { parsedCVData, analysis, coverLetter, linkedinMessage };
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static sanitizeOutreachRoleTitle(value: string | undefined): string {
    let role = (value || '').trim();
    role = role.replace(/^[\-\s:]+|[\-\s:]+$/g, '');
    role = role.replace(/\s+/g, ' ');
    role = role.replace(/^founding\s+/i, '');
    return role.trim();
  }

  private static computeCandidateExperienceMeta(
    workExperience: CompanyBasedCVData['workExperience'] | undefined
  ): { years: number | null; range: { start: string; end: string } | null } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const parseYYYYMM = (value: string) => {
      const m = value.match(/^(\d{4})-(\d{2})$/);
      if (!m) return null;
      return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
    };

    const validItems = Array.isArray(workExperience) ? workExperience : [];
    const hasPresentEnd = validItems.some(
      (item) => typeof item?.endDate === 'string' && /present|devam|current/i.test(item.endDate)
    );
    const starts = validItems
      .map((i) => (i?.startDate ? parseYYYYMM(i.startDate) : null))
      .filter(Boolean) as Array<{ year: number; month: number }>;

    if (starts.length === 0) {
      return { years: null, range: null };
    }

    const earliest = starts.reduce((acc, cur) => {
      if (cur.year < acc.year) return cur;
      if (cur.year === acc.year && cur.month < acc.month) return cur;
      return acc;
    }, starts[0]);

    let latestEnd: { year: number; month: number } | null = null;
    for (const item of validItems) {
      if (!item?.endDate) continue;
      if (/present|devam|current/i.test(item.endDate)) {
        latestEnd = { year: currentYear, month: currentMonth };
        break;
      }
      const parsed = parseYYYYMM(item.endDate);
      if (!parsed) continue;
      if (!latestEnd) {
        latestEnd = parsed;
      } else if (parsed.year > latestEnd.year || (parsed.year === latestEnd.year && parsed.month > latestEnd.month)) {
        latestEnd = parsed;
      }
    }

    if (!latestEnd) {
      return { years: null, range: null };
    }

    const months = (latestEnd.year * 12 + latestEnd.month) - (earliest.year * 12 + earliest.month) + 1;
    const years = Math.max(0, Math.floor(months / 12));

    return {
      years,
      range: {
        start: `${earliest.year}-${String(earliest.month).padStart(2, '0')}`,
        end: hasPresentEnd ? 'Present' : [latestEnd.year, String(latestEnd.month).padStart(2, '0')].join('-')
      }
    };
  }

  /**
   * Eski çoklu istek akışı: parse → (bekle) → uyarlama → (bekle) → cover → (bekle) → LinkedIn.
   * Rate limit riskini azaltmak için ardışık çağrılar arasında sabit 7 sn beklenir ({@link LEGACY_GEMINI_STAGGER_MS}).
   */
  static async analyzeCompanyBasedCvLegacyStaggered(
    params: CompanyBasedUnifiedAnalysisParams
  ): Promise<CompanyBasedUnifiedAnalysisResult> {
    const delay = LEGACY_GEMINI_STAGGER_MS;

    const parsedCVData = await CompanyBasedCVService.parseCVDataWithAI(params.cvText, params.cvLanguage);
    await CompanyBasedCVService.sleep(delay);

    const experienceMeta = CompanyBasedCVService.computeCandidateExperienceMeta(parsedCVData.workExperience);

    const analysis = await CompanyBasedCVService.analyzeAndAdaptCV({
      cvText: params.cvText,
      companyUrl: params.adaptationSource === 'company' ? params.companyUrl : undefined,
      companyInfo: params.adaptationSource === 'company' ? params.companyInfo : undefined,
      jobDescriptionText: params.adaptationSource === 'text' ? params.jobDescriptionText : undefined,
      targetPosition: CompanyBasedCVService.sanitizeOutreachRoleTitle(params.targetPositionHint) || undefined,
      adaptationSource: params.adaptationSource,
      cvLanguage: params.cvLanguage,
      candidateExperienceYears: experienceMeta.years,
      candidateExperienceRange: experienceMeta.range ?? undefined,
      candidateSkills: parsedCVData.skills || [],
      candidateLanguages: parsedCVData.languages || [],
      manualMustMentionTopics: params.manualMustMentionTopics,
      manualMustNotMentionTopics: params.manualMustNotMentionTopics
    });

    const aboutForCoverLetter = params.aiAdaptation.about
      ? analysis.updatedAbout
      : parsedCVData.about || '';

    const cvWorkHighlights = (parsedCVData.workExperience || [])
      .flatMap((w) => (Array.isArray(w?.bulletPoints) ? w.bulletPoints : []))
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    const numericHighlights = cvWorkHighlights.filter((b) => /\d/.test(b) || /%/.test(b));
    const selectedHighlights = (numericHighlights.length >= 3 ? numericHighlights : cvWorkHighlights).slice(0, 8);

    const targetPositionForOutreach =
      CompanyBasedCVService.sanitizeOutreachRoleTitle(params.targetPositionHint) ||
      CompanyBasedCVService.sanitizeOutreachRoleTitle(parsedCVData.personalInfo?.title) ||
      'Full Stack Web Developer';

    const outreachRecipientName = params.coverLetterRecipientName?.trim()
      ? params.coverLetterRecipientName.trim()
      : undefined;
    const outreachRecipientCompany = params.coverLetterCompanyName?.trim()
      ? params.coverLetterCompanyName.trim()
      : undefined;

    const hasOutreach = params.generateCoverLetter || params.generateLinkedInMessage;
    if (hasOutreach) {
      await CompanyBasedCVService.sleep(delay);
    }

    let coverLetter = '';
    if (params.generateCoverLetter) {
      coverLetter = await CompanyBasedCVService.generateCompanyCoverLetter({
        source: params.coverLetterSource,
        companyInfo: params.coverLetterSource === 'company' ? params.companyInfo : undefined,
        jobDescriptionText: params.coverLetterSource === 'text' ? params.jobDescriptionText : undefined,
        personalInfo: parsedCVData.personalInfo,
        about: aboutForCoverLetter,
        cvLanguage: params.cvLanguage,
        candidateExperienceYears: experienceMeta.years,
        candidateSkills: parsedCVData.skills || [],
        candidateHighlights: selectedHighlights,
        recipientName: outreachRecipientName,
        recipientCompanyName: outreachRecipientCompany,
        targetPosition: targetPositionForOutreach,
        manualMustMentionTopics: params.manualMustMentionTopics,
        manualMustNotMentionTopics: params.manualMustNotMentionTopics
      });
      if (params.generateLinkedInMessage) {
        await CompanyBasedCVService.sleep(delay);
      }
    }

    let linkedinMessage = '';
    if (params.generateLinkedInMessage) {
      linkedinMessage = await CompanyBasedCVService.generateCompanyLinkedInMessage({
        source: params.linkedinTargetSource,
        companyInfo: params.linkedinTargetSource === 'company' ? params.companyInfo : undefined,
        jobDescriptionText: params.linkedinTargetSource === 'text' ? params.jobDescriptionText : undefined,
        personalInfo: parsedCVData.personalInfo,
        about: aboutForCoverLetter,
        cvLanguage: params.cvLanguage,
        candidateExperienceYears: experienceMeta.years,
        candidateSkills: parsedCVData.skills || [],
        candidateHighlights: selectedHighlights,
        recipientName: outreachRecipientName,
        recipientCompanyName: outreachRecipientCompany,
        targetPosition: targetPositionForOutreach,
        manualMustMentionTopics: params.manualMustMentionTopics,
        manualMustNotMentionTopics: params.manualMustNotMentionTopics
      });
    }

    return { parsedCVData, analysis, coverLetter, linkedinMessage };
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

    const prompt = buildParseCvJsonPrompt(cvText, cvLanguage);

    try {
      console.log('=== AI PARSING STARTED ===');
      const response = await this.callGeminiAPI(prompt);
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

  /** Tekil "Ad Soyad" → firstName / lastName (birleşik AI yanıtları için). */
  private static splitFullNameFromString(fullName: string): { firstName: string; lastName: string } {
    const t = fullName.trim().replace(/\s+/g, ' ');
    if (!t) return { firstName: '', lastName: '' };
    const parts = t.split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  /** "Istanbul, Turkey" veya benzeri → city / country. */
  private static parseCityCountryFromLocationString(location: string): { city: string; country: string } {
    const t = location.trim();
    if (!t) return { city: '', country: '' };
    const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return { city: parts[0], country: parts[parts.length - 1] };
    return { city: parts[0] || '', country: '' };
  }

  /** AI'nın `urls` dizisinden linkedin / github / portfolio çıkarır. */
  private static extractSocialUrlsFromAiPersonal(urls: unknown): { linkedin: string; github: string; portfolio: string } {
    const out = { linkedin: '', github: '', portfolio: '' };
    const candidates: string[] = [];
    if (Array.isArray(urls)) {
      for (const u of urls) candidates.push(String(u ?? '').trim());
    } else if (typeof urls === 'string' && urls.trim()) {
      candidates.push(urls.trim());
    }
    for (let raw of candidates) {
      if (!raw) continue;
      if (!/^https?:\/\//i.test(raw)) {
        raw = `https://${raw.replace(/^\/+/, '')}`;
      }
      const lower = raw.toLowerCase();
      if (lower.includes('linkedin.com')) {
        if (!out.linkedin) out.linkedin = raw;
      } else if (lower.includes('github.com')) {
        if (!out.github) out.github = raw;
      } else if (!out.portfolio) {
        out.portfolio = raw;
      }
    }
    return out;
  }

  /**
   * "2025-01 - Present", "2023-08 - 2023-10" gibi aralıkları ayırır (tire/en tire).
   */
  private static splitCvDateRange(raw: string): { start: string; end: string } {
    const s = raw.replace(/\u2013|\u2014/g, '-').trim();
    if (!s) return { start: '', end: '' };
    const rangeRe = /^(\d{4}-\d{1,2})\s*-\s*(Present|Current|Devam|Şu\s*an|\d{4}-\d{1,2})/i;
    const m = s.match(rangeRe);
    if (m) {
      const startNorm = CompanyBasedCVService.normalizeDateToYYYYMM(m[1]);
      const endToken = m[2];
      if (/present|current|devam|şu\s*an/i.test(endToken)) {
        return { start: startNorm, end: 'Present' };
      }
      return { start: startNorm, end: CompanyBasedCVService.normalizeDateToYYYYMM(endToken) };
    }
    const single = s.match(/^(\d{4}-\d{1,2})$/);
    if (single) {
      return { start: CompanyBasedCVService.normalizeDateToYYYYMM(single[1]), end: '' };
    }
    return { start: '', end: '' };
  }

  /** `page.tsx` içindeki `parseWorkExperienceFromText` ile uyumlu metin üretir. */
  private static formatWorkExperienceArrayAsAdaptationText(items: any[]): string {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items
      .map((item) => {
        const position = String(item?.position ?? item?.title ?? '').trim();
        const company = String(item?.company ?? '').trim();
        const dates = String(item?.dates ?? '').trim();
        const startRaw = String(item?.startDate ?? '').trim();
        const endRaw = String(item?.endDate ?? '').trim();
        const dateLine =
          dates || (startRaw && endRaw ? `${startRaw} - ${endRaw}` : startRaw || endRaw || '');
        const details = Array.isArray(item?.details)
          ? item.details
          : Array.isArray(item?.bulletPoints)
            ? item.bulletPoints
            : [];
        const bullets = details
          .map((d: any) => `• ${String(d ?? '').trim()}`)
          .filter((b: string) => b.length > 2);
        const header = [position, company].filter(Boolean).join('\n');
        const parts = [header, dateLine, ...bullets].filter((p) => typeof p === 'string' && p.length > 0);
        return parts.join('\n');
      })
      .filter((block) => block.length > 0)
      .join('\n\n');
  }

  /** analysis alanlarında dizi / nesne geldiğinde UI metnine çevirir. */
  private static stringifyAnalysisField(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      const first = value[0];
      if (first !== null && typeof first === 'object') {
        const keys = Object.keys(first as object);
        if (
          keys.includes('company') &&
          (keys.includes('title') || keys.includes('position') || keys.includes('details') || keys.includes('bulletPoints'))
        ) {
          return CompanyBasedCVService.formatWorkExperienceArrayAsAdaptationText(value as any[]);
        }
        if (keys.includes('language')) {
          return (value as any[])
            .map((l) => `${String(l?.language ?? '').trim()}${l?.level ? ` (${String(l.level).trim()})` : ''}`)
            .filter(Boolean)
            .join(', ');
        }
      }
      return value
        .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        .join(', ');
    }
    return String(value);
  }

  // AI cevabını şemaya zorla ve eksikleri metinden tamamla
  private static normalizeParsedCVData(parsedData: any, cvText: string): Partial<CompanyBasedCVData> {
    const fallback = this.parseCVDataSimple(cvText);
    const parsedPersonal = parsedData?.personalInfo || {};
    const fallbackPersonal = fallback.personalInfo || ({} as any);

    const fromUrls = CompanyBasedCVService.extractSocialUrlsFromAiPersonal(
      parsedPersonal.urls ?? parsedPersonal.links
    );

    let linkedin = String(parsedPersonal.linkedin || fromUrls.linkedin || fallbackPersonal.linkedin || '').trim();
    let github = String(parsedPersonal.github || fromUrls.github || fallbackPersonal.github || '').trim();
    let portfolio = String(
      parsedPersonal.portfolio || fromUrls.portfolio || fallbackPersonal.portfolio || ''
    ).trim();

    const fullNameRaw = String(parsedPersonal.name ?? '').trim();
    const fromFullName = fullNameRaw ? CompanyBasedCVService.splitFullNameFromString(fullNameRaw) : { firstName: '', lastName: '' };

    let city = String(parsedPersonal.city ?? '').trim();
    let country = String(parsedPersonal.country ?? '').trim();
    const locationRaw = String(parsedPersonal.location ?? '').trim();
    if ((!city || !country) && locationRaw) {
      const loc = CompanyBasedCVService.parseCityCountryFromLocationString(locationRaw);
      if (!city) city = loc.city;
      if (!country) country = loc.country;
    }

    const workExperience = Array.isArray(parsedData?.workExperience)
      ? parsedData.workExperience
          .filter((item: any) => item)
          .map((item: any, index: number) => {
            const position = String(item.position ?? item.title ?? '').trim();
            const company = String(item.company ?? '').trim();
            let wCity = String(item.city ?? '').trim();
            let wCountry = String(item.country ?? '').trim();
            const loc = String(item.location ?? '').trim();
            if ((!wCity || !wCountry) && loc) {
              const parsedLoc = CompanyBasedCVService.parseCityCountryFromLocationString(loc);
              if (!wCity) wCity = parsedLoc.city;
              if (!wCountry) wCountry = parsedLoc.country;
            }
            let startDate = String(item.startDate ?? '').trim();
            let endDate = String(item.endDate ?? '').trim();
            const datesStr = String(item.dates ?? '').trim();
            if (datesStr && (!startDate || !endDate)) {
              const dr = CompanyBasedCVService.splitCvDateRange(datesStr);
              if (!startDate) startDate = dr.start;
              if (!endDate) endDate = dr.end;
            }
            const bulletPoints = Array.isArray(item.bulletPoints)
              ? item.bulletPoints.map((bp: any) => String(bp ?? '')).filter((bp: string) => bp.trim().length > 0)
              : Array.isArray(item.details)
                ? item.details.map((bp: any) => String(bp ?? '')).filter((bp: string) => bp.trim().length > 0)
                : [];
            return {
              id: String(item.id ?? index + 1),
              position,
              company,
              city: wCity,
              country: wCountry,
              startDate: this.normalizeDateToYYYYMM(startDate),
              endDate: this.normalizeDateToYYYYMM(endDate),
              bulletPoints
            };
          })
      : [];

    const educationRaw = Array.isArray(parsedData?.education)
      ? parsedData.education
          .filter((item: any) => item)
          .map((item: any, index: number) => {
            const university = String(item.university ?? item.institution ?? item.school ?? '').trim();
            const department = String(item.department ?? item.degree ?? item.field ?? '').trim();
            let startDate = String(item.startDate ?? '').trim();
            let endDate = String(item.endDate ?? '').trim();
            const datesStr = String(item.dates ?? '').trim();
            if (datesStr && (!startDate || !endDate)) {
              const dr = CompanyBasedCVService.splitCvDateRange(datesStr);
              if (!startDate) startDate = dr.start;
              if (!endDate) endDate = dr.end;
            }
            return {
              id: String(item.id ?? index + 1),
              university,
              department,
              startDate: this.normalizeDateToYYYYMM(startDate),
              endDate: this.normalizeDateToYYYYMM(endDate)
            };
          })
      : [];

    const education = CompanyBasedCVService.repairEducationUniversitiesFromCvText(educationRaw, cvText);

    const skills = this.normalizeSkills(parsedData?.skills);
    const languages = this.normalizeLanguages(parsedData?.languages);

    return {
      personalInfo: {
        firstName: String(parsedPersonal.firstName ?? fromFullName.firstName ?? fallbackPersonal.firstName ?? ''),
        lastName: String(parsedPersonal.lastName ?? fromFullName.lastName ?? fallbackPersonal.lastName ?? ''),
        title: String(parsedPersonal.title ?? fallbackPersonal.title ?? ''),
        country,
        city,
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
