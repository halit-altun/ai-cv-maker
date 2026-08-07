/**
 * Company-based CV optimization token hesaplama örneği
 * 
 * Kullanım:
 * node scripts/estimate-company-based-tokens.js
 */

const { estimateCompanyBasedTokens, calculateGeminiCost } = require("../src/utils/token-calculator");

// Örnek request (ortalama bir company-based analiz)
const sampleRequest = {
  cvText: `
FULL STACK WEB DEVELOPER

Ad Soyad
İstanbul, Türkiye
email@example.com | +90 555 123 4567
linkedin.com/in/profile | github.com/username

HAKKIMDA
5 yıllık deneyime sahip Full Stack Web Developer. Modern web teknolojileri ile ölçeklenebilir
uygulamalar geliştirme konusunda uzmanım. React, Node.js, TypeScript ve SQL Server ile 
büyük ölçekli e-ticaret projelerinde çalıştım.

İŞ DENEYİMİ

Senior Full Stack Developer | Tech Company A | İstanbul
2021-06 - Present
• 500K+ aktif kullanıcılı e-ticaret platformu geliştirdim (React, Node.js, MongoDB)
• Mikroservis mimarisi ile backend sistemleri tasarladım ve uyguladım
• CI/CD pipeline'ları kurdum (GitLab CI, Docker, Kubernetes)
• 10 kişilik geliştirici ekibine teknik liderlik yaptım
• Ödeme entegrasyonları (Stripe, PayPal) ve güvenlik protokolleri geliştirdim

Full Stack Developer | Startup B | İstanbul
2019-01 - 2021-05
• SaaS platformu frontend ve backend geliştirme (Angular, Express.js)
• RESTful API tasarımı ve dokümantasyonu
• PostgreSQL veritabanı optimizasyonu (40% performans artışı)
• Unit ve integration test coverage'ını %80'e çıkardım

Junior Developer | Agency C | İstanbul
2018-06 - 2018-12
• Kurumsal web siteleri geliştirme (PHP, MySQL, jQuery)
• Responsive tasarım ve cross-browser uyumluluk
• Client iletişimi ve proje yönetimi

EĞİTİM

Bilgisayar Mühendisliği | İstanbul Teknik Üniversitesi
2014-09 - 2018-06

YETENEKLER
JavaScript, TypeScript, React, Next.js, Node.js, Express, Nest.js, MongoDB, 
PostgreSQL, SQL Server, Redis, Docker, Kubernetes, AWS, Git, CI/CD, 
Microservices, REST API, GraphQL, Jest, Testing

DİLLER
Türkçe - Ana Dil
İngilizce - İleri Seviye (C1)

PROJELER

E-Ticaret Platform Modernizasyonu
Monolitik yapıdan mikroservis mimarisine geçiş projesi. React, Node.js, RabbitMQ,
Redis cache katmanı, Docker containerization. 5 mikroservis, 3 veritabanı.

SaaS Dashboard Analytics
Real-time analytics dashboard with 100K+ daily users. React, D3.js, WebSocket,
Node.js streaming, ClickHouse. 99.9% uptime.
`.repeat(2.8), // ~3500 token CV (daha gerçekçi)

  companyPages: [
    {
      url: "https://example.com/about",
      pageType: "about",
      pageText: `
About Example Tech Company

We are a leading e-commerce platform in Turkey with over 5 million active users.
Founded in 2015, we've grown to become one of the top technology companies in the region.

Our Mission
Transforming online shopping experience through innovative technology solutions.
We believe in customer-first approach and sustainable growth.

Technology Stack
- Frontend: React, Next.js, TypeScript
- Backend: Node.js, Python, Go
- Infrastructure: AWS, Kubernetes, Docker
- Data: PostgreSQL, MongoDB, Redis, Elasticsearch
- Real-time: WebSocket, Server-Sent Events

Team Culture
Fast-paced startup environment with flat hierarchy. We encourage innovation,
experimentation, and continuous learning. Remote-friendly work culture.

Current Openings
We're looking for talented engineers who are passionate about building
scalable systems and delivering exceptional user experiences.
      `.repeat(2), // ~1500 token company page
    },
    {
      url: "https://example.com/careers",
      pageType: "careers",
      pageText: `
Careers at Example Tech

Senior Full Stack Developer
5+ years of experience required. Strong knowledge of React, Node.js.
Experience with microservices architecture and cloud platforms (AWS/GCP).
E-commerce background is a plus.

What We Offer
- Competitive salary
- Stock options
- Flexible working hours
- Remote work option
- Learning & development budget
- Health insurance

Interview Process
1. Phone screening (30 min)
2. Technical interview (90 min)
3. System design interview (60 min)
4. Team fit interview (45 min)
      `.repeat(1.5), // ~800 token career page
    },
  ],

  cvLanguage: "turkish",
  adaptationSource: "company",
  targetPosition: "Senior Full Stack Developer",
  generateCoverLetter: true,
  generateLinkedInMessage: true,
  generateColdEmail: true,
  coldEmailLanguage: "turkish",
};

console.log("========================================");
console.log("COMPANY-BASED TOKEN HESAPLAMASI");
console.log("========================================\n");

const estimate = estimateCompanyBasedTokens(sampleRequest);
const cost = calculateGeminiCost(estimate.inputTokens, estimate.outputTokens, "paid");

console.log("📊 TOKEN DAĞILIMI:");
console.log("─".repeat(40));
console.log(`CV Metni:              ${estimate.breakdown.cvText.toLocaleString()} token`);
console.log(`Hedef Data:            ${estimate.breakdown.targetData.toLocaleString()} token`);
console.log(`System Instructions:   ${estimate.breakdown.systemInstructions.toLocaleString()} token`);
console.log(`─`.repeat(40));
console.log(`INPUT (Toplam):        ${estimate.inputTokens.toLocaleString()} token`);
console.log();
console.log(`Parsed CV + Analysis:  ${estimate.breakdown.parsedCvAndAnalysis.toLocaleString()} token`);
console.log(`Optional Outputs:      ${estimate.breakdown.optionalOutputs.toLocaleString()} token`);
console.log(`─`.repeat(40));
console.log(`OUTPUT (Toplam):       ${estimate.outputTokens.toLocaleString()} token`);
console.log();
console.log(`✅ TOPLAM TOKEN:       ${estimate.totalTokens.toLocaleString()} token`);
console.log();

console.log("💰 MALİYET ANALİZİ (Gemini Paid API):");
console.log("─".repeat(40));
console.log(`Input:  $${cost.inputCost.toFixed(4)}  (${estimate.inputTokens.toLocaleString()} token × $0.075/1M)`);
console.log(`Output: $${cost.outputCost.toFixed(4)}  (${estimate.outputTokens.toLocaleString()} token × $0.30/1M)`);
console.log(`─`.repeat(40));
console.log(`İstek Başına:          $${cost.totalCost.toFixed(4)}`);
console.log(`1000 İstek:            $${cost.costPer1000Requests.toFixed(2)}`);
console.log(`10,000 İstek:          $${(cost.costPer1000Requests * 10).toFixed(2)}`);
console.log();

console.log("📈 KARŞILAŞTIRMA:");
console.log("─".repeat(40));
console.log("Gemini Free Tier:      $0 (15 RPM limit → ~21,600/gün)");
console.log(`Gemini Paid:           $${cost.totalCost.toFixed(4)}/istek (1000 RPM)`);
console.log("GPT-4o-mini:           $0.0020/istek (10,000 RPM)");
console.log("GPT-4o:                $0.0300/istek (yüksek kalite)");
console.log("Claude 3.5 Sonnet:     $0.0450/istek (en iyi kalite)");
console.log();

console.log("🎯 TAVSİYE:");
console.log("─".repeat(40));
if (cost.totalCost < 0.002) {
  console.log("✅ Gemini çok uygun fiyatlı!");
  console.log("   429 sorunu çözülürse ideal seçenek.");
} else {
  console.log("💡 GPT-4o-mini daha ucuz ve rate limit yok!");
  console.log("   Geçiş önerilir.");
}
console.log();

console.log("⚠️  NOT:");
console.log("   Bu tahminler yaklaşık değerlerdir.");
console.log("   Gerçek token kullanımı ±20% değişebilir.");
console.log("   Free tier'da maliyet $0 ama 15 RPM limit var.");
console.log();
