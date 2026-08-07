/**
 * Gönderen itibar tahmini + bu mesaj riski
 *
 * KAPSAM:
 * - Ana skor = gönderen hesabın itibar tahmini (alıcı spam kararı DEĞİL)
 * - messageRisk = o anki konu/gövde için ayrı risk satırı
 * - Outcome feedback (inbox/spam işaretleri) en güçlü yerel sinyal
 *
 * Bu skor mail sağlayıcı algoritmasını yansıtmaz; kendi verilerine dayalı tahmindir.
 */

const OutreachLog = require("../models/outreach-log.model");
const MailTracking = require("../models/mail-tracking.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const {
  checkEmailDeliverability,
  isManagedProvider,
  getSenderDomainFromEnv,
} = require("./email-deliverability.service");

const ENGAGEMENT_MIN_MAILS = Math.max(
  5,
  Number(process.env.SPAM_RISK_ENGAGEMENT_MIN_MAILS || 15)
);
const OUTCOME_MIN_MARKS = Math.max(
  1,
  Number(process.env.SPAM_RISK_OUTCOME_MIN_MARKS || 2)
);
const GMAIL_SOFT_DAILY_LIMIT = Math.max(
  50,
  Number(process.env.GMAIL_SOFT_DAILY_LIMIT || 500)
);

const SPAMMY_SUBJECT_RE =
  /\b(free|urgent|winner|congratulations|act now|limited time|click here|\$\$\$|100%|guarantee|risk.?free|ücretsiz|acil|tebrikler|hemen tıkla)\b/i;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
}

function normalizeText(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .trim()
    .slice(0, 4000);
}

function jaccardSimilarity(a, b) {
  const ta = new Set(normalizeText(a).split(" ").filter((w) => w.length > 2));
  const tb = new Set(normalizeText(b).split(" ").filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

function countLinks(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)]+/gi);
  return matches ? matches.length : 0;
}

/**
 * 1) Statik altyapı — max 40
 * Managed sağlayıcıda DKIM heuristic fail → +10 (Google SMTP imzalar)
 */
function scoreInfrastructure(dns) {
  const checks = dns?.checks || {};
  const managed = Boolean(dns?.managedByProvider);
  const breakdown = [];
  let points = 0;

  if (checks.spf?.configured || checks.spf?.exists) {
    points += 15;
    breakdown.push({ signal: "SPF", delta: 15, detail: "SPF kaydı var" });
  } else {
    breakdown.push({ signal: "SPF", delta: 0, detail: "SPF yok" });
  }

  if (checks.dkim?.configured || checks.dkim?.exists) {
    points += 10;
    breakdown.push({
      signal: "DKIM",
      delta: 10,
      detail: `Heuristic bulundu (${checks.dkim.selector || "?"})`,
    });
  } else if (managed) {
    points += 10;
    breakdown.push({
      signal: "DKIM",
      delta: 10,
      detail:
        "Paylaşımlı sağlayıcı SMTP — DKIM sağlayıcı imzası varsayılır (DNS heuristic false negative)",
    });
  } else {
    breakdown.push({
      signal: "DKIM",
      delta: 0,
      detail: "Bulunamadı (ceza yok — false negative olabilir)",
    });
  }

  const policy = checks.dmarc?.policy;
  if (checks.dmarc?.configured || checks.dmarc?.exists) {
    let d = 5;
    if (policy === "quarantine") d = 8;
    if (policy === "reject") d = 10;
    points += d;
    breakdown.push({
      signal: "DMARC",
      delta: d,
      detail: `policy: ${policy || "var"}`,
    });
  } else {
    breakdown.push({ signal: "DMARC", delta: 0, detail: "DMARC yok" });
  }

  if (checks.mx?.exists || checks.mx?.configured) {
    points += 5;
    breakdown.push({ signal: "MX", delta: 5, detail: checks.mx.label || "MX var" });
  } else {
    breakdown.push({ signal: "MX", delta: 0, detail: "MX yok" });
  }

  if (managed) {
    breakdown.push({
      signal: "Paylaşımlı sağlayıcı",
      delta: 0,
      detail: "Bilgi — alıcı spam kararını tahmin etmez",
    });
  }

  // DNS label düzeltmesi (UI)
  if (managed && !(checks.dkim?.configured || checks.dkim?.exists)) {
    if (dns.labels) dns.labels.dkim = "Sağlayıcı imzası (heuristic N/A)";
    if (dns.summary) dns.summary.dkim = "ok";
    if (dns.dkimMeta) {
      dns.dkimMeta.selectorMode = "managed-provider-assumed";
      dns.dkimMeta.note =
        "Gmail/Outlook SMTP kullanıldığında DKIM DNS heuristic atlanır; sağlayıcı imzalar.";
    }
  }

  return {
    points: clamp(points, 0, 40),
    max: 40,
    managedByProvider: managed,
    breakdown,
  };
}

/**
 * 2) Gönderim davranışı — base 30
 */
async function scoreBehavior({ clientId, user }) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [hourLogs, dayLogs, recentLogs] = await Promise.all([
    OutreachLog.find({
      clientId,
      sentAt: { $gte: oneHourAgo },
      status: { $in: ["success", "partial", "failed"] },
    })
      .select("sentCount totalRecipients recipients")
      .lean(),
    OutreachLog.find({
      clientId,
      sentAt: { $gte: dayStart },
      status: { $in: ["success", "partial", "failed"] },
    })
      .select("sentCount totalRecipients recipients")
      .lean(),
    OutreachLog.find({
      clientId,
      status: { $in: ["success", "partial"] },
      bodyText: { $exists: true, $ne: "" },
    })
      .sort({ sentAt: -1 })
      .limit(12)
      .select("bodyText sentAt")
      .lean(),
  ]);

  const countRecipients = (logs) =>
    logs.reduce((sum, log) => {
      const fromRecipients = Array.isArray(log.recipients)
        ? log.recipients.filter((r) => ["sent", "queued", "logged"].includes(r.status))
            .length
        : 0;
      return sum + Number(log.sentCount || fromRecipients || log.totalRecipients || 0);
    }, 0);

  const sentLastHour = countRecipients(hourLogs);
  const sentToday = countRecipients(dayLogs);

  let points = 30;
  const breakdown = [];
  const penalties = [];

  if (sentLastHour >= 20) {
    points -= 15;
    penalties.push({
      signal: "Gönderim hızı",
      delta: -15,
      detail: `Son 1 saatte ~${sentLastHour} mail`,
    });
  } else if (sentLastHour >= 10) {
    points -= 8;
    penalties.push({
      signal: "Gönderim hızı",
      delta: -8,
      detail: `Son 1 saatte ~${sentLastHour} mail`,
    });
  } else {
    breakdown.push({
      signal: "Gönderim hızı",
      delta: 0,
      detail: `Son 1 saatte ~${sentLastHour} mail (normal)`,
    });
  }

  let avgSimilarity = 0;
  if (recentLogs.length >= 3) {
    const pairs = [];
    for (let i = 0; i < recentLogs.length - 1; i += 1) {
      pairs.push(jaccardSimilarity(recentLogs[i].bodyText, recentLogs[i + 1].bodyText));
    }
    avgSimilarity = pairs.reduce((a, b) => a + b, 0) / pairs.length;
    if (avgSimilarity >= 0.72) {
      points -= 10;
      penalties.push({
        signal: "İçerik benzerliği",
        delta: -10,
        detail: `Ortalama benzerlik ${(avgSimilarity * 100).toFixed(0)}%`,
      });
    } else if (avgSimilarity >= 0.55) {
      points -= 5;
      penalties.push({
        signal: "İçerik benzerliği",
        delta: -5,
        detail: `Ortalama benzerlik ${(avgSimilarity * 100).toFixed(0)}%`,
      });
    } else {
      breakdown.push({
        signal: "İçerik benzerliği",
        delta: 0,
        detail: `Ortalama benzerlik ${(avgSimilarity * 100).toFixed(0)}%`,
      });
    }
  } else {
    breakdown.push({
      signal: "İçerik benzerliği",
      delta: 0,
      detail: "Yeterli geçmiş yok",
    });
  }

  const lastBody = recentLogs[0]?.bodyText || "";
  const linkCount = countLinks(lastBody);
  if (linkCount >= 5) {
    points -= 5;
    penalties.push({
      signal: "Link yoğunluğu",
      delta: -5,
      detail: `Son mailde ${linkCount} link`,
    });
  } else {
    breakdown.push({
      signal: "Link yoğunluğu",
      delta: 0,
      detail: `Son mailde ${linkCount} link`,
    });
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  const accountAgeDays = createdAt
    ? Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  if (accountAgeDays != null && accountAgeDays < 7) {
    points -= 10;
    penalties.push({
      signal: "Hesap yaşı / warm-up",
      delta: -10,
      detail: `Hesap ${accountAgeDays} günlük (yeni)`,
    });
  } else {
    breakdown.push({
      signal: "Hesap yaşı / warm-up",
      delta: 0,
      detail: accountAgeDays == null ? "Bilinmiyor" : `Hesap ${accountAgeDays} günlük`,
    });
  }

  const senderDomain = getSenderDomainFromEnv();
  const softLimit = isManagedProvider(senderDomain)
    ? GMAIL_SOFT_DAILY_LIMIT
    : Math.max(1, Number(process.env.OUTREACH_DAILY_EMAIL_LIMIT || GMAIL_SOFT_DAILY_LIMIT));
  const usageRatio = softLimit > 0 ? sentToday / softLimit : 0;
  if (usageRatio >= 0.85) {
    points -= 10;
    penalties.push({
      signal: "Günlük limit yakınlığı",
      delta: -10,
      detail: `Bugün ${sentToday}/${softLimit} (${Math.round(usageRatio * 100)}%)`,
    });
  } else if (usageRatio >= 0.65) {
    points -= 5;
    penalties.push({
      signal: "Günlük limit yakınlığı",
      delta: -5,
      detail: `Bugün ${sentToday}/${softLimit} (${Math.round(usageRatio * 100)}%)`,
    });
  } else {
    breakdown.push({
      signal: "Günlük limit yakınlığı",
      delta: 0,
      detail: `Bugün ${sentToday}/${softLimit}`,
    });
  }

  return {
    points: clamp(points, 0, 30),
    max: 30,
    sentLastHour,
    sentToday,
    softDailyLimit: softLimit,
    avgContentSimilarity: Math.round(avgSimilarity * 1000) / 1000,
    accountAgeDays,
    breakdown: [...breakdown, ...penalties],
  };
}

/**
 * 3) Engagement — max 15; OutreachLog + MailTracking
 */
async function scoreEngagement({ userId, clientId }) {
  const uid = toObjectId(userId);

  const [trackings, logAgg] = await Promise.all([
    MailTracking.find({ userId: uid }).select("openedCount status isLikelyBot").lean(),
    OutreachLog.aggregate([
      {
        $match: {
          clientId: String(clientId),
          status: { $in: ["success", "partial"] },
        },
      },
      {
        $group: {
          _id: null,
          sent: { $sum: "$sentCount" },
          failed: { $sum: "$failedCount" },
        },
      },
    ]),
  ]);

  const trackingCount = trackings.length;
  const logSent = Number(logAgg[0]?.sent || 0);
  const totalSent = Math.max(trackingCount, logSent);
  const ready = totalSent >= ENGAGEMENT_MIN_MAILS;

  if (!ready) {
    return {
      enabled: false,
      points: 0,
      max: 15,
      totalSent,
      trackingCount,
      logSent,
      minMailsRequired: ENGAGEMENT_MIN_MAILS,
      remainingForEngagement: Math.max(0, ENGAGEMENT_MIN_MAILS - totalSent),
      breakdown: [
        {
          signal: "Engagement",
          delta: 0,
          detail: `Henüz aktif değil (min ${ENGAGEMENT_MIN_MAILS}; tracking=${trackingCount}, logSent=${logSent})`,
        },
      ],
    };
  }

  const opened = trackings.filter(
    (t) => Number(t.openedCount || 0) > 0 && !t.isLikelyBot
  ).length;
  const openRate = trackingCount > 0 ? opened / trackingCount : 0;

  const bounced = trackings.filter((t) => t.status === "FAILED").length;
  const bounceRate = trackingCount > 0 ? bounced / trackingCount : 0;
  const failedCount = Number(logAgg[0]?.failed || 0);
  const smtpFailRate =
    logSent + failedCount > 0 ? failedCount / (logSent + failedCount) : 0;
  const effectiveBounce = Math.max(bounceRate, smtpFailRate);

  let points = 8;
  const breakdown = [];

  if (openRate >= 0.6) {
    points += 7;
    breakdown.push({
      signal: "Açılma oranı",
      delta: 7,
      detail: `%${Math.round(openRate * 100)} (≥60%)`,
    });
  } else if (openRate < 0.2) {
    points -= 7;
    breakdown.push({
      signal: "Açılma oranı",
      delta: -7,
      detail: `%${Math.round(openRate * 100)} (<20%) — spam klasörü de açılmama üretebilir`,
    });
  } else {
    breakdown.push({
      signal: "Açılma oranı",
      delta: 0,
      detail: `%${Math.round(openRate * 100)}`,
    });
  }

  if (effectiveBounce >= 0.15) {
    points -= 10;
    breakdown.push({
      signal: "Bounce oranı",
      delta: -10,
      detail: `%${Math.round(effectiveBounce * 100)} (yüksek)`,
    });
  } else if (effectiveBounce >= 0.08) {
    points -= 5;
    breakdown.push({
      signal: "Bounce oranı",
      delta: -5,
      detail: `%${Math.round(effectiveBounce * 100)}`,
    });
  } else {
    breakdown.push({
      signal: "Bounce oranı",
      delta: 0,
      detail: `%${Math.round(effectiveBounce * 100)}`,
    });
  }

  return {
    enabled: true,
    points: clamp(points, 0, 15),
    max: 15,
    totalSent,
    trackingCount,
    logSent,
    openRate: Math.round(openRate * 1000) / 1000,
    bounceRate: Math.round(effectiveBounce * 1000) / 1000,
    minMailsRequired: ENGAGEMENT_MIN_MAILS,
    breakdown,
  };
}

/**
 * 4) Outcome feedback — max 15 (inbox/spam işaretleri)
 */
async function scoreOutcomes({ userId }) {
  const uid = toObjectId(userId);
  const marked = await MailTracking.find({
    userId: uid,
    deliveryOutcome: { $in: ["inbox", "spam"] },
  })
    .select("deliveryOutcome")
    .lean();

  const inbox = marked.filter((m) => m.deliveryOutcome === "inbox").length;
  const spam = marked.filter((m) => m.deliveryOutcome === "spam").length;
  const total = inbox + spam;

  if (total < OUTCOME_MIN_MARKS) {
    return {
      enabled: false,
      points: 0,
      max: 15,
      inbox,
      spam,
      total,
      minMarksRequired: OUTCOME_MIN_MARKS,
      breakdown: [
        {
          signal: "Outcome feedback",
          delta: 0,
          detail: `Henüz aktif değil (min ${OUTCOME_MIN_MARKS} işaret; inbox=${inbox}, spam=${spam})`,
        },
      ],
    };
  }

  const inboxRate = inbox / total;
  let points = 8;
  const breakdown = [];

  if (inboxRate >= 0.7) {
    points += 7;
    breakdown.push({
      signal: "Gelen kutusu oranı",
      delta: 7,
      detail: `%${Math.round(inboxRate * 100)} (${inbox}/${total})`,
    });
  } else if (inboxRate <= 0.35) {
    points -= 8;
    breakdown.push({
      signal: "Gelen kutusu oranı",
      delta: -8,
      detail: `%${Math.round(inboxRate * 100)} (${inbox}/${total}) — sık spam`,
    });
  } else {
    breakdown.push({
      signal: "Gelen kutusu oranı",
      delta: 0,
      detail: `%${Math.round(inboxRate * 100)} (${inbox}/${total})`,
    });
  }

  return {
    enabled: true,
    points: clamp(points, 0, 15),
    max: 15,
    inbox,
    spam,
    total,
    inboxRate: Math.round(inboxRate * 1000) / 1000,
    minMarksRequired: OUTCOME_MIN_MARKS,
    breakdown,
  };
}

/**
 * Bu mesaj riski (ayrı satır) — 0=kötü, 100=iyi (sağlık)
 */
function scoreMessageRisk({ subject, bodyText, hasAttachment }) {
  const subj = String(subject || "");
  const body = String(bodyText || "");
  const breakdown = [];
  let health = 78;

  if (!subj.trim() && !body.trim()) {
    return {
      enabled: false,
      health: null,
      riskLabel: "Mesaj yok",
      breakdown: [{ signal: "Mesaj", delta: 0, detail: "Konu/gövde verilmedi" }],
    };
  }

  const links = countLinks(`${subj}\n${body}`);
  if (links >= 5) {
    health -= 18;
    breakdown.push({ signal: "Link", delta: -18, detail: `${links} link (aşırı)` });
  } else if (links >= 3) {
    health -= 8;
    breakdown.push({ signal: "Link", delta: -8, detail: `${links} link` });
  } else {
    breakdown.push({ signal: "Link", delta: 0, detail: `${links} link` });
  }

  if (SPAMMY_SUBJECT_RE.test(subj)) {
    health -= 12;
    breakdown.push({ signal: "Konu", delta: -12, detail: "Spam benzeri konu kalıbı" });
  } else if (subj && subj === subj.toUpperCase() && subj.length > 8) {
    health -= 8;
    breakdown.push({ signal: "Konu", delta: -8, detail: "Tamamı büyük harf" });
  } else {
    breakdown.push({ signal: "Konu", delta: 0, detail: "Normal" });
  }

  if (hasAttachment) {
    health -= 4;
    breakdown.push({
      signal: "Ek",
      delta: -4,
      detail: "PDF/ek var (CV için normal; hafif risk)",
    });
  }

  const bodyLen = body.trim().length;
  if (bodyLen > 0 && bodyLen < 80) {
    health -= 6;
    breakdown.push({ signal: "Gövde", delta: -6, detail: "Çok kısa gövde" });
  } else if (bodyLen > 3500) {
    health -= 5;
    breakdown.push({ signal: "Gövde", delta: -5, detail: "Çok uzun gövde" });
  } else {
    breakdown.push({ signal: "Gövde", delta: 0, detail: `${bodyLen} karakter` });
  }

  health = clamp(health, 0, 100);
  let riskLabel = "Düşük mesaj riski";
  if (health < 50) riskLabel = "Yüksek mesaj riski";
  else if (health < 70) riskLabel = "Orta mesaj riski";

  return {
    enabled: true,
    health,
    riskLabel,
    linkCount: links,
    breakdown,
  };
}

function bandForScore(score) {
  if (score >= 80) {
    return {
      band: "good",
      label: "İyi itibar tahmini",
      emoji: "🟢",
      color: "green",
      action: "pass",
      actionLabel: "GÖNDEREN İTİBARI İYİ (TAHMİN)",
    };
  }
  if (score >= 50) {
    return {
      band: "medium",
      label: "Orta itibar tahmini",
      emoji: "🟡",
      color: "yellow",
      action: "info",
      actionLabel: "DİKKAT — GÖNDEREN İTİBARI ORTA",
    };
  }
  return {
    band: "low",
    label: "Zayıf itibar tahmini",
    emoji: "🔴",
    color: "red",
    action: "info",
    actionLabel: "GÖNDEREN İTİBARI ZAYIF (TAHMİN)",
  };
}

/**
 * Ana hesaplama
 */
async function computeSpamRiskScore(options = {}) {
  const {
    userId,
    clientId,
    forceRefreshDns = false,
    subject,
    bodyText,
    hasAttachment = false,
  } = options;

  if (!userId || !clientId) {
    return { ok: false, error: "userId ve clientId gerekli" };
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return { ok: false, error: "Kullanıcı bulunamadı" };
  }

  const dns = await checkEmailDeliverability({ forceRefresh: forceRefreshDns });
  if (!dns?.ok) {
    return { ok: false, error: dns?.error || "DNS kontrolü başarısız" };
  }

  const [infra, behavior, engagement, outcomes] = await Promise.all([
    Promise.resolve(scoreInfrastructure(dns)),
    scoreBehavior({ clientId, user }),
    scoreEngagement({ userId, clientId }),
    scoreOutcomes({ userId }),
  ]);

  const messageRisk = scoreMessageRisk({ subject, bodyText, hasAttachment });

  const activeParts = [infra, behavior];
  let scoringMode = "infra_behavior";
  let denom = infra.max + behavior.max; // 70

  if (engagement.enabled) {
    activeParts.push(engagement);
    denom += engagement.max;
    scoringMode = "with_engagement";
  }
  if (outcomes.enabled) {
    activeParts.push(outcomes);
    denom += outcomes.max;
    scoringMode = outcomes.enabled && engagement.enabled ? "full" : scoringMode + "_outcomes";
  }

  const rawSum = activeParts.reduce((s, p) => s + p.points, 0);
  const score = clamp(Math.round((rawSum / denom) * 100), 0, 100);
  const band = bandForScore(score);

  return {
    ok: true,
    scoreTitle: "Gönderen itibar tahmini",
    scoreScope:
      "Bu skor GÖNDEREN hesabın itibar tahminidir. Belirli bir alıcının spam/inbox kararını tahmin etmez.",
    estimateDisclaimer:
      "Bu skor kendi gönderim geçmişinize ve işaretlediğiniz gelen kutusu/spam sonuçlarına dayalı bir tahmindir; mail sağlayıcılarının gerçek spam algoritmasını yansıtmaz.",
    scoringMode,
    score,
    rawSum,
    denom,
    ...band,
    actionEmoji: band.emoji,
    categories: {
      infrastructure: infra,
      behavior,
      engagement,
      outcomes,
    },
    messageRisk,
    weights: {
      infrastructureMax: infra.max,
      behaviorMax: behavior.max,
      engagementMax: engagement.max,
      outcomesMax: outcomes.max,
      engagementMinMails: ENGAGEMENT_MIN_MAILS,
      outcomeMinMarks: OUTCOME_MIN_MARKS,
    },
    domain: dns.domain,
    senderEmail: dns.senderEmail,
    managedByProvider: dns.managedByProvider,
    checkType: "sender-reputation-estimate",
    note: dns.note,
    dkimMeta: dns.dkimMeta,
    realAuthGuidance: dns.realAuthGuidance,
    checks: dns.checks,
    summary: dns.summary,
    labels: dns.labels,
    issues: dns.issues,
    suggestions: dns.suggestions,
    totalIssues: dns.totalIssues,
    cached: dns.cached,
    cacheAgeHours: dns.cacheAgeHours,
    checkedAt: new Date(),
  };
}

module.exports = {
  computeSpamRiskScore,
  scoreInfrastructure,
  scoreBehavior,
  scoreEngagement,
  scoreOutcomes,
  scoreMessageRisk,
  ENGAGEMENT_MIN_MAILS,
  OUTCOME_MIN_MARKS,
};
