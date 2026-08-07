const EmailQueue = require("../models/email-queue.model");
const User = require("../models/user.model");
const { sendMail } = require("./email.service");

const MAX_INTERVAL_SECONDS = 86400; // 24 saat

/**
 * Random interval (saniye) — min-max arası (dahil)
 */
function getRandomIntervalSeconds(minSeconds, maxSeconds) {
  if (minSeconds === 0 && maxSeconds === 0) return 0;
  if (minSeconds === maxSeconds) return minSeconds;
  const min = Math.min(minSeconds, maxSeconds);
  const max = Math.max(minSeconds, maxSeconds);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Kullanıcı aralığını toplam saniyeye çevir.
 * Yeni alanlar (seconds) öncelikli; eski sadece-dakika kayıtları için fallback.
 */
function resolveUserIntervalSeconds(user) {
  const minSecRaw = Number(user?.gmailSendIntervalMinSeconds);
  const maxSecRaw = Number(user?.gmailSendIntervalMaxSeconds);
  const minMin = Number(user?.gmailSendIntervalMinMinutes) || 0;
  const maxMin = Number(user?.gmailSendIntervalMaxMinutes) || 0;

  const secondsConfigured =
    (Number.isFinite(minSecRaw) && minSecRaw > 0) ||
    (Number.isFinite(maxSecRaw) && maxSecRaw > 0);

  let minSeconds = 0;
  let maxSeconds = 0;

  if (secondsConfigured) {
    minSeconds = Math.max(0, Math.min(MAX_INTERVAL_SECONDS, minSecRaw || 0));
    maxSeconds = Math.max(0, Math.min(MAX_INTERVAL_SECONDS, maxSecRaw || 0));
  } else if (minMin > 0 || maxMin > 0) {
    minSeconds = Math.max(0, Math.min(MAX_INTERVAL_SECONDS, minMin * 60));
    maxSeconds = Math.max(0, Math.min(MAX_INTERVAL_SECONDS, maxMin * 60));
  }

  return { minSeconds, maxSeconds };
}

async function getUserIntervalSeconds(userId) {
  const user = await User.findById(userId).select(
    "gmailSendIntervalMinMinutes gmailSendIntervalMaxMinutes gmailSendIntervalMinSeconds gmailSendIntervalMaxSeconds"
  );
  const { minSeconds, maxSeconds } = resolveUserIntervalSeconds(user);
  const intervalSeconds = getRandomIntervalSeconds(minSeconds, maxSeconds);
  return {
    minSeconds,
    maxSeconds,
    intervalSeconds,
    /** @deprecated alias — dakika cinsinden (geriye uyum) */
    minMinutes: Math.floor(minSeconds / 60),
    maxMinutes: Math.floor(maxSeconds / 60),
    intervalMinutes: Math.floor(intervalSeconds / 60),
  };
}

/** @deprecated use getUserIntervalSeconds */
async function getUserIntervalMinutes(userId) {
  return getUserIntervalSeconds(userId);
}

/**
 * Kullanıcının son "referans" zamanı: son gönderilen veya
 * kuyruktaki en geç planlanan pending mail.
 */
async function getUserScheduleCursor(userId) {
  const [lastSent, lastPending] = await Promise.all([
    EmailQueue.findOne({ userId, status: "sent" })
      .sort({ sentAt: -1 })
      .select("sentAt")
      .lean(),
    EmailQueue.findOne({ userId, status: "pending" })
      .sort({ scheduledAt: -1 })
      .select("scheduledAt")
      .lean(),
  ]);

  const sentAt = lastSent?.sentAt ? new Date(lastSent.sentAt) : null;
  const pendingAt = lastPending?.scheduledAt ? new Date(lastPending.scheduledAt) : null;

  if (sentAt && pendingAt) {
    return sentAt > pendingAt ? sentAt : pendingAt;
  }
  return sentAt || pendingAt || null;
}

function formatIntervalLabel(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0 && r > 0) return `${m} dk ${r} sn`;
  if (m > 0) return `${m} dk`;
  return `${r} sn`;
}

/**
 * Profil istek aralığı değişince bekleyen mailleri yeni değere göre yeniden diz.
 */
async function rescheduleUserPendingEmails(userId) {
  if (!userId) return { rescheduled: 0 };

  const { minSeconds, maxSeconds } = await getUserIntervalSeconds(userId);
  const pending = await EmailQueue.find({ userId, status: "pending" }).sort({
    scheduledAt: 1,
    createdAt: 1,
  });

  if (!pending.length) {
    return { rescheduled: 0, minSeconds, maxSeconds };
  }

  const lastSent = await EmailQueue.findOne({ userId, status: "sent" })
    .sort({ sentAt: -1 })
    .select("sentAt")
    .lean();

  const now = new Date();
  let cursor = lastSent?.sentAt ? new Date(lastSent.sentAt) : null;

  for (const item of pending) {
    if (minSeconds === 0 && maxSeconds === 0) {
      item.scheduledAt = now;
      await item.save();
      cursor = now;
      continue;
    }

    const gapSeconds = getRandomIntervalSeconds(minSeconds, maxSeconds);
    const gapMs = Math.max(0, gapSeconds) * 1000;
    let next = cursor ? new Date(cursor.getTime() + gapMs) : now;
    if (next < now) next = now;
    item.scheduledAt = next;
    item.metadata = {
      ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
      rescheduledAt: now.toISOString(),
      appliedIntervalSeconds: gapSeconds,
      appliedIntervalRangeSeconds: [minSeconds, maxSeconds],
    };
    await item.save();
    cursor = next;
  }

  console.log(
    `[EMAIL_QUEUE] Kullanıcı ${userId} için ${pending.length} pending mail yeniden planlandı (aralık ${formatIntervalLabel(minSeconds)} – ${formatIntervalLabel(maxSeconds)}).`
  );

  return {
    rescheduled: pending.length,
    minSeconds,
    maxSeconds,
  };
}

/**
 * Mail'i kuyruğa ekle — her seferinde güncel profil aralığını okur.
 */
async function enqueueEmail(userId, emailData, metadata = {}) {
  const { minSeconds, maxSeconds, intervalSeconds } = await getUserIntervalSeconds(userId);

  if (intervalSeconds === 0) {
    console.log(`[EMAIL_QUEUE] Interval 0, direkt gönderiliyor: ${emailData.to?.join(", ")}`);
    try {
      const result = await sendMail({
        ...emailData,
        html: emailData.html || emailData.bodyHtml,
      });
      return {
        queued: false,
        sent: true,
        immediate: true,
        result,
      };
    } catch (error) {
      console.error("[EMAIL_QUEUE] Direkt gönderim hatası:", error);
      throw error;
    }
  }

  const cursor = await getUserScheduleCursor(userId);
  const now = new Date();
  let scheduledAt = now;

  if (cursor) {
    const timeSinceCursor = now - cursor;
    const requiredGapMs = intervalSeconds * 1000;

    if (timeSinceCursor < requiredGapMs) {
      scheduledAt = new Date(cursor.getTime() + requiredGapMs);
      console.log(
        `[EMAIL_QUEUE] Cursor ${Math.round(timeSinceCursor / 1000)}s önce. Yeni mail ${scheduledAt.toLocaleString("tr-TR")} zamanına planlandı (${formatIntervalLabel(intervalSeconds)} random [${formatIntervalLabel(minSeconds)}-${formatIntervalLabel(maxSeconds)}]).`
      );
    } else {
      console.log(
        `[EMAIL_QUEUE] Cursor yeterince eski, hemen gönderilecek (random: ${formatIntervalLabel(intervalSeconds)}).`
      );
    }
  } else {
    console.log(`[EMAIL_QUEUE] İlk mail, hemen gönderilecek.`);
  }

  const queueItem = new EmailQueue({
    userId,
    status: "pending",
    scheduledAt,
    to: emailData.to,
    subject: emailData.subject,
    bodyText: emailData.text,
    bodyHtml: emailData.html,
    fromName: emailData.fromName,
    replyTo: emailData.replyTo,
    attachments: emailData.attachments,
    companyName: metadata.companyName,
    domain: metadata.domain,
    cvId: metadata.cvId,
    cvTitle: metadata.cvTitle,
    selectedCategories: metadata.selectedCategories,
    metadata: {
      ...metadata,
      appliedIntervalSeconds: intervalSeconds,
      appliedIntervalRangeSeconds: [minSeconds, maxSeconds],
    },
  });

  await queueItem.save();

  console.log(
    `[EMAIL_QUEUE] Mail kuyruğa eklendi: ${queueItem._id} | Alıcı: ${emailData.to?.join(", ")} | Planlanan: ${scheduledAt.toLocaleString("tr-TR")}`
  );

  return {
    queued: true,
    sent: false,
    queueId: String(queueItem._id),
    scheduledAt,
    estimatedSendTime: scheduledAt,
  };
}

/**
 * Kuyruktaki mail'leri işle.
 */
async function processEmailQueue() {
  const now = new Date();

  const pendingEmails = await EmailQueue.find({
    status: "pending",
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1, priority: -1 })
    .limit(10);

  if (pendingEmails.length === 0) {
    return { processed: 0 };
  }

  console.log(`[EMAIL_QUEUE_PROCESSOR] ${pendingEmails.length} mail işlenecek.`);

  let successCount = 0;
  let failCount = 0;
  let deferredCount = 0;

  for (const item of pendingEmails) {
    try {
      const { minSeconds, maxSeconds, intervalSeconds } = await getUserIntervalSeconds(
        item.userId
      );

      if (intervalSeconds > 0) {
        const lastSent = await EmailQueue.findOne({
          userId: item.userId,
          status: "sent",
        })
          .sort({ sentAt: -1 })
          .select("sentAt")
          .lean();

        if (lastSent?.sentAt) {
          const requiredGapMs = intervalSeconds * 1000;
          const elapsed = Date.now() - new Date(lastSent.sentAt).getTime();
          if (elapsed < requiredGapMs) {
            item.scheduledAt = new Date(
              new Date(lastSent.sentAt).getTime() + requiredGapMs
            );
            item.metadata = {
              ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
              deferredByLiveInterval: true,
              appliedIntervalSeconds: intervalSeconds,
              appliedIntervalRangeSeconds: [minSeconds, maxSeconds],
            };
            await item.save();
            deferredCount += 1;
            console.log(
              `[EMAIL_QUEUE_PROCESSOR] Mail ertelendi (güncel aralık ${formatIntervalLabel(intervalSeconds)}): ${item._id} → ${item.scheduledAt.toLocaleString("tr-TR")}`
            );
            continue;
          }
        }
      }

      item.status = "processing";
      item.processedAt = new Date();
      await item.save();

      await sendMail({
        to: item.to,
        subject: item.subject,
        text: item.bodyText,
        html: item.bodyHtml,
        fromName: item.fromName,
        replyTo: item.replyTo,
        attachments: item.attachments,
      });

      item.status = "sent";
      item.sentAt = new Date();
      await item.save();

      console.log(
        `[EMAIL_QUEUE_PROCESSOR] Mail gönderildi: ${item._id} | Alıcı: ${item.to?.join(", ")}`
      );
      successCount++;
    } catch (error) {
      console.error(`[EMAIL_QUEUE_PROCESSOR] Mail gönderimi hatası: ${item._id}`, error);

      item.retryCount += 1;
      item.lastError = error.message;

      if (item.retryCount >= item.maxRetries) {
        item.status = "failed";
        failCount++;
      } else {
        item.status = "pending";
        item.scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
      }

      await item.save();
    }
  }

  console.log(
    `[EMAIL_QUEUE_PROCESSOR] İşlem tamamlandı: ${successCount} başarılı, ${failCount} başarısız, ${deferredCount} ertelendi.`
  );

  return {
    processed: pendingEmails.length,
    success: successCount,
    failed: failCount,
    deferred: deferredCount,
  };
}

async function getUserPendingEmailCount(userId) {
  return await EmailQueue.countDocuments({
    userId,
    status: "pending",
  });
}

async function getUserLastEmailTime(userId) {
  const lastSent = await EmailQueue.findOne({
    userId,
    status: "sent",
  })
    .sort({ sentAt: -1 })
    .select("sentAt");

  return lastSent?.sentAt || null;
}

async function getUserNextAvailableTime(userId) {
  const { intervalSeconds } = await getUserIntervalSeconds(userId);

  if (intervalSeconds === 0) {
    return new Date();
  }

  const lastEmailTime = await getUserLastEmailTime(userId);
  if (!lastEmailTime) {
    return new Date();
  }

  return new Date(lastEmailTime.getTime() + intervalSeconds * 1000);
}

module.exports = {
  enqueueEmail,
  processEmailQueue,
  getUserPendingEmailCount,
  getUserLastEmailTime,
  getUserNextAvailableTime,
  rescheduleUserPendingEmails,
  getUserIntervalSeconds,
  getUserIntervalMinutes,
  resolveUserIntervalSeconds,
  MAX_INTERVAL_SECONDS,
};
