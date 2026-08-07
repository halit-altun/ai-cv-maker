import { CompanyBasedCVService } from '../company-based-cv-editor/service';

export class CVMakerAIService {
  
  // Hakkımda bölümü için AI üretimi
  static async generateAboutSection(prompt: string): Promise<string> {
    const aiPrompt = `
    Aşağıdaki kullanıcı bilgilerini kullanarak profesyonel bir "Hakkımda" bölümü oluştur.

    Kullanıcı Bilgileri:
    ${prompt}

    ÖNEMLİ KURALLAR:
    1. Hakkımda paragrafı kısa, net ve profesyonel olmalı (3-5 cümle)
    2. İçermesi gerekenler:
       - Mesleğin/Uzmanlık alanın
       - Tecrübe/Güçlü yönler
       - Hedef/Kariyer hedefi
       - Öne çıkan yetenekler/araçlar (opsiyonel)
    
    3. Profesyonel format örneği:
    "Problem çözme becerisi gelişmiş, araştırma yönü güçlü ve yenilikçi çözümler üretebilen bir [meslek] olarak çalışıyorum. [Güçlü yönler] ile [hedef/amaç]. [Öğrenme/katkı hedefi]."

    4. Sadece hakkımda metnini döndür, başka açıklama ekleme
    5. Türkçe karakterleri doğru kullan
    6. Profesyonel ve etkileyici bir ton kullan
    `;

    try {
      const response = await CompanyBasedCVService['callGeminiAPI'](aiPrompt);
      return response.trim();
    } catch (error) {
      console.error('About section generation error:', error);
      throw new Error('Hakkımda bölümü üretilirken bir hata oluştu.');
    }
  }

  // İş deneyimi bullet point'leri için AI üretimi
  static async generateWorkExperienceBullets(prompt: string): Promise<string[]> {
    const aiPrompt = `
    Aşağıdaki kullanıcı bilgilerini kullanarak profesyonel iş deneyimi bullet point'leri oluştur.

    Kullanıcı Bilgileri:
    ${prompt}

    ÖNEMLİ KURALLAR:
    1. En fazla 6 bullet point oluştur
    2. Her bullet point şu prensiple yazılmalı: "Ne yaptım + Nasıl yaptım + Sonuç ne oldu"
    3. Güçlü fiillerle başla: "Geliştirdim", "Yönettim", "Artırdım", "Sağladım", "İyileştirdim"
    4. Rakam kullan: "%20", "200+", "5 kişilik ekip" gibi
    5. Somut ve net ol: "Başarılı oldum" değil → "Süreyi %15 kısalttım"
    6. Her bullet point'i ayrı satırda yaz
    7. Bullet point'lerden önce "-" işareti kullanma, sadece metin olarak yaz
    8. Profesyonel ve etkileyici bir ton kullan
    9. ÖNEMLİ: Tüm fiilleri 1. tekil şahıs (ben) olarak çek: "geliştirdim", "artırdım", "sağladım", "yönettim" - "geliştirdi", "artırdı", "sağladı", "yönetti" DEĞİL

    ÖRNEK FORMAT (DOĞRU):
    Günlük ortalama 80+ müşteri çağrısını yöneterek memnuniyet odaklı çözümler ürettim
    CRM sistemi üzerinden kayıt oluşturma ve takip süreçlerini yürüterek hatasız veri akışı sağladım
    Süreç iyileştirmelerine katkı sağlayarak müşteri memnuniyet oranının yükselmesine destek oldum
    
    YANLIŞ ÖRNEKLER (KULLANMA):
    ❌ "Gelişmiş kullanıcı deneyimi için Next.js kullanarak web uygulamaları geliştirdi"
    ❌ "E-ticaret projelerine öncülük ederek müşteri memnuniyetini artırdı"
    
    DOĞRU ÖRNEKLER:
    ✅ "Gelişmiş kullanıcı deneyimi için Next.js kullanarak web uygulamaları geliştirdim"
    ✅ "E-ticaret projelerine öncülük ederek müşteri memnuniyetini artırdım"

    Sadece bullet point'leri döndür, başka açıklama ekleme.
    `;

    try {
      const response = await CompanyBasedCVService['callGeminiAPI'](aiPrompt);
      
      // Response'u satırlara böl ve temizle
      const bullets = response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 6); // Maksimum 6 bullet point

      return bullets;
    } catch (error) {
      console.error('Work experience bullets generation error:', error);
      throw new Error('İş deneyimi bullet point\'leri üretilirken bir hata oluştu.');
    }
  }

  // Beceriler için AI üretimi (iş deneyiminden)
  static async generateSkillsFromExperience(workExperienceData: any[]): Promise<string[]> {
    // İş deneyimlerinden bullet point'leri topla
    const allBulletPoints = workExperienceData
      .flatMap(exp => exp.bulletPoints || [])
      .filter(bp => bp.trim().length > 0);

    if (allBulletPoints.length === 0) {
      throw new Error('İş deneyimlerinde bullet point bulunamadı. Önce iş deneyimlerinizi doldurun.');
    }

    const bulletPointsText = allBulletPoints.join('\n');

    const aiPrompt = `
    Aşağıdaki iş deneyimi bullet point'lerinden becerileri çıkar ve liste halinde döndür.

    İş Deneyimi Bullet Point'leri:
    ${bulletPointsText}

    ÖNEMLİ KURALLAR:
    1. En fazla 10 beceri üret
    2. Her beceri maksimum 2 kelime olsun
    3. Teknik beceriler: "React", "Next.js", "Node.js", "JavaScript", "TypeScript", "SQL", "MongoDB", "Docker", "Git"
    4. Yumuşak beceriler: "Analitik düşünme", "Problem çözme", "Takım çalışması", "Zaman yönetimi", "İletişim becerileri"
    5. Sadece beceri isimlerini döndür, açıklama ekleme
    6. Her beceriyi ayrı satırda yaz
    7. Tekrarlayan becerileri birleştir
    8. Genel ve spesifik becerileri dengele

    ÖRNEK FORMAT:
    React
    Next.js
    Node.js
    JavaScript
    TypeScript
    SQL
    MongoDB
    Docker
    Git
    Analitik düşünme
    Problem çözme
    Takım çalışması
    Zaman yönetimi
    İletişim becerileri

    Sadece beceri listesini döndür, başka açıklama ekleme.
    `;

    try {
      const response = await CompanyBasedCVService['callGeminiAPI'](aiPrompt);
      
      // Response'u satırlara böl ve temizle
      const skills = response
        .split('\n')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)
        .slice(0, 10); // Maksimum 10 beceri

      return skills;
    } catch (error) {
      console.error('Skills generation error:', error);
      throw new Error('Beceriler üretilirken bir hata oluştu.');
    }
  }
}
