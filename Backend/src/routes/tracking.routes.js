const express = require("express");
const { recordMailOpen } = require("../services/mail-tracking.service");
const { getTransparentPixelBuffer, getTrackingPixelHeaders } = require("../utils/tracking-pixel");

const router = express.Router();

async function handlePixel(req, res) {
  const rawId = String(req.params.mailId || "");
  const cleanMailId = rawId.replace(/\.png$/i, "").trim();

  const pixelBuffer = getTransparentPixelBuffer();
  const headers = getTrackingPixelHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Pixel'i hemen döndür (e-posta istemcisi timeout olmasın)
  res.status(200).end(pixelBuffer);

  if (!cleanMailId) {
    console.warn("[TRACKING_PIXEL] Boş mailId");
    return;
  }

  setImmediate(async () => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || req.headers["x-forwarded-for"] || "";
      const userAgent = req.headers["user-agent"] || "";
      const referer = req.headers["referer"] || req.headers["referrer"] || "";

      console.log(`[TRACKING_PIXEL] Hit: ${cleanMailId} | ua=${String(userAgent).slice(0, 80)}`);

      const result = await recordMailOpen(cleanMailId, {
        ip: String(ip).split(",")[0].trim(),
        userAgent,
        referer,
      });

      if (!result.found) {
        console.warn(`[TRACKING_PIXEL] mailId DB'de yok: ${cleanMailId}`);
      }
    } catch (error) {
      console.error("[TRACKING_PIXEL] Error recording open:", error);
    }
  });
}

/**
 * GET /api/track/pixel/:mailId.png
 * GET /api/track/pixel/:mailId
 * Auth yok — e-posta istemcisi / Gmail proxy çağırır.
 *
 * Not: Express'te `.png` bazen format olarak parse edilir; her iki path de desteklenir.
 */
router.get(["/pixel/:mailId.png", "/pixel/:mailId"], handlePixel);

module.exports = router;
