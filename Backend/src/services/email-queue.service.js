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

/**
 * Mail'i kuyruğa ekle
 */
async function enqueueEmail(userId, emailData, metadata = {}) {
  // Kullanıcının gmailSendInterval ayarlarını al
  const user = await User.findById(userId).select("gmailSendIntervalMinMinutes gmailSendIntervalMaxMinutes");
  const minMinutes = user?.gmailSendIntervalMinMinutes || 0;
  const maxMinutes = user?.gmailSendIntervalMaxMinutes || 0;
  const intervalMinutes = getRandomInterval(minMinutes, maxMinutes);

  // Eğer interval 0 ise (sınırsız), hemen gönder
  if (intervalMinutes === 0) {
    console.log(`[EMAIL_QUEUE] Interval 0, direkt gönderiliyor: ${emailData.to?.join(", ")}`);
    try {
      const result = await sendMail({
        ...emailData,
        html: emailData.html || emailData.bodyHtml, // HTML varsa kullan
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

  // Kullanıcının son gönderdiği mail'in zamanını bul
  const lastSent = await EmailQueue.findOne({
    userId,
    status: "sent",
  })
    .sort({ sentAt: -1 })
    .select("sentAt");

  const now = new Date();
  let scheduledAt = now;

  if (lastSent?.sentAt) {
    const timeSinceLastEmail = now - new Date(lastSent.sentAt);
    const requiredGapMs = intervalMinutes * 60 * 1000;

    if (timeSinceLastEmail < requiredGapMs) {
      // Henüz yeterli süre geçmemiş, scheduledAt'i ayarla
      scheduledAt = new Date(new Date(lastSent.sentAt).getTime() + requiredGapMs);
      console.log(
        `[EMAIL_QUEUE] Son mail ${Math.round(timeSinceLastEmail / 1000)}s önce gönderildi. Yeni mail ${new Date(scheduledAt).toLocaleString('tr-TR')} zamanına planlandı (${intervalMinutes} dk random interval [${minMinutes}-${maxMinutes}]).`
      );
    } else {
      console.log(
        `[EMAIL_QUEUE] Son mail ${Math.round(timeSinceLastEmail / 1000)}s önce gönderildi. Yeterli süre geçti, hemen gönderilecek (random: ${intervalMinutes} dk).`
      );
    }
  } else {
    console.log(`[EMAIL_QUEUE] İlk mail, hemen gönderilecek.`);
  }

  // Kuyruğa ekle
  const queueItem = new EmailQueue({
    userId,
    status: "pending",
    scheduledAt,
    to: emailData.to,
    subject: emailData.subject,
    bodyText: emailData.text,
    bodyHtml: emailData.html, // HTML with tracking pixel
    fromName: emailData.fromName,
    replyTo: emailData.replyTo,
    attachments: emailData.attachments,
    companyName: metadata.companyName,
    domain: metadata.domain,
    cvId: metadata.cvId,
    cvTitle: metadata.cvTitle,
    selectedCategories: metadata.selectedCategories,
    metadata,
  });

  await queueItem.save();

  console.log(
    `[EMAIL_QUEUE] Mail kuyruğa eklendi: ${queueItem._id} | Alıcı: ${emailData.to?.join(", ")} | Planlanan: ${scheduledAt.toLocaleString('tr-TR')}`
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
 * Kuyruktaki mail'leri işle (CRON job veya interval ile çağrılır)
 */
async function processEmailQueue() {
  const now = new Date();

  // Gönderilmeyi bekleyen mail'leri al (scheduledAt geçmiş olanlar)
  const pendingEmails = await EmailQueue.find({
    status: "pending",
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1, priority: -1 }) // Eski önce, yüksek öncelik önce
    .limit(10); // Aynı anda max 10 mail işle

  if (pendingEmails.length === 0) {
    return { processed: 0 };
  }

  console.log(`[EMAIL_QUEUE_PROCESSOR] ${pendingEmails.length} mail işlenecek.`);

  let successCount = 0;
  let failCount = 0;

  for (const item of pendingEmails) {
    try {
      // Status'u processing yap
      item.status = "processing";
      item.processedAt = new Date();
      await item.save();

      // Mail gönder
      const result = await sendMail({
        to: item.to,
        subject: item.subject,
        text: item.bodyText,
        html: item.bodyHtml, // HTML with tracking pixel
        fromName: item.fromName,
        replyTo: item.replyTo,
        attachments: item.attachments,
      });

      // Başarılı
      item.status = "sent";
      item.sentAt = new Date();
      await item.save();

      console.log(`[EMAIL_QUEUE_PROCESSOR] Mail gönderildi: ${item._id} | Alıcı: ${item.to?.join(", ")}`);
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
        // 5 dakika sonra tekrar dene
        item.scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
      }

      await item.save();
    }
  }

  console.log(
    `[EMAIL_QUEUE_PROCESSOR] İşlem tamamlandı: ${successCount} başarılı, ${failCount} başarısız.`
  );

  return {
    processed: pendingEmails.length,
    success: successCount,
    failed: failCount,
  };
}

/**
 * Kullanıcının kuyrukta bekleyen mail sayısını al
 */
async function getUserPendingEmailCount(userId) {
  return await EmailQueue.countDocuments({
    userId,
    status: "pending",
  });
}

/**
 * Kullanıcının son gönderdiği mail'in zamanını al
 */
async function getUserLastEmailTime(userId) {
  const lastSent = await EmailQueue.findOne({
    userId,
    status: "sent",
  })
    .sort({ sentAt: -1 })
    .select("sentAt");

  return lastSent?.sentAt || null;
}

/**
 * Kullanıcının bir sonraki mail gönderebileceği zamanı hesapla
 */
async function getUserNextAvailableTime(userId) {
  const user = await User.findById(userId).select("gmailSendIntervalMinMinutes gmailSendIntervalMaxMinutes");
  const minMinutes = user?.gmailSendIntervalMinMinutes || 0;
  const maxMinutes = user?.gmailSendIntervalMaxMinutes || 0;
  const intervalMinutes = getRandomInterval(minMinutes, maxMinutes);

  if (intervalMinutes === 0) {
    return new Date(); // Hemen gönderebilir
  }

  const lastEmailTime = await getUserLastEmailTime(userId);
  if (!lastEmailTime) {
    return new Date(); // İlk mail, hemen gönderebilir
  }

  const nextAvailable = new Date(lastEmailTime.getTime() + intervalMinutes * 60 * 1000);
  return nextAvailable;
}

module.exports = {
  enqueueEmail,
  processEmailQueue,
  getUserPendingEmailCount,
  getUserLastEmailTime,
  getUserNextAvailableTime,
};
