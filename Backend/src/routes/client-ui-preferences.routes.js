const express = require("express");
const {
  getClientUiPreferences,
  updateClientUiPreferences,
} = require("../services/client-ui-preferences.service");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");
const { isAppError } = require("../utils/app-error");

const router = express.Router();

router.use(requireAuth, requireClientId);

function sendError(res, error) {
  if (isAppError(error)) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message,
      code: error.code,
      details: error.details ?? undefined,
    });
  }
  return null;
}

/**
 * GET /api/client-preferences
 */
router.get("/", async (req, res, next) => {
  try {
    const preferences = await getClientUiPreferences(req.clientId);
    return res.json({ ok: true, preferences });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
});

/**
 * PATCH /api/client-preferences
 */
router.patch("/", async (req, res, next) => {
  try {
    const preferences = await updateClientUiPreferences(
      req.clientId,
      req.user.id,
      req.body || {}
    );
    return res.json({
      ok: true,
      message: "Tercihler kaydedildi.",
      preferences,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
});

module.exports = router;
