const EmailQueue = require("../models/email-queue.model");
const mongoose = require("mongoose");
const {
  getUserIntervalSeconds,
} = require("./email-queue.service");
const {
  listPendingCompanySendItems,
  getTodoJobItemDetail,
} = require("./todo-application.service");
const { AppError } = require("../utils/app-error");

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSentDayBounds(dateStr) {
  const raw = String(dateStr || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const start = new Date(`${raw}T00:00:00.000+03:00`);
  const end = new Date(`${raw}T23:59:59.999+03:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function buildEmailQueueQuery(
  userId,
  { status, projectId, company, recipient, date, startDate, endDate } = {}
) {
  const uid =
    mongoose.Types.ObjectId.isValid(String(userId)) && String(userId).length === 24
      ? new mongoose.Types.ObjectId(String(userId))
      : userId;
  const query = { userId: uid };
  const andParts = [];

  if (status) {
    query.status = status;
  }

  if (company) {
    query.companyName = { $regex: escapeRegex(company), $options: "i" };
  }

  const recipientQ = String(recipient || "").trim();
  if (recipientQ) {
    andParts.push({
      to: { $regex: escapeRegex(recipientQ), $options: "i" },
    });
  }

  if (projectId) {
    const pid = String(projectId);
    andParts.push({
      $or: [
        { "metadata.projectId": pid },
        { "metadata.projectId": projectId },
      ],
    });
  }

  const day = parseSentDayBounds(date);
  if (day) {
    andParts.push({
      $or: [
        { scheduledAt: { $gte: day.start, $lte: day.end } },
        {
          $and: [
            { $or: [{ scheduledAt: null }, { scheduledAt: { $exists: false } }] },
            { createdAt: { $gte: day.start, $lte: day.end } },
          ],
        },
      ],
    });
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
    andParts.push({
      $or: [{ scheduledAt: range }, { createdAt: range }],
    });
  }

  if (andParts.length === 1) {
    Object.assign(query, andParts[0]);
  } else if (andParts.length > 1) {
    query.$and = andParts;
  }

  return query;
}

function mapQueueItem(doc) {
  const meta = doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  return {
    id: String(doc._id),
    status: doc.status,
    to: Array.isArray(doc.to) ? doc.to : [],
    recipient: Array.isArray(doc.to) ? doc.to[0] || "" : "",
    subject: doc.subject || "",
    companyName: doc.companyName || "",
    domain: doc.domain || "",
    scheduledAt: doc.scheduledAt || null,
    sentAt: doc.sentAt || null,
    processedAt: doc.processedAt || null,
    lastError: doc.lastError || "",
    projectId: meta.projectId ? String(meta.projectId) : null,
    companyUrl: meta.companyUrl || "",
    todoJobId: meta.todoJobId ? String(meta.todoJobId) : null,
    todoItemId: meta.todoItemId ? String(meta.todoItemId) : null,
    mailId: meta.mailId || "",
    appliedIntervalSeconds: meta.appliedIntervalSeconds || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listSendQueue(userId, filters = {}) {
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
  const skip = Math.max(0, Number(filters.skip) || 0);
  const query = buildEmailQueueQuery(userId, filters);

  const [docs, total, pendingJobItems] = await Promise.all([
    EmailQueue.find(query)
      .sort({ scheduledAt: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select("-attachments.contentBase64 -bodyHtml -bodyText")
      .lean(),
    EmailQueue.countDocuments(query),
    listPendingCompanySendItems(userId, {
      projectId: filters.projectId,
      company: filters.company,
      recipient: filters.recipient,
    }),
  ]);

  return {
    items: docs.map(mapQueueItem),
    total,
    limit,
    skip,
    pendingJobItems,
  };
}

async function getSendQueueSummary(userId, filters = {}) {
  const { status: _status, ...rest } = filters;
  const query = buildEmailQueueQuery(userId, rest);

  const [grouped, lastPending, interval, pendingJobItems] = await Promise.all([
    EmailQueue.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          lastScheduledAt: { $max: "$scheduledAt" },
        },
      },
    ]),
    EmailQueue.findOne({
      ...query,
      status: { $in: ["pending", "processing"] },
    })
      .sort({ scheduledAt: -1 })
      .select("scheduledAt")
      .lean(),
    getUserIntervalSeconds(userId),
    listPendingCompanySendItems(userId, {
      projectId: rest.projectId,
      company: rest.company,
      recipient: rest.recipient,
    }),
  ]);

  const counts = { pending: 0, processing: 0, sent: 0, failed: 0 };
  for (const row of grouped) {
    if (row._id && counts[row._id] !== undefined) {
      counts[row._id] = row.count;
    }
  }

  const queued = counts.pending + counts.processing;
  const pendingJobRecipientCount = pendingJobItems.reduce(
    (sum, item) => sum + Number(item.recipientCount || 0),
    0
  );

  return {
    queued,
    pending: counts.pending,
    processing: counts.processing,
    sent: counts.sent,
    failed: counts.failed,
    pendingJobItemCount: pendingJobItems.length,
    pendingJobRecipientCount,
    estimatedCompletionAt: lastPending?.scheduledAt || null,
    intervalMinSeconds: interval.minSeconds,
    intervalMaxSeconds: interval.maxSeconds,
  };
}

async function getSendQueueDetail(userId, { jobId, itemId, queueId } = {}) {
  if (!queueId && !(jobId && itemId)) {
    throw new AppError(
      "jobId+itemId veya queueId gerekli.",
      400,
      "QUEUE_DETAIL_REQUIRED"
    );
  }
  const uid =
    mongoose.Types.ObjectId.isValid(String(userId)) && String(userId).length === 24
      ? new mongoose.Types.ObjectId(String(userId))
      : userId;

  let queueItem = null;
  let resolvedJobId = jobId;
  let resolvedItemId = itemId;

  if (queueId) {
    const doc = await EmailQueue.findOne({ _id: queueId, userId: uid })
      .select("-attachments.contentBase64")
      .lean();
    if (!doc) {
      const err = new Error("Kuyruk kaydı bulunamadı.");
      err.statusCode = 404;
      throw err;
    }
    queueItem = mapQueueItem(doc);
    resolvedJobId = resolvedJobId || queueItem.todoJobId;
    resolvedItemId = resolvedItemId || queueItem.todoItemId;
  }

  let analysis = null;
  if (resolvedJobId && resolvedItemId) {
    analysis = await getTodoJobItemDetail(userId, resolvedJobId, resolvedItemId);
  }

  let relatedQueueItems = [];
  if (resolvedItemId) {
    const related = await EmailQueue.find({
      userId: uid,
      "metadata.todoItemId": String(resolvedItemId),
    })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .select("-attachments.contentBase64 -bodyHtml -bodyText")
      .lean();
    relatedQueueItems = related.map(mapQueueItem);
  } else if (queueItem) {
    relatedQueueItems = [queueItem];
  }

  return {
    queueItem,
    relatedQueueItems,
    analysis,
  };
}

module.exports = {
  listSendQueue,
  getSendQueueSummary,
  getSendQueueDetail,
};
