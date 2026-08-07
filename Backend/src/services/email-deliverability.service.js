/**
 * Mail Altyapı Durumu — SPF, DKIM, DMARC, MX (DNS lookup)
 *
 * Not: Bu kayıtlar GÖNDEREN domain'in DNS'inde tutulur.
 * Alıcı firma domain'i kontrol edilmez; uygulama SMTP_FROM domain'ini kullanır.
 * Sonuç MongoDB'de 24 saat cache'lenir.
 */

const dns = require("dns").promises;
const MailInfraCache = require("../models/mail-infra-cache.model");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MANAGED_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "aol.com",
  "zoho.com",
]);

function normalizeDomain(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/^@/, "");
}

function getSenderDomainFromEnv() {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  const email = String(from).replace(/^.*<|>.*$/g, "").trim();
  if (!email.includes("@")) return "";
  return normalizeDomain(email.split("@").pop());
}

function isManagedProvider(domain) {
  return MANAGED_PROVIDERS.has(normalizeDomain(domain));
}

function statusFromOk(ok, warning = false) {
  if (ok && !warning) return "ok";
  if (ok && warning) return "warning";
  return "error";
}

/**
 * SPF — domain TXT
 */
async function checkSPF(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecord = records.flat().find((r) => r.startsWith("v=spf1"));

    if (!spfRecord) {
      return {
        exists: false,
        configured: false,
        record: null,
        status: "error",
        label: "SPF kaydı yok",
      };
    }

    const isHardFail = spfRecord.includes("-all");
    const isSoftFail = spfRecord.includes("~all");

    return {
      exists: true,
      configured: true,
      record: spfRecord,
      strict: isHardFail,
      softFail: isSoftFail,
      status: statusFromOk(true, !isHardFail && !isSoftFail),
      label: isHardFail
        ? "Yapılandırılmış (-all)"
        : isSoftFail
          ? "Yapılandırılmış (~all)"
          : "Yapılandırılmış",
    };
  } catch (error) {
    return {
      exists: false,
      configured: false,
      record: null,
      status: "error",
      label: "SPF sorgusu başarısız",
      error: error.message,
    };
  }
}

/**
 * DMARC — _dmarc.domain TXT
 */
async function checkDMARC(domain) {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarcRecord = records.flat().find((r) => r.startsWith("v=DMARC1"));

    if (!dmarcRecord) {
      return {
        exists: false,
        configured: false,
        record: null,
        policy: null,
        status: "error",
        label: "DMARC kaydı yok",
      };
    }

    const policy = dmarcRecord.match(/p=(none|quarantine|reject)/i)?.[1]?.toLowerCase() || null;
    const weak = policy === "none";

    return {
      exists: true,
      configured: true,
      record: dmarcRecord,
      policy,
      status: statusFromOk(true, weak),
      label: policy
        ? `Var (policy: ${policy})`
        : "Var",
    };
  } catch (error) {
    return {
      exists: false,
      configured: false,
      record: null,
      policy: null,
      status: "error",
      label: "DMARC sorgusu başarısız",
      error: error.message,
    };
  }
}

/**
 * DKIM — selector kontrolü
 *
 * ÖNEMLİ: Bu kontrol DİNAMİK DEĞİLDİR.
 * Gerçek gönderilen mailin DKIM-Signature başlığındaki s= (selector) okunmaz.
 * Yerine sabit/yaygın selector listesi denenir (+ opsiyonel DKIM_SELECTOR env).
 * Gerçek sonuç için gönderilen mailde Authentication-Results / mail-tester kullanın.
 */
async function checkDKIM(domain, options = {}) {
  const envSelector = String(process.env.DKIM_SELECTOR || options.selector || "")
    .trim()
    .toLowerCase();

  const commonSelectors = [
    "google",
    "default",
    "selector1",
    "selector2",
    "k1",
    "s1",
    "s2",
    "mail",
    "dkim",
  ];

  // Env verilmişse önce onu dene; yoksa sabit heuristic liste
  const selectorsToTry = envSelector
    ? [envSelector, ...commonSelectors.filter((s) => s !== envSelector)]
    : commonSelectors;

  const selectorMode = envSelector ? "env-configured" : "static-heuristic";

  for (const selector of selectorsToTry) {
    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      const dkimRecord = records
        .flat()
        .find((r) => r.includes("v=DKIM1") || r.includes("k=rsa") || r.includes("p="));

      if (dkimRecord) {
        const fromEnv = Boolean(envSelector && selector === envSelector);
        return {
          exists: true,
          configured: true,
          selector,
          selectorMode: fromEnv ? "env-configured" : "static-heuristic",
          selectorSource: fromEnv
            ? "DKIM_SELECTOR env"
            : "sabit yaygın selector listesi",
          status: "ok",
          label: fromEnv
            ? `Yapılandırılmış (env selector: ${selector})`
            : `Yapılandırılmış (heuristic: ${selector})`,
          note: fromEnv
            ? undefined
            : "Selector sabit listeden bulundu; gerçek gönderimde s= farklı olabilir",
        };
      }
    } catch {
      // selector yok — devam
    }
  }

  return {
    exists: false,
    configured: false,
    selector: null,
    selectorMode,
    selectorSource: envSelector
      ? `DKIM_SELECTOR=${envSelector} + sabit liste`
      : "sabit yaygın selector listesi",
    triedSelectors: selectorsToTry,
    status: "warning",
    label: "Yaygın/heuristic selector'lerde bulunamadı",
    note:
      "Bu bir DNS tahminidir (dinamik değil). Gerçek DKIM için gönderilen mail başlığındaki DKIM-Signature s= ve Authentication-Results satırına bakın; veya mail-tester.com kullanın.",
  };
}

/**
 * MX — domain MX
 */
async function checkMX(domain) {
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords?.length) {
      return {
        exists: false,
        configured: false,
        primary: null,
        count: 0,
        status: "error",
        label: "MX kaydı yok",
      };
    }

    const sorted = [...mxRecords].sort((a, b) => a.priority - b.priority);
    const primary = sorted[0].exchange;
    let providerHint = primary;
    if (/google|gmail|googlemail/i.test(primary)) providerHint = "Google Workspace / Gmail";
    else if (/outlook|protection\.outlook|microsoft/i.test(primary)) providerHint = "Microsoft 365 / Outlook";
    else if (/yahoodns|yahoo/i.test(primary)) providerHint = "Yahoo";
    else if (/protonmail|proton\./i.test(primary)) providerHint = "Proton";

    return {
      exists: true,
      configured: true,
      primary,
      count: sorted.length,
      providerHint,
      status: "ok",
      label: providerHint,
    };
  } catch (error) {
    return {
      exists: false,
      configured: false,
      primary: null,
      count: 0,
      status: "error",
      label: "MX sorgusu başarısız",
      error: error.message,
    };
  }
}

function buildIssuesAndSuggestions(checks, { managedByProvider }) {
  const issues = [];
  const suggestions = [];

  if (managedByProvider) {
    return {
      issues: [],
      suggestions: [
        {
          field: "Bilgi",
          action:
            "Bu domain paylaşımlı bir mail sağlayıcısına ait (Gmail/Outlook vb.). SPF/DKIM/DMARC sağlayıcı tarafından yönetilir; DNS'e kendiniz kayıt ekleyemezsiniz.",
          example:
            "Spam riski daha çok gönderim hacmi, içerik ve alıcı etkileşimine bağlıdır. Özel domain kullanıyorsanız Google Workspace / kendi domain SPF+DKIM+DMARC kurun.",
        },
      ],
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
    };
  }

  if (!checks.spf.configured) {
    issues.push({
      field: "SPF",
      severity: "high",
      message: "SPF kaydı bulunamadı",
      impact: "Alıcı sunucular maili sahte sayabilir",
    });
    suggestions.push({
      field: "SPF",
      action: "Domain DNS ayarlarına SPF TXT kaydı ekleyin",
      example: "v=spf1 include:_spf.google.com ~all",
    });
  }

  if (!checks.dmarc.configured) {
    issues.push({
      field: "DMARC",
      severity: "high",
      message: "DMARC kaydı bulunamadı",
      impact: "Domain spoofing koruması yok",
    });
    suggestions.push({
      field: "DMARC",
      action: "DNS'e _dmarc TXT kaydı ekleyin",
      example: "v=DMARC1; p=quarantine; rua=mailto:admin@domain.com",
    });
  } else if (checks.dmarc.policy === "none") {
    issues.push({
      field: "DMARC",
      severity: "medium",
      message: "DMARC policy 'none'",
      impact: "İzleme modunda; başarısız mailler engellenmez",
    });
    suggestions.push({
      field: "DMARC",
      action: "Policy'yi quarantine veya reject yapın (kademeli)",
      example: "v=DMARC1; p=quarantine; rua=mailto:admin@domain.com",
    });
  }

  if (!checks.dkim.configured) {
    issues.push({
      field: "DKIM",
      severity: "medium",
      message: "DKIM kaydı sabit/heuristic selector listesinde bulunamadı (dinamik header okuması yok)",
      impact: "DNS tahmini başarısız; gerçek imza durumu bilinmiyor",
    });
    suggestions.push({
      field: "DKIM",
      action:
        "Mail sağlayıcıda DKIM açın. Selector'ı biliyorsanız DKIM_SELECTOR env ekleyin. Gerçek sonuç için mail-tester / Authentication-Results kullanın.",
      example: "DKIM_SELECTOR=google   # veya header'daki s= değeri",
    });
  }

  if (!checks.mx.exists) {
    issues.push({
      field: "MX",
      severity: "critical",
      message: "MX kaydı bulunamadı",
      impact: "Domain mail altyapısı eksik görünüyor",
    });
    suggestions.push({
      field: "MX",
      action: "DNS'e MX kaydı ekleyin",
      example: "10 smtp.google.com (Workspace örneği)",
    });
  }

  return {
    issues,
    suggestions,
    totalIssues: issues.length,
    criticalIssues: issues.filter((i) => i.severity === "critical").length,
    highIssues: issues.filter((i) => i.severity === "high").length,
    mediumIssues: issues.filter((i) => i.severity === "medium").length,
  };
}

function summarizeOverall(checks, managedByProvider) {
  const statuses = [checks.spf.status, checks.dkim.status, checks.dmarc.status, checks.mx.status];
  const hasError = statuses.includes("error");
  const hasWarning = statuses.includes("warning");

  // Paylaşımlı sağlayıcı: bilgilendirme; gönderimi engelleme
  if (managedByProvider) {
    return {
      score: hasError ? 70 : hasWarning ? 85 : 95,
      rating: hasError ? "good" : "excellent",
      action: "pass",
      actionLabel: "GÖNDERİCİ ALTYAPISI SAĞLAYICIYA AİT",
      actionEmoji: "✅",
      color: "green",
    };
  }

  if (!hasError && !hasWarning) {
    return {
      score: 95,
      rating: "excellent",
      action: "pass",
      actionLabel: "ALTYAPI HAZIR",
      actionEmoji: "✅",
      color: "green",
    };
  }

  if (!hasError && hasWarning) {
    return {
      score: 75,
      rating: "good",
      action: "info",
      actionLabel: "İYİLEŞTİRİLEBİLİR",
      actionEmoji: "⚠️",
      color: "yellow",
    };
  }

  // Özel domain'de kritik eksik — bilgilendir, soft uyar (gönderimi uygulama engellemez)
  return {
    score: checks.mx.exists ? 45 : 20,
    rating: checks.mx.exists ? "average" : "poor",
    action: "info",
    actionLabel: "DNS EKSİK — ÖNERİLERİ İNCELEYİN",
    actionEmoji: "⚠️",
    color: "orange",
  };
}

async function runDnsChecks(domain) {
  const [spf, dmarc, dkim, mx] = await Promise.all([
    checkSPF(domain),
    checkDMARC(domain),
    checkDKIM(domain),
    checkMX(domain),
  ]);

  return { spf, dmarc, dkim, mx };
}

/**
 * Tam mail altyapı kontrolü (gönderen domain).
 * @param {object} options
 * @param {string} [options.domain] — verilmezse SMTP_FROM domain
 * @param {boolean} [options.forceRefresh]
 */
async function checkEmailDeliverability(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const requested = normalizeDomain(options.domain);
  const senderDomain = getSenderDomainFromEnv();
  const domain = requested || senderDomain;

  if (!domain) {
    return {
      ok: false,
      error: "Gönderen domain bulunamadı (SMTP_FROM / SMTP_USER ayarlayın)",
    };
  }

  if (!forceRefresh) {
    try {
      const cached = await MailInfraCache.findOne({ domain }).lean();
      if (cached?.result && cached.checkedAt) {
        const age = Date.now() - new Date(cached.checkedAt).getTime();
        if (age < CACHE_TTL_MS) {
          return {
            ...cached.result,
            cached: true,
            checkedAt: cached.checkedAt,
            cacheAgeHours: Math.round((age / 3600000) * 10) / 10,
          };
        }
      }
    } catch (cacheErr) {
      console.warn("[MAIL-INFRA] Cache okunamadı:", cacheErr.message);
    }
  }

  console.log(`[MAIL-INFRA] ${domain} DNS kontrolü başlıyor...`);

  const checks = await runDnsChecks(domain);
  const managedByProvider = isManagedProvider(domain);
  const isSenderDomain = domain === senderDomain;
  const issuesReport = buildIssuesAndSuggestions(checks, { managedByProvider });
  const overall = summarizeOverall(checks, managedByProvider);

  const result = {
    ok: true,
    domain,
    isSenderDomain,
    senderDomain,
    senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || null,
    managedByProvider,
    scope: "sender",
    checkType: "static-dns",
    note: managedByProvider
      ? "Statik DNS kontrolü (gönderen domain). Paylaşımlı sağlayıcı DNS'ini siz yönetmezsiniz. Gerçek spam/auth sonucu için mail-tester veya Authentication-Results kullanın."
      : "Statik DNS kontrolü (gönderen domain). Bu 'teorik yapılandırma'dır; gerçek authentication sonucu gönderilen mailin header'ındadır.",
    dkimMeta: {
      selectorMode: checks.dkim.selectorMode,
      selectorSource: checks.dkim.selectorSource,
      selector: checks.dkim.selector || null,
      triedSelectors: checks.dkim.triedSelectors || undefined,
      note: checks.dkim.note,
    },
    realAuthGuidance: {
      title: "Gerçek authentication / spam riski",
      summary:
        "DNS kaydı 'var' demek teorik doğruluktur. O anki gerçek sonuç için test maili gönderip Authentication-Results satırına bakın.",
      steps: [
        "https://www.mail-tester.com açın → verilen test-xxxxx@mail-tester.com adresine uygulama SMTP'sinden bir test maili gönderin → skoru sayfadan okuyun",
        "veya kendi gelen kutunuza mail atın → Orijinali göster / Show original → Authentication-Results satırında spf=, dkim=, dmarc= pass/fail bakın",
        "DKIM selector (s=) değeri header'daki DKIM-Signature içindedir; biliniyorsa Backend .env'e DKIM_SELECTOR=... yazılarak DNS sorgusu hedeflenebilir",
      ],
      mailTesterUrl: "https://www.mail-tester.com",
    },
    checks,
    summary: {
      spf: checks.spf.status,
      dkim: checks.dkim.status,
      dmarc: checks.dmarc.status,
      mx: checks.mx.status,
    },
    labels: {
      spf: checks.spf.label,
      dkim: checks.dkim.label,
      dmarc: checks.dmarc.label,
      mx: checks.mx.label,
    },
    score: overall.score,
    rating: overall.rating,
    color: overall.color,
    action: overall.action,
    actionLabel: overall.actionLabel,
    actionEmoji: overall.actionEmoji,
    issues: issuesReport.issues,
    suggestions: issuesReport.suggestions,
    totalIssues: issuesReport.totalIssues,
    criticalIssues: issuesReport.criticalIssues,
    highIssues: issuesReport.highIssues,
    mediumIssues: issuesReport.mediumIssues,
    cached: false,
    checkedAt: new Date(),
  };

  try {
    await MailInfraCache.findOneAndUpdate(
      { domain },
      { domain, checkedAt: new Date(), result },
      { upsert: true, new: true }
    );
  } catch (cacheErr) {
    console.warn("[MAIL-INFRA] Cache yazılamadı:", cacheErr.message);
  }

  console.log(
    `[MAIL-INFRA] ${domain} — ${overall.score}/100 (${overall.actionLabel}) | managed=${managedByProvider}`
  );

  return result;
}

module.exports = {
  checkEmailDeliverability,
  checkSPF,
  checkDMARC,
  checkDKIM,
  checkMX,
  getSenderDomainFromEnv,
  isManagedProvider,
  normalizeDomain,
};
