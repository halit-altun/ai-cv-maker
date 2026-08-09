const crypto = require("crypto");
const MailTracking = require("../models/mail-tracking.model");
const MailOpenEvent = require("../models/mail-open-event.model");

/**
 * Yeni mail tracking kaydı oluştur
 */
async function createMailTracking({
  userId,
  recipient,
  company,
  jobTitle,
  subject,
  outreachLogId,
  projectId,
  projectName,
}) {
  const mailId = crypto.randomUUID();

  const tracking = new MailTracking({
    mailId,
    userId,
    recipient,
    company: String(company || "").trim(),
    jobTitle: String(jobTitle || "").trim(),
    subject,
    status: "SENT",
    sentAt: new Date(),
    outreachLogId,
    projectId: projectId || null,
    projectName: String(projectName || "").trim(),
  });

  await tracking.save();

  console.log(
    `[MAIL_TRACKING] Created tracking: ${mailId} | recipient: ${recipient} | company: ${
      company || "-"
    } | project: ${projectName || projectId || "-"}`
  );

  return {
    mailId,
    tracking,
  };
}

/**
 * Mail açılışını kaydet (pixel tetiklendi)
 */
async function recordMailOpen(mailId, { ip, userAgent, referer } = {}) {
  const tracking = await MailTracking.findOne({ mailId });

  if (!tracking) {
    console.warn(`[MAIL_TRACKING] Tracking not found for mailId: ${mailId}`);
    return { found: false };
  }

  const now = new Date();
  const sentAt = tracking.sentAt || tracking.createdAt;
  const openedInSeconds = Math.floor((now - sentAt) / 1000);

  // Bot detection: 3 saniye içinde açıldıysa muhtemelen bot
  const isLikelyBot = openedInSeconds < 3;

  // MailOpenEvent kaydet
  const openEvent = new MailOpenEvent({
    mailId,
    ip,
    userAgent,
    referer,
    openedInSeconds,
    isLikelyBot,
  });

  await openEvent.save();

  // MailTracking güncelle
  tracking.openedCount += 1;
  tracking.status = "OPENED";

  if (!tracking.firstOpenedAt) {
    tracking.firstOpenedAt = now;
  }

  tracking.lastOpenedAt = now;

  // İlk açılış bot ise işaretle
  if (tracking.openedCount === 1 && isLikelyBot) {
    tracking.isLikelyBot = true;
  }

  await tracking.save();

  console.log(
    `[MAIL_TRACKING] Recorded open: ${mailId} | count: ${tracking.openedCount} | bot: ${isLikelyBot} | ${openedInSeconds}s`
  );

  return {
    found: true,
    tracking,
    openEvent,
    isLikelyBot,
  };
}

/**
 * Mail statüsünü güncelle (DELIVERED/FAILED)
 */
async function updateMailStatus(mailId, status, errorMessage = null) {
  const tracking = await MailTracking.findOne({ mailId });

  if (!tracking) {
    console.warn(`[MAIL_TRACKING] Tracking not found for mailId: ${mailId}`);
    return { found: false };
  }

  tracking.status = status;

  if (errorMessage) {
    tracking.errorMessage = errorMessage;
  }

  await tracking.save();

  console.log(`[MAIL_TRACKING] Updated status: ${mailId} → ${status}`);

  return { found: true, tracking };
}

/**
 * YYYY-MM-DD → gün başı/sonu (Europe/Istanbul)
 */
function parseSentDayBounds(dateStr) {
  const raw = String(dateStr || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const start = new Date(`${raw}T00:00:00.000+03:00`);
  const end = new Date(`${raw}T23:59:59.999+03:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

/**
 * Liste / istatistik için ortak filtre sorgusu
 */
function buildMailTrackingQuery(
  userId,
  { status, projectId, company, date, startDate, endDate } = {}
) {
  const query = { userId };

  if (status) {
    query.status = status;
  }

  if (projectId) {
    query.projectId = projectId;
  }

  if (company) {
    query.company = { $regex: String(company), $options: "i" };
  }

  // Tek gün (date) veya aralık — gönderim tarihi (sentAt); yoksa createdAt
  const day = parseSentDayBounds(date);
  if (day) {
    query.$or = [
      { sentAt: { $gte: day.start, $lte: day.end } },
      {
        $and: [
          { $or: [{ sentAt: null }, { sentAt: { $exists: false } }] },
          { createdAt: { $gte: day.start, $lte: day.end } },
        ],
      },
    ];
  } else if (startDate || endDate) {
    const range = {};
    if (startDate) {
      const s = parseSentDayBounds(String(startDate).slice(0, 10));
      range.$gte = s ? s.start : new Date(startDate);
    }
    if (endDate) {
      const e = parseSentDayBounds(String(endDate).slice(0, 10));
      range.$lte = e ? e.end : new Date(endDate);
    }
    query.$or = [
      { sentAt: range },
      {
        $and: [
          { $or: [{ sentAt: null }, { sentAt: { $exists: false } }] },
          { createdAt: range },
        ],
      },
    ];
  }

  return query;
}

/**
 * Filtreye uyan benzersiz (boş olmayan) şirket sayısı
 */
async function countDistinctCompanies(query) {
  const companies = await MailTracking.distinct("company", query);
  return companies.filter((c) => typeof c === "string" && c.trim().length > 0).length;
}

/**
 * Özet istatistikler (liste ile aynı filtreleri destekler)
 */
async function getMailTrackingStatsSummary(
  userId,
  { status, projectId, company, date, startDate, endDate } = {}
) {
  const base = buildMailTrackingQuery(userId, {
    status,
    projectId,
    company,
    date,
    startDate,
    endDate,
  });

  const [total, sent, delivered, opened, failed, inbox, spam, companyCount] =
    await Promise.all([
      MailTracking.countDocuments(base),
      MailTracking.countDocuments({ ...base, status: "SENT" }),
      MailTracking.countDocuments({ ...base, status: "DELIVERED" }),
      MailTracking.countDocuments({ ...base, status: "OPENED" }),
      MailTracking.countDocuments({ ...base, status: "FAILED" }),
      MailTracking.countDocuments({ ...base, deliveryOutcome: "inbox" }),
      MailTracking.countDocuments({ ...base, deliveryOutcome: "spam" }),
      countDistinctCompanies(base),
    ]);

  const openRate = total > 0 ? Number(((opened / total) * 100).toFixed(1)) : 0;
  const marked = inbox + spam;
  const inboxRate = marked > 0 ? Number(((inbox / marked) * 100).toFixed(1)) : null;

  return {
    total,
    companyCount,
    sent,
    delivered,
    opened,
    failed,
    openRate,
    inbox,
    spam,
    inboxRate,
  };
}

/**
 * Soft-delete sonrası name "archived:<id>:<orijinal>" olur; UI'da yalnızca orijinal ad.
 */
function resolveDisplayProjectName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const match = /^archived:[a-f0-9]{24}:(.+)$/i.exec(raw);
  if (match) return String(match[1] || "").trim();
  // Yanlışlıkla sadece ObjectId yazılmışsa gösterme
  if (/^[a-f0-9]{24}$/i.test(raw)) return "";
  return raw;
}

/**
 * Eksik company / projectName alanlarını liste için doldur (eski kayıtlar).
 */
async function enrichMailTrackingRows(trackings = []) {
  const rows = Array.isArray(trackings) ? trackings : [];
  if (!rows.length) return rows;

  const OutreachProject = require("../models/outreach-project.model");
  const OutreachLog = require("../models/outreach-log.model");

  const projectIdsNeedingName = [
    ...new Set(
      rows
        .filter((t) => {
          if (!t.projectId) return false;
          const display = resolveDisplayProjectName(t.projectName);
          return !display;
        })
        .map((t) => String(t.projectId))
    ),
  ];

  const projectNameById = new Map();
  if (projectIdsNeedingName.length) {
    const projects = await OutreachProject.find({
      _id: { $in: projectIdsNeedingName },
    })
      .select("name")
      .lean();
    for (const p of projects) {
      const display = resolveDisplayProjectName(p.name);
      if (display) projectNameById.set(String(p._id), display);
    }
  }

  const mailIdsMissingCompany = rows
    .filter((t) => !String(t.company || "").trim() && t.mailId)
    .map((t) => String(t.mailId));

  const companyByMailId = new Map();
  if (mailIdsMissingCompany.length) {
    const logs = await OutreachLog.find({
      "recipients.mailId": { $in: mailIdsMissingCompany },
    })
      .select("companyName domain recipients.mailId")
      .lean();
    for (const log of logs) {
      const name =
        String(log.companyName || "").trim() || String(log.domain || "").trim();
      if (!name) continue;
      for (const r of log.recipients || []) {
        const mid = String(r.mailId || "");
        if (mid && mailIdsMissingCompany.includes(mid) && !companyByMailId.has(mid)) {
          companyByMailId.set(mid, name);
        }
      }
    }
  }

  const toPersist = [];
  for (const row of rows) {
    let changed = false;

    const currentDisplay = resolveDisplayProjectName(row.projectName);
    if (String(row.projectName || "").trim() !== currentDisplay) {
      // archived:id:Name veya ham ObjectId → temiz ad
      if (currentDisplay) {
        row.projectName = currentDisplay;
        changed = true;
      } else if (row.projectId) {
        const fromProject = projectNameById.get(String(row.projectId)) || "";
        if (fromProject) {
          row.projectName = fromProject;
          changed = true;
        } else if (String(row.projectName || "").trim()) {
          // Geçersiz id-benzeri değeri temizle
          row.projectName = "";
          changed = true;
        }
      }
    } else if (row.projectId && !currentDisplay) {
      const fromProject = projectNameById.get(String(row.projectId)) || "";
      if (fromProject) {
        row.projectName = fromProject;
        changed = true;
      }
    }

    if (!String(row.company || "").trim() && row.mailId) {
      const name = companyByMailId.get(String(row.mailId)) || "";
      if (name) {
        row.company = name;
        changed = true;
      }
    }
    if (changed && row._id) {
      toPersist.push({
        id: row._id,
        company: row.company,
        projectName: row.projectName,
      });
    }
  }

  // Sessiz backfill — sonraki listelerde join gerekmesin
  if (toPersist.length) {
    await Promise.all(
      toPersist.map((p) =>
        MailTracking.updateOne(
          { _id: p.id },
          {
            $set: {
              ...(p.company ? { company: p.company } : {}),
              projectName: String(p.projectName || ""),
            },
          }
        ).catch(() => null)
      )
    );
  }

  return rows;
}

/**
 * Kullanıcının mail tracking listesini al
 */
async function getUserMailTrackings(
  userId,
  { limit = 50, skip = 0, status, projectId, company, date, startDate, endDate } = {}
) {
  const query = buildMailTrackingQuery(userId, {
    status,
    projectId,
    company,
    date,
    startDate,
    endDate,
  });

  const [rawTrackings, total, companyCount] = await Promise.all([
    MailTracking.find(query)
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    MailTracking.countDocuments(query),
    countDistinctCompanies(query),
  ]);

  const trackings = await enrichMailTrackingRows(rawTrackings);

  return {
    trackings,
    total,
    companyCount,
    limit,
    skip,
  };
}

/**
 * Mail tracking detaylarını al (açılış event'leri ile)
 */
async function getMailTrackingDetails(mailId, userId) {
  const trackingRaw = await MailTracking.findOne({ mailId, userId }).lean();

  if (!trackingRaw) {
    return { found: false };
  }

  const [tracking] = await enrichMailTrackingRows([trackingRaw]);

  const openEvents = await MailOpenEvent.find({ mailId })
    .sort({ createdAt: -1 })
    .lean();

  const pixelUrl = generateTrackingPixelUrl(mailId);
  const trackingBase = getTrackingPublicBaseUrl();

  return {
    found: true,
    tracking,
    openEvents,
    pixelUrl,
    trackingBaseIsLocal: isLocalTrackingBase(trackingBase),
  };
}

/**
 * Kullanıcı outcome bildirimi: inbox | spam | unknown
 */
async function setDeliveryOutcome(mailId, userId, outcome) {
  const allowed = new Set(["inbox", "spam", "unknown"]);
  const value = String(outcome || "").trim().toLowerCase();
  if (!allowed.has(value)) {
    return { ok: false, error: "Geçersiz outcome (inbox|spam|unknown)" };
  }

  const tracking = await MailTracking.findOneAndUpdate(
    { mailId, userId },
    {
      deliveryOutcome: value,
      deliveryOutcomeAt: value === "unknown" ? null : new Date(),
    },
    { new: true }
  ).lean();

  if (!tracking) {
    return { ok: false, error: "Mail tracking bulunamadı" };
  }

  return { ok: true, tracking };
}

/**
 * Production Northflank public API (env yokken son çare).
 * Gmail proxy localhost'a erişemez; pixel her zaman public HTTPS olmalı.
 */
const DEFAULT_PRODUCTION_API_BASE =
  "https://portal--cv-ai-maker--6gvfdf2h8v7d.code.run";

function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim().replace(/\/$/, "");
  return value || "";
}

function isLocalTrackingBase(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/**
 * Express req üzerinden public base (Northflank X-Forwarded-* ile).
 */
function resolveTrackingBaseFromRequest(req) {
  if (!req || typeof req.get !== "function") return "";
  const host = String(
    req.get("x-forwarded-host") || req.get("host") || ""
  )
    .split(",")[0]
    .trim();
  if (!host || isLocalTrackingBase(`http://${host}`)) return "";

  const proto = String(
    req.get("x-forwarded-proto") || req.protocol || "https"
  )
    .split(",")[0]
    .trim()
    .replace(/:$/, "");

  return normalizeBaseUrl(`${proto || "https"}://${host}`);
}

/**
 * Tracking pixel URL tabanı.
 * Öncelik: override → env → production default → localhost (yalnızca local).
 */
function getTrackingPublicBaseUrl(overrideBaseUrl) {
  const candidates = [
    overrideBaseUrl,
    process.env.TRACKING_PUBLIC_BASE_URL,
    process.env.API_BASE_URL,
    process.env.PUBLIC_API_URL,
    process.env.BACKEND_PUBLIC_URL,
  ];

  for (const candidate of candidates) {
    const base = normalizeBaseUrl(candidate);
    if (base && !isLocalTrackingBase(base)) {
      return base;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_API_BASE;
  }

  return normalizeBaseUrl(
    `http://localhost:${process.env.PORT || 3011}`
  );
}

function generateTrackingPixelUrl(mailId, baseUrl) {
  const base = getTrackingPublicBaseUrl(baseUrl);
  const id = String(mailId || "").replace(/\.png$/i, "");
  return `${base}/api/track/pixel/${id}.png`;
}

/**
 * Tracking pixel HTML tag
 */
function generateTrackingPixelHtml(mailId, baseUrl) {
  const pixelUrl = generateTrackingPixelUrl(mailId, baseUrl);
  if (isLocalTrackingBase(pixelUrl)) {
    console.warn(
      `[MAIL_TRACKING] UYARI: Pixel URL localhost (${pixelUrl}). Gmail/Outlook bu adresi açamaz; OPENED kaydı düşmez. TRACKING_PUBLIC_BASE_URL veya API_BASE_URL ayarlayın.`
    );
  } else {
    console.log(`[MAIL_TRACKING] Pixel URL: ${pixelUrl}`);
  }
  // display:none Gmail'de bazen yüklenmez; 1x1 block kullan
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;text-decoration:none;" />`;
}

module.exports = {
  createMailTracking,
  recordMailOpen,
  updateMailStatus,
  getUserMailTrackings,
  getMailTrackingStatsSummary,
  getMailTrackingDetails,
  setDeliveryOutcome,
  getTrackingPublicBaseUrl,
  resolveTrackingBaseFromRequest,
  isLocalTrackingBase,
  generateTrackingPixelUrl,
  generateTrackingPixelHtml,
  DEFAULT_PRODUCTION_API_BASE,
};
