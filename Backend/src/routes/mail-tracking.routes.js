const express = require("express");
const {
  getUserMailTrackings,
  getMailTrackingDetails,
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
 */
router.get("/stats/summary", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query;
    const base = { userId };
    if (projectId) base.projectId = projectId;

    const [total, sent, delivered, opened, failed, inbox, spam] = await Promise.all([
      MailTracking.countDocuments(base),
      MailTracking.countDocuments({ ...base, status: "SENT" }),
      MailTracking.countDocuments({ ...base, status: "DELIVERED" }),
      MailTracking.countDocuments({ ...base, status: "OPENED" }),
      MailTracking.countDocuments({ ...base, status: "FAILED" }),
      MailTracking.countDocuments({ ...base, deliveryOutcome: "inbox" }),
      MailTracking.countDocuments({ ...base, deliveryOutcome: "spam" }),
    ]);

    const openRate = total > 0 ? Number(((opened / total) * 100).toFixed(1)) : 0;
    const marked = inbox + spam;
    const inboxRate = marked > 0 ? Number(((inbox / marked) * 100).toFixed(1)) : null;

    return res.json({
      ok: true,
      stats: { total, sent, delivered, opened, failed, openRate, inbox, spam, inboxRate },
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
    const { limit = 50, skip = 0, status, projectId, company, startDate, endDate } = req.query;

    const result = await getUserMailTrackings(req.user.id, {
      limit: Number(limit) || 50,
      skip: Number(skip) || 0,
      status: status || undefined,
      projectId: projectId || undefined,
      company: company || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return res.json({
      ok: true,
      trackings: result.trackings,
      total: result.total,
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
