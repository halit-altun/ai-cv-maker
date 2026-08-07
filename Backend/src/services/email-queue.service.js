const EmailQueue = require("../models/email-queue.model");
const User = require("../models/user.model");
const { sendMail } = require("./email.service");

/**
 * Random interval hesapla (min-max arası)
 */
function getRandomInterval(minMinutes, maxMinutes) {
  if (minMinutes === 0 && maxMinutes === 0) return 0;
  if (minMinutes === maxMinutes) return minMinutes;
  const min = Math.min(minMinutes, maxMinutes);
  const max = Math.max(minMinutes, maxMinutes);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getUserIntervalMinutes(userId) {
  const user = await User.findById(userId).select(
    "gmailSendIntervalMinMinutes gmailSendIntervalMaxMinutes"
  );
  const minMinutes = Number(user?.gmailSendIntervalMinMinutes) || 0;
  const maxMinutes = Number(user?.gmailSendIntervalMaxMinutes) || 0;
  return {
    minMinutes,
    maxMinutes,
    intervalMinutes: getRandomInterval(minMinutes, maxMinutes),
  };
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

/**
 * Profil istek aralığı değişince bekleyen mailleri yeni değere göre yeniden diz.
 * İşlenmekte olan (processing) mail etkilenmez; sıradaki pending'ler yeni aralıkla planlanır.
 */
async function rescheduleUserPendingEmails(userId) {
  if (!userId) return { rescheduled: 0 };

  const { minMinutes, maxMinutes } = await getUserIntervalMinutes(userId);
  const pending = await EmailQueue.find({ userId, status: "pending" }).sort({
    scheduledAt: 1,
    createdAt: 1,
  });

  if (!pending.length) {
    return { rescheduled: 0, minMinutes, maxMinutes };
  }

  const lastSent = await EmailQueue.findOne({ userId, status: "sent" })
    .sort({ sentAt: -1 })
    .select("sentAt")
    .lean();

  const now = new Date();
  let cursor = lastSent?.sentAt ? new Date(lastSent.sentAt) : null;

  for (const item of pending) {
    if (minMinutes === 0 && maxMinutes === 0) {
      item.scheduledAt = now;
      await item.save();
      cursor = now;
      continue;
    }

    const gapMinutes = getRandomInterval(minMinutes, maxMinutes);
    const gapMs = Math.max(0, gapMinutes) * 60 * 1000;
    let next = cursor ? new Date(cursor.getTime() + gapMs) : now;
    if (next < now) next = now;
    item.scheduledAt = next;
    item.metadata = {
      ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
      rescheduledAt: now.toISOString(),
      appliedIntervalMinutes: gapMinutes,
      appliedIntervalRange: [minMinutes, maxMinutes],
    };
    await item.save();
    cursor = next;
  }

  console.log(
    `[EMAIL_QUEUE] Kullanıcı ${userId} için ${pending.length} pending mail yeniden planlandı (aralık ${minMinutes}-${maxMinutes} dk).`
  );

  return {
    rescheduled: pending.length,
    minMinutes,
    maxMinutes,
  };
}

/**
 * Mail'i kuyruğa ekle — her seferinde güncel profil aralığını okur.
 */
async function enqueueEmail(userId, emailData, metadata = {}) {
  const { minMinutes, maxMinutes, intervalMinutes } = await getUserIntervalMinutes(userId);

  if (intervalMinutes === 0) {
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
    const requiredGapMs = intervalMinutes * 60 * 1000;

    if (timeSinceCursor < requiredGapMs) {
      scheduledAt = new Date(cursor.getTime() + requiredGapMs);
      console.log(
        `[EMAIL_QUEUE] Cursor ${Math.round(timeSinceCursor / 1000)}s önce. Yeni mail ${scheduledAt.toLocaleString("tr-TR")} zamanına planlandı (${intervalMinutes} dk random [${minMinutes}-${maxMinutes}]).`
      );
    } else {
      console.log(
        `[EMAIL_QUEUE] Cursor yeterince eski, hemen gönderilecek (random: ${intervalMinutes} dk).`
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
      appliedIntervalMinutes: intervalMinutes,
      appliedIntervalRange: [minMinutes, maxMinutes],
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
 * Gönderim öncesi güncel profil aralığına göre gerekirse erteler.
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
      const { minMinutes, maxMinutes, intervalMinutes } = await getUserIntervalMinutes(
        item.userId
      );

      if (intervalMinutes > 0) {
        const lastSent = await EmailQueue.findOne({
          userId: item.userId,
          status: "sent",
        })
          .sort({ sentAt: -1 })
          .select("sentAt")
          .lean();

        if (lastSent?.sentAt) {
          const requiredGapMs = intervalMinutes * 60 * 1000;
          const elapsed = Date.now() - new Date(lastSent.sentAt).getTime();
          if (elapsed < requiredGapMs) {
            item.scheduledAt = new Date(
              new Date(lastSent.sentAt).getTime() + requiredGapMs
            );
            item.metadata = {
              ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
              deferredByLiveInterval: true,
              appliedIntervalMinutes: intervalMinutes,
              appliedIntervalRange: [minMinutes, maxMinutes],
            };
            await item.save();
            deferredCount += 1;
            console.log(
              `[EMAIL_QUEUE_PROCESSOR] Mail ertelendi (güncel aralık ${intervalMinutes} dk): ${item._id} → ${item.scheduledAt.toLocaleString("tr-TR")}`
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
  const { intervalMinutes } = await getUserIntervalMinutes(userId);

  if (intervalMinutes === 0) {
    return new Date();
  }

  const lastEmailTime = await getUserLastEmailTime(userId);
  if (!lastEmailTime) {
    return new Date();
  }

  return new Date(lastEmailTime.getTime() + intervalMinutes * 60 * 1000);
}

module.exports = {
  enqueueEmail,
  processEmailQueue,
  getUserPendingEmailCount,
  getUserLastEmailTime,
  getUserNextAvailableTime,
  rescheduleUserPendingEmails,
  getUserIntervalMinutes,
};
