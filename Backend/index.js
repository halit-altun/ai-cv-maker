require("dotenv").config();
const dns = require("dns");
const http = require("http");
const mongoose = require("mongoose");
const app = require("./src/app");
const bootState = require("./src/boot-state");
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

function startBackgroundProcessors() {
  const EMAIL_QUEUE_INTERVAL_MS = 30_000;
  setInterval(async () => {
    try {
      await processEmailQueue();
    } catch (error) {
      console.error("[EMAIL_QUEUE_PROCESSOR] Hata:", error);
    }
  }, EMAIL_QUEUE_INTERVAL_MS);
  console.log(`Email queue processor başlatıldı (interval: ${EMAIL_QUEUE_INTERVAL_MS / 1000}s).`);

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
}

async function initDatabase() {
  if (!uri) {
    throw new Error("MONGODB_URI tanımlı değil (Northflank Environment).");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET tanımlı değil (Northflank Environment).");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log("MongoDB bağlantısı kuruldu.");
  console.log(`Veritabanı: ${mongoose.connection.name}`);
  await syncIndexes();
  startBackgroundProcessors();
  bootState.ready = true;
  bootState.error = null;
}

async function main() {
  // Önce portu aç — yoksa Envoy "Connection refused" verir; /health gerçek hatayı gösterir
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Sunucu 0.0.0.0:${port} adresinde dinliyor.`);
      resolve();
    });
  });

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
    } else {
      console.log(`[MAIL_TRACKING] Public base: ${base}`);
    }
  } catch {
    /* ignore */
  }

  try {
    await initDatabase();
  } catch (err) {
    bootState.ready = false;
    bootState.error = err.message || String(err);
    console.error("Başlatma hatası (process ayakta, /health hata döner):", bootState.error);
    console.error(
      "Kontrol: Environment MONGODB_URI + JWT_SECRET; Atlas Network Access 0.0.0.0/0"
    );
  }
}

main().catch((err) => {
  console.error("Kritik başlatma hatası:", err.message);
  process.exit(1);
});
