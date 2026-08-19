const EmailQueue = require("../models/email-queue.model");
const User = require("../models/user.model");
const { sendMail } = require("./email.service");
const { serializeAttachmentsForQueue } = require("../utils/email-attachment.utils");
const {
  isPersistOutreachHistoryEnabled,
} = require("../utils/persist-outreach-history");

const MAX_INTERVAL_SECONDS = 86400; // 24 saat

/** Aynı process içinde örtüşen setInterval turlarını engelle */
let queueProcessingLock = false;

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
  const [lastSent, lastPending, lastProcessing] = await Promise.all([
    EmailQueue.findOne({ userId, status: "sent" })
      .sort({ sentAt: -1 })
      .select("sentAt")
      .lean(),
    EmailQueue.findOne({ userId, status: "pending" })
      .sort({ scheduledAt: -1 })
      .select("scheduledAt")
      .lean(),
    EmailQueue.findOne({ userId, status: "processing" })
      .sort({ scheduledAt: -1 })
      .select("scheduledAt processedAt")
      .lean(),
  ]);

  const times = [
    lastSent?.sentAt,
    lastPending?.scheduledAt,
    lastProcessing?.scheduledAt,
    lastProcessing?.processedAt,
  ]
    .filter(Boolean)
    .map((d) => new Date(d).getTime());

  if (!times.length) return null;
  return new Date(Math.max(...times));
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

function resolveItemGapMs(item, minSeconds, maxSeconds) {
  if (minSeconds === 0 && maxSeconds === 0) return 0;
  const stored = Number(item?.metadata?.appliedIntervalSeconds);
  if (Number.isFinite(stored) && stored >= 0) return stored * 1000;
  return getRandomIntervalSeconds(minSeconds, maxSeconds) * 1000;
}

/**
 * Sıradan mail silinince kalan pending'leri öne çek.
 * Silinenin önündekilerin saati aynı kalır; sonrakiler tek aralıkla yeniden dizilir
 * (2 → 4 atlar, 3'ün boş slotu beklenmez).
 */
async function compactPendingAfterRemovedSlots(userId, removedDocs = []) {
  if (!userId) return { rescheduled: 0 };
  const removed = (Array.isArray(removedDocs) ? removedDocs : [removedDocs]).filter(
    (d) => d && String(d.status) === "pending" && d.scheduledAt
  );
  if (!removed.length) return { rescheduled: 0 };

  const holeStart = Math.min(
    ...removed.map((d) => new Date(d.scheduledAt).getTime())
  );
  if (!Number.isFinite(holeStart)) return { rescheduled: 0 };

  const { minSeconds, maxSeconds } = await getUserIntervalSeconds(userId);
  const pending = await EmailQueue.find({ userId, status: "pending" }).sort({
    scheduledAt: 1,
    createdAt: 1,
  });
  if (!pending.length) return { rescheduled: 0 };

  const shifted = pending.filter(
    (item) => new Date(item.scheduledAt).getTime() >= holeStart
  );
  const kept = pending.filter(
    (item) => new Date(item.scheduledAt).getTime() < holeStart
  );
  if (!shifted.length) return { rescheduled: 0 };

  const [lastSent, lastProcessing] = await Promise.all([
    EmailQueue.findOne({ userId, status: "sent" })
      .sort({ sentAt: -1 })
      .select("sentAt")
      .lean(),
    EmailQueue.findOne({ userId, status: "processing" })
      .sort({ processedAt: -1, scheduledAt: -1 })
      .select("processedAt scheduledAt")
      .lean(),
  ]);

  const now = new Date();
  const processingTime = lastProcessing
    ? new Date(lastProcessing.processedAt || lastProcessing.scheduledAt)
    : null;

  let cursor = kept.length
    ? new Date(kept[kept.length - 1].scheduledAt)
    : lastSent?.sentAt
      ? new Date(lastSent.sentAt)
      : processingTime;

  if (processingTime && (!cursor || processingTime > cursor)) {
    cursor = processingTime;
  }

  let count = 0;
  for (const item of shifted) {
    const gapMs = resolveItemGapMs(item, minSeconds, maxSeconds);
    let next;
    if (!cursor) {
      next = now;
    } else {
      next = new Date(cursor.getTime() + gapMs);
      if (next < now) next = now;
    }
    item.scheduledAt = next;
    item.metadata = {
      ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
      compactedAt: now.toISOString(),
      appliedIntervalSeconds: Math.round(gapMs / 1000),
      appliedIntervalRangeSeconds: [minSeconds, maxSeconds],
    };
    await item.save();
    cursor = next;
    count += 1;
  }

  console.log(
    `[EMAIL_QUEUE] İptal sonrası ${count} pending mail yeniden planlandı (boşluk kapatıldı).`
  );
  return { rescheduled: count, minSeconds, maxSeconds };
}

/**
 * Mail'i kuyruğa ekle — her seferinde güncel profil aralığını okur.
 */
async function enqueueEmail(userId, emailData, metadata = {}) {
  const persistHistory =
    metadata.persistHistory !== undefined
      ? Boolean(metadata.persistHistory)
      : await isPersistOutreachHistoryEnabled(userId);
  const { minSeconds, maxSeconds, intervalSeconds } = await getUserIntervalSeconds(userId);

  /**
   * Aralıklı kuyruk pipeline'ı (Todo job / company-based kuyruk): profil aralığı 0 olsa bile
   * kuyruk dokümanı yazılır — aksi halde mail "Mail Takip → Aralıklı gönderim" listesinde
   * hiç görünmeden anında gider ve kullanıcı gönderimi izleyemez.
   */
  const forceQueue = Boolean(metadata.forceQueue) && persistHistory;
  const skipQueueReason = !persistHistory
    ? "history_off"
    : intervalSeconds === 0 && !forceQueue
      ? "interval_zero"
      : null;

  if (skipQueueReason) {
    console.log(
      `[EMAIL_QUEUE] ${skipQueueReason === "history_off" ? "Kayıt kapalı," : "Interval 0,"} direkt gönderiliyor: ${emailData.to?.join(", ")}`
    );
    try {
      const result = await sendMail({
        ...emailData,
        html: emailData.html || emailData.bodyHtml,
        attachments: emailData.attachments,
      });
      return {
        queued: false,
        sent: true,
        immediate: true,
        persisted: persistHistory,
        skipQueueReason,
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

  // Kritik: nodemailer Buffer (`content`) Mongoose şemasında yok → contentBase64 olarak sakla
  let queueAttachments = [];
  try {
    queueAttachments = serializeAttachmentsForQueue(emailData.attachments);
  } catch (attErr) {
    console.error("[EMAIL_QUEUE] Ek serileştirme hatası:", attErr.message);
    throw attErr;
  }

  if (Array.isArray(emailData.attachments) && emailData.attachments.length && !queueAttachments.length) {
    throw new Error("CV eki kuyruğa yazılamadı (boş/geçersiz PDF).");
  }

  if (queueAttachments.length) {
    console.log(
      `[EMAIL_QUEUE] Ek(ler) kaydedildi: ${queueAttachments
        .map((a) => `${a.filename} (~${Math.round((a.contentBase64?.length || 0) * 0.75)} bytes)`)
        .join(", ")}`
    );
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
    attachments: queueAttachments,
    companyName: metadata.companyName,
    domain: metadata.domain,
    cvId: metadata.cvId,
    cvTitle: metadata.cvTitle,
    selectedCategories: metadata.selectedCategories,
    metadata: {
      ...metadata,
      appliedIntervalSeconds: intervalSeconds,
      appliedIntervalRangeSeconds: [minSeconds, maxSeconds],
      attachmentCount: queueAttachments.length,
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

async function attachOutreachLogToQueuedEmails(queueIds, outreachLogId) {
  const ids = (Array.isArray(queueIds) ? queueIds : []).filter(Boolean);
  if (!ids.length || !outreachLogId) return { updated: 0 };
  const result = await EmailQueue.updateMany(
    { _id: { $in: ids } },
    { $set: { "metadata.pendingTracking.outreachLogId": outreachLogId } }
  );
  return { updated: result.modifiedCount || 0 };
}

/**
 * Kuyruktaki mail'leri işle.
 * Atomik claim: aynı pending kayıt iki worker/interval turunda iki kez gönderilmesin.
 */
async function processEmailQueue() {
  if (queueProcessingLock) {
    return { processed: 0, skipped: true, reason: "busy" };
  }
  queueProcessingLock = true;

  const now = new Date();
  let successCount = 0;
  let failCount = 0;
  let deferredCount = 0;
  let claimedCount = 0;

  try {
    // Crash sonrası stuck "processing" kayıtlarını geri al (15 dk)
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const stale = await EmailQueue.updateMany(
      {
        status: "processing",
        processedAt: { $lte: staleBefore },
      },
      {
        $set: {
          status: "pending",
          scheduledAt: now,
        },
        $unset: { processedAt: 1 },
      }
    );
    if (stale.modifiedCount > 0) {
      console.log(
        `[EMAIL_QUEUE_PROCESSOR] ${stale.modifiedCount} stuck processing → pending`
      );
    }

    for (let i = 0; i < 10; i += 1) {
      // Atomic claim — find + update yarışını kapatır (çoklu instance / örtüşen interval)
      const item = await EmailQueue.findOneAndUpdate(
        {
          status: "pending",
          scheduledAt: { $lte: now },
        },
        {
          $set: {
            status: "processing",
            processedAt: new Date(),
          },
        },
        {
          sort: { scheduledAt: 1, priority: -1 },
          new: true,
        }
      );

      if (!item) break;
      claimedCount += 1;

      try {
        const { minSeconds, maxSeconds, intervalSeconds } = await getUserIntervalSeconds(
          item.userId
        );

        if (intervalSeconds > 0) {
          const lastSent = await EmailQueue.findOne({
            userId: item.userId,
            status: "sent",
            _id: { $ne: item._id },
          })
            .sort({ sentAt: -1 })
            .select("sentAt")
            .lean();

          if (lastSent?.sentAt) {
            const requiredGapMs = intervalSeconds * 1000;
            const elapsed = Date.now() - new Date(lastSent.sentAt).getTime();
            if (elapsed < requiredGapMs) {
              item.status = "pending";
              item.scheduledAt = new Date(
                new Date(lastSent.sentAt).getTime() + requiredGapMs
              );
              item.processedAt = undefined;
              item.metadata = {
                ...(item.metadata && typeof item.metadata === "object"
                  ? item.metadata
                  : {}),
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

        const expectedAtt =
          Number(item.metadata?.attachmentCount) ||
          (Array.isArray(item.attachments) ? item.attachments.length : 0);
        const hasUsableAtt =
          Array.isArray(item.attachments) &&
          item.attachments.some(
            (a) => a && String(a.contentBase64 || "").trim().length > 100
          );

        if (expectedAtt > 0 && !hasUsableAtt) {
          throw new Error(
            "Kuyruktaki CV eki boş/bozuk (eski kayıt). Bu mail yeniden gönderilmeli — yeni gönderimlerde ek düzgün saklanır."
          );
        }

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

        try {
          const { finalizeQueuedMailTracking } = require("./mail-tracking.service");
          await finalizeQueuedMailTracking(item);
        } catch (trackErr) {
          console.error(
            `[EMAIL_QUEUE_PROCESSOR] Mail takip kaydı yazılamadı: ${item._id}`,
            trackErr
          );
        }

        const attInfo = Array.isArray(item.attachments)
          ? item.attachments
              .map((a) => {
                const approx = a?.contentBase64
                  ? Math.round(String(a.contentBase64).length * 0.75)
                  : 0;
                return `${a?.filename || "?"} (${approx}b)`;
              })
              .join(", ")
          : "yok";
        console.log(
          `[EMAIL_QUEUE_PROCESSOR] Mail gönderildi: ${item._id} | Alıcı: ${item.to?.join(", ")} | Ek: ${attInfo}`
        );
        successCount += 1;
      } catch (error) {
        console.error(
          `[EMAIL_QUEUE_PROCESSOR] Mail gönderimi hatası: ${item._id}`,
          error
        );

        item.retryCount = Number(item.retryCount || 0) + 1;
        item.lastError = error instanceof Error ? error.message : String(error);

        if (item.retryCount >= (item.maxRetries || 3)) {
          item.status = "failed";
          failCount += 1;
        } else {
          item.status = "pending";
          item.scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
        }

        await item.save();
      }
    }

    if (claimedCount > 0) {
      console.log(
        `[EMAIL_QUEUE_PROCESSOR] İşlem tamamlandı: ${successCount} başarılı, ${failCount} başarısız, ${deferredCount} ertelendi (claim=${claimedCount}).`
      );
    }

    return {
      processed: claimedCount,
      success: successCount,
      failed: failCount,
      deferred: deferredCount,
    };
  } finally {
    queueProcessingLock = false;
  }
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
  attachOutreachLogToQueuedEmails,
  getUserPendingEmailCount,
  getUserLastEmailTime,
  getUserNextAvailableTime,
  rescheduleUserPendingEmails,
  compactPendingAfterRemovedSlots,
  getUserIntervalSeconds,
  getUserIntervalMinutes,
  resolveUserIntervalSeconds,
  MAX_INTERVAL_SECONDS,
};
