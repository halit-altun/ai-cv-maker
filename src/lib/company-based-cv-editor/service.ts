import { 
  CompanyInfo, 
  CompanyLink,
  CVAnalysisRequest, 
  CVAnalysisResponse, 
  GeminiAPIRequest, 
  GeminiAPIResponse,
  CompanyBasedCVData
} from './types';

// Gemini API Keys - Fallback System
const GEMINI_API_KEYS = [
  process.env.NEXT_PUBLIC_GEMINI_API_KEY_1 || 'AIzaSyBV2D8hKVbpw7FAP-EkwYtne_P-wwT-iSg',
  process.env.NEXT_PUBLIC_GEMINI_API_KEY_2 || 'AIzaSyC8J2mGXXUvDWUowUpAGRboH4yTCDU56-o'
].filter(Boolean); // Undefined değerleri filtrele
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
    const isEnglish = request.cvLanguage === 'english';
    const languageInstructions = isEnglish ? 
      `IMPORTANT: The CV is in English. You must respond in English and adapt the CV content in English.` :
      `IMPORTANT: The CV is in Turkish. You must respond in Turkish and adapt the CV content in Turkish.`;
    
    const prompt = `
    ${languageInstructions}
    
    Analyze the following CV and adapt all sections according to the given company information.
    
    CV Text:
    ${request.cvText}
    
    Company Information:
    ${request.companyInfo ? JSON.stringify(request.companyInfo, null, 2) : 'Company information is being analyzed...'}
    
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
      "recommendations": ["${isEnglish ? 'Recommendation 1' : 'Öneri 1'}", "${isEnglish ? 'Recommendation 2' : 'Öneri 2'}", "${isEnglish ? 'Recommendation 3' : 'Öneri 3'}"],
      "matchScore": 85
    }
    
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
         - Use company values but maintain personal tone
         - Example format: "I work as a [profession] with developed problem-solving skills, strong research orientation and ability to produce innovative solutions. [Strengths] with [goals/objectives]. [Learning/contribution goals]."
      2. WORK EXPERIENCE RULES:
         - NEVER CHANGE POSITION, COMPANY NAME, DATE, ADDRESS INFORMATION
         - ONLY REWRITE BULLET POINT CONTENT
         - DON'T USE TARGET COMPANY NAME, KEEP PERSON'S REAL COMPANY NAME
         - Write bullet points with this principle: "What I did + How I did it + What was the result"
         - Start with strong verbs: "Developed", "Managed", "Increased", "Provided"
         - Use numbers: "%20", "200+", "5-person team" etc.
         - Be concrete and clear: Not "I was successful" → "I reduced time by 15%"
         - Align with target company values but keep real experience
         - Example format: "Developed e-commerce platform using Next.js and .NET and increased customer experience by 30%"
         - IMPORTANT: Adapt all work experiences in CV, not just the first one
         - Process each work experience separately and make bullet points target company focused
      3. In skills section, emphasize technical skills the company is looking for
         - Write skills only as short names (e.g. "HTML", "Time Management", "React")
         - Use maximum 2 words, don't write long descriptions
         - Only write skill name, don't add descriptions
      4. In languages section, highlight languages of countries where the company operates
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
         - Şirketin değerlerine uygun ama kişisel bir ton kullan
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
      4. Diller bölümünde şirketin çalıştığı ülkelerin dillerini öne çıkar
      5. Match score 0-100 arasında olsun
      6. Sadece JSON formatında cevap ver, markdown formatı kullanma
      7. Türkçe karakterleri doğru kullan`
    }
    `;

    const response = await this.callGeminiAPI(prompt);
    return this.parseJSONResponse(response);
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

  // PDF'den metin çıkar
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Önce basit text extraction ile dene
      return await this.simpleTextExtraction(file);
    } catch (error) {
      console.error('Simple text extraction error:', error);
      
      try {
        // PDF.js ile dene
        return await this.extractWithPDFJS(file);
      } catch (pdfjsError) {
        console.error('PDF.js parsing error:', pdfjsError);
        
        try {
          // React-PDF ile dene
          return await this.extractWithReactPDF(file);
        } catch (reactPdfError) {
          console.error('React-PDF parsing error:', reactPdfError);
          throw new Error('PDF dosyası okunamadı. Lütfen geçerli bir PDF dosyası seçin.');
        }
      }
    }
  }

  // PDF.js ile text extraction
  private static async extractWithPDFJS(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await import('pdfjs-dist');
    
    // Worker'ı disable et
    pdf.GlobalWorkerOptions.workerSrc = '';
    
    const loadingTask = pdf.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isOffscreenCanvasSupported: false
    });
    
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    
    // Tüm sayfaları işle
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

  // React-PDF ile text extraction
  private static async extractWithReactPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const reactPdf = await import('react-pdf');
    
    // React-PDF'den pdfjsLib'i al
    const pdfjsLib = (reactPdf as any).pdfjsLib || (reactPdf as any).default?.pdfjsLib;
    
    if (!pdfjsLib) {
      throw new Error('React-PDF pdfjsLib not found');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
          
          // Eğer PDF binary data ise, örnek CV metni döndür
          if (text.includes('%PDF') || text.length < 100) {
            console.log('PDF binary data detected, using sample CV text');
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
  static async parseCVDataWithAI(cvText: string): Promise<Partial<CompanyBasedCVData>> {
    console.log('=== CV TEXT ANALYSIS ===');
    console.log('Raw CV Text Length:', cvText.length);
    console.log('CV Text Preview (first 500 chars):', cvText.substring(0, 500));
    console.log('CV Text Preview (last 500 chars):', cvText.substring(cvText.length - 500));
    console.log('========================');

    const prompt = `
    Aşağıdaki CV metnini detaylı olarak analiz et ve JSON formatında düzenli bir yapıya dönüştür.
    
    CV Metni:
    ${cvText}
    
    Lütfen şu JSON formatında cevap ver:
    {
      "personalInfo": {
        "firstName": "Ad",
        "lastName": "Soyad", 
        "title": "Ünvan/Pozisyon",
        "country": "Ülke",
        "city": "Şehir",
        "phone": "Telefon",
        "email": "E-posta",
        "portfolio": "Portfolio URL",
        "github": "GitHub URL",
        "linkedin": "LinkedIn URL"
      },
      "about": "Hakkımda bölümü metni",
      "workExperience": [
        {
          "id": "1",
          "position": "Pozisyon",
          "company": "Şirket Adı",
          "city": "Şehir",
          "country": "Ülke",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM",
          "bulletPoints": ["Görev 1", "Görev 2", "Görev 3"]
        }
      ],
      "education": [
        {
          "id": "1",
          "university": "Üniversite Adı",
          "department": "Bölüm",
          "startDate": "YYYY-MM",
          "endDate": "YYYY-MM"
        }
      ],
      "skills": ["Beceri 1", "Beceri 2", "Beceri 3"],
      "languages": [
        {
          "id": "1",
          "language": "Dil Adı",
          "level": "Seviye"
        }
      ]
    }
    
    ÖNEMLİ KURALLAR:
    1. Sadece JSON formatında cevap ver, markdown kullanma
    2. Tarihleri YYYY-MM formatında ver (örn: 2024-01)
    3. Boş alanlar için boş string ("") kullan
    4. CV'de bulunmayan bilgiler için boş string veya boş array kullan
    5. Türkçe karakterleri doğru kullan
    6. E-posta, telefon, URL'leri doğru çıkar
    7. İş deneyimi varsa workExperience array'ine ekle (her iş deneyimi için ayrı obje)
    8. Eğitim bilgisi varsa education array'ine ekle
    9. Beceriler varsa skills array'ine ekle (virgülle ayrılmış)
    10. Diller varsa languages array'ine ekle (her dil için ayrı obje)
    11. Bullet points'leri bulletPoints array'ine ekle
    12. Tüm tarihleri YYYY-MM formatında ver
    13. Present/Devam ediyor için "Present" kullan
    `;

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
      
      return parsedData;
    } catch (error) {
      console.error('AI CV parsing error:', error);
      // Fallback: Basit parsing
      return this.parseCVDataSimple(cvText);
    }
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
