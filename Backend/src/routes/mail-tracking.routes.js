const express = require("express");
const {
  getUserMailTrackings,
  getMailTrackingStatsSummary,
  getMailTrackingDetails,
  getMailTrackingCvPdf,
  getMailTrackingColdMails,
  getMailTrackingLinkedInMessages,
  getMailTrackingReanalyzeContext,
  setDeliveryOutcome,
} = require("../services/mail-tracking.service");
const MailTracking = require("../models/mail-tracking.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

/**
 * Mail tracking istatistikleri
 * GET /api/mail-tracking/stats/summary
 * Query: projectId, status, company, recipient, date, startDate, endDate (liste ile aynı filtreler)
 */
router.get("/stats/summary", async (req, res, next) => {
  try {
    const { projectId, status, company, recipient, date, startDate, endDate } = req.query;

    const stats = await getMailTrackingStatsSummary(req.user.id, {
      projectId: projectId || undefined,
      status: status || undefined,
      company: company || undefined,
      recipient: recipient || undefined,
      date: date || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return res.json({
      ok: true,
      stats,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Kullanıcının mail tracking listesi
 * GET /api/mail-tracking
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      limit = 50,
      skip = 0,
      status,
      projectId,
      company,
      recipient,
      date,
      startDate,
      endDate,
    } = req.query;

    const result = await getUserMailTrackings(req.user.id, {
      limit: Number(limit) || 50,
      skip: Number(skip) || 0,
      status: status || undefined,
      projectId: projectId || undefined,
      company: company || undefined,
      recipient: recipient || undefined,
      date: date || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return res.json({
      ok: true,
      trackings: result.trackings,
      total: result.total,
      companyCount: result.companyCount,
      limit: result.limit,
      skip: result.skip,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Outcome bildirimi: inbox | spam | unknown
 * PATCH /api/mail-tracking/:mailId/outcome
 */
router.patch("/:mailId/outcome", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const { outcome } = req.body || {};
    const result = await setDeliveryOutcome(mailId, req.user.id, outcome);
    if (!result.ok) {
      return res.status(404).json({ ok: false, message: result.error });
    }
    return res.json({ ok: true, tracking: result.tracking });
  } catch (error) {
    return next(error);
  }
});

/**
 * Manuel / test okundu (pixel localhost iken UI testi için)
 * POST /api/mail-tracking/:mailId/simulate-open
 */
router.post("/:mailId/simulate-open", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const { recordMailOpen, generateTrackingPixelUrl, isLocalTrackingBase, getTrackingPublicBaseUrl } =
      require("../services/mail-tracking.service");

    // Sadece kendi kaydı
    const owned = await MailTracking.findOne({ mailId, userId: req.user.id }).lean();
    if (!owned) {
      return res.status(404).json({ ok: false, message: "Mail tracking bulunamadı." });
    }

    const result = await recordMailOpen(mailId, {
      ip: "simulate",
      userAgent: "manual-simulate-open",
      referer: "mail-tracking-ui",
    });

    const pixelUrl = generateTrackingPixelUrl(mailId);
    return res.json({
      ok: true,
      tracking: result.tracking,
      pixelUrl,
      trackingBaseIsLocal: isLocalTrackingBase(getTrackingPublicBaseUrl()),
      hint: isLocalTrackingBase(getTrackingPublicBaseUrl())
        ? "Pixel URL localhost — Gmail açılışları kayda geçmez. TRACKING_PUBLIC_BASE_URL ile ngrok/public HTTPS kullanın."
        : "Pixel URL public görünüyor; Gmail'de görselleri açınca OPENED düşmeli.",
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Gönderim CV PDF snapshot
 * GET /api/mail-tracking/:mailId/cv
 */
router.get("/:mailId/cv", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const result = await getMailTrackingCvPdf(mailId, req.user.id);
    if (!result.found) {
      return res.status(404).json({ ok: false, message: result.error });
    }
    if (!result.hasCv) {
      return res.status(404).json({ ok: false, message: result.error });
    }
    return res.json({
      ok: true,
      filename: result.filename,
      contentType: result.contentType,
      contentBase64: result.contentBase64,
      company: result.company,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Cold mail gövdeleri (standart / info-contact)
 * GET /api/mail-tracking/:mailId/cold-mails
 */
router.get("/:mailId/cold-mails", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const result = await getMailTrackingColdMails(mailId, req.user.id);
    if (!result.found) {
      return res.status(404).json({ ok: false, message: result.error });
    }
    return res.json({
      ok: true,
      subject: result.subject,
      standardBody: result.standardBody,
      infoContactBody: result.infoContactBody,
      company: result.company,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * LinkedIn mesajları (standart / genel-kutu)
 * GET /api/mail-tracking/:mailId/linkedin-messages
 */
router.get("/:mailId/linkedin-messages", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const result = await getMailTrackingLinkedInMessages(mailId, req.user.id);
    if (!result.found) {
      return res.status(404).json({ ok: false, message: result.error });
    }
    return res.json({
      ok: true,
      standardBody: result.standardBody,
      infoContactBody: result.infoContactBody,
      company: result.company,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Company Based yeniden analiz bağlamı
 * GET /api/mail-tracking/:mailId/reanalyze
 */
router.get("/:mailId/reanalyze", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const result = await getMailTrackingReanalyzeContext(mailId, req.user.id);
    if (!result.found) {
      return res.status(404).json({ ok: false, message: result.error });
    }
    if (!result.canReanalyze) {
      return res.status(422).json({
        ok: false,
        message:
          "Bu kayıt için domain veya site URL bulunamadı; yeniden analiz başlatılamaz.",
        reanalyze: result.reanalyze,
      });
    }
    return res.json({
      ok: true,
      mailId: result.mailId,
      reanalyze: result.reanalyze,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Mail tracking detayı
 * GET /api/mail-tracking/:mailId
 */
router.get("/:mailId", async (req, res, next) => {
  try {
    const { mailId } = req.params;
    const result = await getMailTrackingDetails(mailId, req.user.id);

    if (!result.found) {
      return res.status(404).json({
        ok: false,
        message: "Mail tracking bulunamadı.",
      });
    }

    return res.json({
      ok: true,
      tracking: result.tracking,
      openEvents: result.openEvents,
      pixelUrl: result.pixelUrl,
      trackingBaseIsLocal: result.trackingBaseIsLocal,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
