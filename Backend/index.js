require("dotenv").config();
const dns = require("dns");
const http = require("http");
const express = require("express");
const bootState = require("./src/boot-state");

// Windows/yerel DNS bazı ortamlarda mongodb+srv SRV kayıtlarını çözemez
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const port = Number(process.env.PORT) || 3001;

/**
 * Önce minimal sunucu aç — ağır require / Mongo bitmeden Envoy Connection refused olmasın.
 * Health check her zaman 200 dönmeli (liveness).
 */
const bootApp = express();
bootApp.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    ready: bootState.ready,
    error: bootState.error,
    booting: !bootState.fullApp,
    port,
  });
});
bootApp.get("/ready", (_req, res) => {
  res.status(bootState.ready ? 200 : 503).json({
    ok: bootState.ready,
    error: bootState.error,
  });
});
bootApp.use((_req, res) => {
  res.status(503).json({
    ok: false,
    error: bootState.error || "Backend henüz yükleniyor",
  });
});

/** @type {import("http").RequestListener} */
let activeApp = bootApp;

const server = http.createServer((req, res) => activeApp(req, res));

async function syncIndexes(models) {
  await Promise.all(models.map((m) => m.syncIndexes()));
  console.log("Model indexleri senkronize edildi.");
}

async function initAfterListen() {
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

  activeApp = app;
  bootState.fullApp = true;

  const uri = process.env.MONGODB_URI;
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

  await syncIndexes([
    User,
    Cv,
    RefreshToken,
    PasswordResetToken,
    EmailVerificationToken,
    EmailQueue,
    MailTracking,
    MailOpenEvent,
    TodoApplicationItem,
    TodoApplicationJob,
    TodoProjectSettings,
  ]);

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

  bootState.ready = true;
  bootState.error = null;

  try {
    const {
      getTrackingPublicBaseUrl,
      isLocalTrackingBase,
    } = require("./src/services/mail-tracking.service");
    const base = getTrackingPublicBaseUrl();
    if (isLocalTrackingBase(base)) {
      console.warn(
        "[MAIL_TRACKING] TRACKING_PUBLIC_BASE_URL tanımlı değil (localhost)."
      );
    } else {
      console.log(`[MAIL_TRACKING] Public base: ${base}`);
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  console.log(
    `[BOOT] PORT=${port} (env PORT=${process.env.PORT || "unset"}) NODE_ENV=${process.env.NODE_ENV || "unset"}`
  );

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Sunucu 0.0.0.0:${port} adresinde dinliyor.`);
      resolve();
    });
  });

  try {
    await initAfterListen();
  } catch (err) {
    bootState.ready = false;
    bootState.error = err.message || String(err);
    console.error("Başlatma hatası (process ayakta):", bootState.error);
    console.error(
      "Kontrol: Environment MONGODB_URI + JWT_SECRET; Atlas Network Access 0.0.0.0/0"
    );
  }
}

main().catch((err) => {
  console.error("Kritik başlatma hatası:", err.message);
  process.exit(1);
});
