require("dotenv").config();
const dns = require("dns");
const http = require("http");
const mongoose = require("mongoose");
const app = require("./src/app");
const User = require("./src/models/user.model");
const Cv = require("./src/models/cv.model");
const RefreshToken = require("./src/models/refresh-token.model");
const PasswordResetToken = require("./src/models/password-reset-token.model");
const EmailVerificationToken = require("./src/models/email-verification-token.model");
const EmailQueue = require("./src/models/email-queue.model");
const MailTracking = require("./src/models/mail-tracking.model");
const MailOpenEvent = require("./src/models/mail-open-event.model");
const TodoApplicationItem = require("./src/models/todo-application-item.model");
const TodoApplicationJob = require("./src/models/todo-application-job.model");
const TodoProjectSettings = require("./src/models/todo-project-settings.model");
const { processEmailQueue } = require("./src/services/email-queue.service");
const { processTodoApplicationJobs } = require("./src/services/todo-application.service");

// Windows/yerel DNS bazı ortamlarda mongodb+srv SRV kayıtlarını çözemez
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const port = Number(process.env.PORT) || 3001;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI .env dosyasında tanımlı değil.");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET .env dosyasında tanımlı değil.");
  process.exit(1);
}

async function syncIndexes() {
  await Promise.all([
    User.syncIndexes(),
    Cv.syncIndexes(),
    RefreshToken.syncIndexes(),
    PasswordResetToken.syncIndexes(),
    EmailVerificationToken.syncIndexes(),
    EmailQueue.syncIndexes(),
    MailTracking.syncIndexes(),
    MailOpenEvent.syncIndexes(),
    TodoApplicationItem.syncIndexes(),
    TodoApplicationJob.syncIndexes(),
    TodoProjectSettings.syncIndexes(),
  ]);
  console.log("Model indexleri senkronize edildi.");
}

async function main() {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log("MongoDB bağlantısı kuruldu.");
  console.log(`Veritabanı: ${mongoose.connection.name}`);
  await syncIndexes();

  // Email queue processor'ı başlat (her 30 saniyede bir çalışır)
  const EMAIL_QUEUE_INTERVAL_MS = 30_000; // 30 saniye
  setInterval(async () => {
    try {
      await processEmailQueue();
    } catch (error) {
      console.error("[EMAIL_QUEUE_PROCESSOR] Hata:", error);
    }
  }, EMAIL_QUEUE_INTERVAL_MS);
  console.log(`Email queue processor başlatıldı (interval: ${EMAIL_QUEUE_INTERVAL_MS / 1000}s).`);

  // To Do / Toplu başvuru job processor (sayfa kapansa da devam eder)
  const TODO_JOB_INTERVAL_MS = 20_000;
  setInterval(async () => {
    try {
      await processTodoApplicationJobs();
    } catch (error) {
      console.error("[TODO_APPLICATION_PROCESSOR] Hata:", error);
    }
  }, TODO_JOB_INTERVAL_MS);
  console.log(
    `To Do application processor başlatıldı (interval: ${TODO_JOB_INTERVAL_MS / 1000}s).`
  );

  const server = http.createServer(app);
  // Container/Northflank: tüm arayüzlerde dinle (localhost-only Connection refused önler)
  server.listen(port, "0.0.0.0", () => {
    console.log(`Sunucu 0.0.0.0:${port} adresinde dinliyor.`);
    try {
      const {
        getTrackingPublicBaseUrl,
        isLocalTrackingBase,
      } = require("./src/services/mail-tracking.service");
      const base = getTrackingPublicBaseUrl();
      if (isLocalTrackingBase(base)) {
        console.warn(
          "[MAIL_TRACKING] TRACKING_PUBLIC_BASE_URL tanımlı değil (localhost). Gmail açılışları kayda GEÇMEZ."
        );
        console.warn(
          "[MAIL_TRACKING] Çözüm: ngrok http " +
            port +
            "  →  .env'e TRACKING_PUBLIC_BASE_URL=https://xxxx.ngrok-free.app"
        );
      } else {
        console.log(`[MAIL_TRACKING] Public base: ${base}`);
      }
    } catch {
      /* ignore */
    }
  });
}

main().catch((err) => {
  console.error("Başlatma hatası:", err.message);
  process.exit(1);
});
