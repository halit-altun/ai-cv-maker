const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const cvRoutes = require("./routes/cv.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const outreachRoutes = require("./routes/outreach.routes");
const outreachProjectRoutes = require("./routes/outreach-project.routes");
const todoApplicationRoutes = require("./routes/todo-application.routes");
const aiRoutes = require("./routes/ai.routes");
const trackingRoutes = require("./routes/tracking.routes");
const mailTrackingRoutes = require("./routes/mail-tracking.routes");
const { attachClientId } = require("./middlewares/client-id.middleware");
const { isAppError } = require("./utils/app-error");
const { isDatabaseUnavailableError } = require("./utils/db-error");

const app = express();

/** Always allowed (local + Netlify). FRONTEND_URL can add more, comma-separated. */
const BUILTIN_FRONTEND_ORIGINS = [
  "http://localhost:3010",
  "https://cv-ai-maker.netlify.app",
];

const envFrontendOrigins = String(process.env.FRONTEND_URL || "")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

const frontendOrigins = [
  ...new Set([...envFrontendOrigins, ...BUILTIN_FRONTEND_ORIGINS]),
];

console.log("[CORS] Allowed origins:", frontendOrigins.join(", "));

app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/$/, "");
      if (frontendOrigins.includes(normalized)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    exposedHeaders: ["X-Client-Id"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Client-Id",
      "client_id",
      "client-id",
    ],
  })
);
app.set("trust proxy", 1);
app.use(attachClientId);

app.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    ok: true,
    db: states[dbState] ?? "unknown",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/cvs", cvRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/outreach", outreachRoutes);
app.use("/api/outreach-projects", outreachProjectRoutes);
app.use("/api/todo-applications", todoApplicationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/track", trackingRoutes); // Tracking pixel (no auth required)
app.use("/api/mail-tracking", mailTrackingRoutes); // Mail tracking API (auth required)

app.use((err, _req, res, _next) => {
  console.error(err);

  if (isAppError(err)) {
    const body = {
      ok: false,
      message: err.message,
      code: err.code,
    };
    if (err.details != null) {
      body.details = err.details;
    }
    return res.status(err.statusCode || 500).json(body);
  }

  if (isDatabaseUnavailableError(err)) {
    return res.status(503).json({
      ok: false,
      message:
        "Veritabanına şu anda ulaşılamıyor. İnternet/DB bağlantısını kontrol edip tekrar deneyin.",
      code: "DATABASE_UNAVAILABLE",
    });
  }

  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((item) => item.message);
    return res.status(400).json({
      ok: false,
      message: "Doğrulama hatası",
      details,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      ok: false,
      message: "Bu kayıt zaten mevcut (duplicate key).",
      code: "DUPLICATE_KEY",
    });
  }

  return res.status(500).json({ ok: false, message: "Sunucu hatası" });
});

module.exports = app;
