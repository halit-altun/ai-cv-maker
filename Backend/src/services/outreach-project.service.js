const OutreachProject = require("../models/outreach-project.model");
const OutreachLog = require("../models/outreach-log.model");
const { AppError } = require("../utils/app-error");

const DEFAULT_SEED_NAME = "DUBAI";

function mapProject(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name || "",
    lastSelectedAt: doc.lastSelectedAt || doc.updatedAt || doc.createdAt,
    archived: Boolean(doc.archived),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function ensureDefaultProject(clientId, userId) {
  const count = await OutreachProject.countDocuments({ clientId, archived: { $ne: true } });
  if (count > 0) return null;

  try {
    const created = await OutreachProject.create({
      clientId,
      userId,
      name: DEFAULT_SEED_NAME,
      lastSelectedAt: new Date(),
    });
    return created;
  } catch (err) {
    if (err && err.code === 11000) {
      return OutreachProject.findOne({ clientId, name: DEFAULT_SEED_NAME }).lean();
    }
    throw err;
  }
}

/**
 * Projeleri listeler; yoksa DUBAI örnek projesini oluşturur.
 * Sıra: lastSelectedAt desc → en son seçilen her zaman ilk sırada.
 */
async function listProjects(clientId, userId) {
  await ensureDefaultProject(clientId, userId);

  const items = await OutreachProject.find({ clientId, archived: { $ne: true } })
    .sort({ lastSelectedAt: -1, createdAt: -1 })
    .lean();

  return {
    projects: items.map(mapProject),
    lastSelectedId: items[0] ? String(items[0]._id) : null,
  };
}

async function createProject(clientId, userId, name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    throw new AppError("Proje adı zorunlu.", 400, "PROJECT_NAME_REQUIRED");
  }

  try {
    const created = await OutreachProject.create({
      clientId,
      userId,
      name: trimmed,
      lastSelectedAt: new Date(),
    });
    return mapProject(created);
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError("Bu isimde bir proje zaten var.", 409, "PROJECT_EXISTS");
    }
    throw err;
  }
}

async function selectProject(clientId, userId, projectId) {
  const project = await OutreachProject.findOne({ _id: projectId, clientId });
  if (!project || project.archived) {
    throw new AppError("Proje bulunamadı.", 404, "PROJECT_NOT_FOUND");
  }
  project.lastSelectedAt = new Date();
  if (userId) project.userId = userId;
  await project.save();
  return mapProject(project);
}

async function getProjectOrThrow(clientId, projectId) {
  if (!projectId) return null;
  const project = await OutreachProject.findOne({ _id: projectId, clientId, archived: { $ne: true } }).lean();
  if (!project) {
    throw new AppError("Proje bulunamadı.", 404, "PROJECT_NOT_FOUND");
  }
  return project;
}

function extractSentEmails(log) {
  const fromRecipients = (log.recipients || [])
    .filter((r) => r && (r.status === "sent" || r.status === "logged"))
    .map((r) => String(r.email || "").trim().toLowerCase())
    .filter(Boolean);
  const v = log.verification || {};
  const fromSelected = Array.isArray(v.selectedEmails) && v.selectedEmails.length
    ? v.selectedEmails
    : v.selectedEmail
      ? [v.selectedEmail]
      : [];
  const selectedNorm = fromSelected
    .map((e) => String(e || "").trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...fromRecipients, ...selectedNorm])];
}

function extractVerifiedEmails(log) {
  const checks = log.verification?.checks || [];
  return checks
    .filter((c) => c && c.isValid)
    .map((c) => String(c.email || "").trim().toLowerCase())
    .filter(Boolean);
}

function extractInvalidEmails(log) {
  const checks = log.verification?.checks || [];
  return checks
    .filter((c) => c && !c.isValid)
    .map((c) => String(c.email || "").trim().toLowerCase())
    .filter(Boolean);
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseYmd(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, day] = raw.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * range: today | yesterday | custom | all
 * from/to: YYYY-MM-DD (custom)
 */
function resolveDashboardDateRange({ range, from, to } = {}) {
  const preset = String(range || "all").trim().toLowerCase();
  const now = new Date();

  if (preset === "today") {
    const start = startOfLocalDay(now);
    const end = endOfLocalDay(now);
    return {
      preset: "today",
      from: start,
      to: end,
      fromYmd: formatYmd(start),
      toYmd: formatYmd(end),
    };
  }

  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const start = startOfLocalDay(y);
    const end = endOfLocalDay(y);
    return {
      preset: "yesterday",
      from: start,
      to: end,
      fromYmd: formatYmd(start),
      toYmd: formatYmd(end),
    };
  }

  if (preset === "custom") {
    const startDate = parseYmd(from);
    const endDate = parseYmd(to) || startDate;
    if (!startDate) {
      throw new AppError("Özel aralık için başlangıç tarihi (from) gerekli (YYYY-MM-DD).", 400, "DATE_FROM_REQUIRED");
    }
    let start = startOfLocalDay(startDate);
    let end = endOfLocalDay(endDate || startDate);
    if (start.getTime() > end.getTime()) {
      const tmp = start;
      start = startOfLocalDay(endDate);
      end = endOfLocalDay(startDate);
    }
    return {
      preset: "custom",
      from: start,
      to: end,
      fromYmd: formatYmd(start),
      toYmd: formatYmd(end),
    };
  }

  return {
    preset: "all",
    from: null,
    to: null,
    fromYmd: null,
    toYmd: null,
  };
}

function formatYmd(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Proje bazlı özet + firma listesi.
 * options.range: today | yesterday | custom | all
 * options.from / options.to: YYYY-MM-DD (custom)
 */
async function getProjectDashboard(clientId, projectId, options = {}) {
  const project = await getProjectOrThrow(clientId, projectId);
  if (!project) {
    throw new AppError("Proje gerekli.", 400, "PROJECT_REQUIRED");
  }

  const dateRange = resolveDashboardDateRange(options);
  const query = { clientId, projectId: project._id };
  if (dateRange.from && dateRange.to) {
    query.sentAt = { $gte: dateRange.from, $lte: dateRange.to };
  }

  const logs = await OutreachLog.find(query).sort({ sentAt: -1 }).lean();

  const companyMap = new Map();
  let totalMailsSent = 0;
  let totalMailsFailed = 0;
  let totalMailsLogged = 0;
  let mailAttemptCount = 0;
  let analysisOnlyCount = 0;
  let aiErrorCount = 0;
  let verifyFailedCount = 0;
  const allSentEmails = new Set();
  const allVerifiedEmails = new Set();
  const allInvalidEmails = new Set();

  for (const raw of logs) {
    const domain = raw.domain || "unknown";
    const key = domain;
    if (!companyMap.has(key)) {
      companyMap.set(key, {
        companyName: raw.companyName || domain,
        domain,
        lastActivityAt: raw.sentAt,
        hasMailSent: false,
        hasAnalysisOnly: false,
        analysisOnlyAt: null,
        mailSentAt: null,
        sentEmails: [],
        verifiedEmails: [],
        invalidEmails: [],
        statuses: [],
        activityCount: 0,
        logs: [],
      });
    }
    const group = companyMap.get(key);
    group.activityCount += 1;
    group.statuses.push(raw.status);
    if (!group.lastActivityAt || new Date(raw.sentAt) > new Date(group.lastActivityAt)) {
      group.lastActivityAt = raw.sentAt;
      group.companyName = raw.companyName || group.companyName;
    }

    const sentEmails = extractSentEmails(raw);
    const verified = extractVerifiedEmails(raw);
    const invalid = extractInvalidEmails(raw);
    sentEmails.forEach((e) => {
      allSentEmails.add(e);
      if (!group.sentEmails.includes(e)) group.sentEmails.push(e);
    });
    verified.forEach((e) => {
      allVerifiedEmails.add(e);
      if (!group.verifiedEmails.includes(e)) group.verifiedEmails.push(e);
    });
    invalid.forEach((e) => {
      allInvalidEmails.add(e);
      if (!group.invalidEmails.includes(e)) group.invalidEmails.push(e);
    });

    if (raw.status === "analysis_only") {
      analysisOnlyCount += 1;
      group.hasAnalysisOnly = true;
      if (!group.analysisOnlyAt || new Date(raw.sentAt) > new Date(group.analysisOnlyAt)) {
        group.analysisOnlyAt = raw.sentAt;
      }
    } else if (raw.status === "ai_error") {
      aiErrorCount += 1;
    } else if (raw.status === "verify_failed") {
      verifyFailedCount += 1;
      mailAttemptCount += 1;
    } else {
      mailAttemptCount += 1;
      totalMailsSent += Number(raw.sentCount || 0);
      totalMailsFailed += Number(raw.failedCount || 0);
      totalMailsLogged += Number(raw.loggedCount || 0);
      if (raw.status === "success" || raw.status === "partial" || (raw.sentCount || 0) > 0) {
        group.hasMailSent = true;
        if (!group.mailSentAt || new Date(raw.sentAt) > new Date(group.mailSentAt)) {
          group.mailSentAt = raw.sentAt;
        }
      }
    }

    group.logs.push({
      id: String(raw._id),
      status: raw.status,
      sentAt: raw.sentAt,
      sentCount: raw.sentCount || 0,
      failedCount: raw.failedCount || 0,
      sentEmails,
      verifiedEmails: verified,
      invalidEmails: invalid,
      errorMessage: raw.errorMessage || "",
      subject: raw.subject || "",
      targetPosition: raw.targetPosition || "",
      verification: raw.verification || null,
      recipients: raw.recipients || [],
    });
  }

  const companies = [...companyMap.values()].sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

  const companiesWithMail = companies.filter((c) => c.hasMailSent).length;
  const companiesAnalysisOnly = companies.filter((c) => c.hasAnalysisOnly && !c.hasMailSent).length;

  return {
    project: mapProject(project),
    dateRange: {
      preset: dateRange.preset,
      from: dateRange.fromYmd,
      to: dateRange.toYmd,
    },
    totals: {
      companiesTotal: companies.length,
      companiesWithMail,
      companiesAnalysisOnly,
      companiesTouched: companies.length,
      /** Mail gönderim denemesi = başvuru sayısı */
      totalApplications: mailAttemptCount,
      mailAttemptCount,
      analysisOnlyCount,
      aiErrorCount,
      verifyFailedCount,
      totalMailsSent,
      totalMailsFailed,
      totalMailsLogged,
      uniqueSentEmails: allSentEmails.size,
      uniqueVerifiedEmails: allVerifiedEmails.size,
      uniqueInvalidEmails: allInvalidEmails.size,
      logCount: logs.length,
    },
    companies,
  };
}

module.exports = {
  listProjects,
  createProject,
  selectProject,
  getProjectOrThrow,
  getProjectDashboard,
  resolveDashboardDateRange,
  mapProject,
  DEFAULT_SEED_NAME,
};
