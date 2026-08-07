const { getDashboardPayload } = require("../services/dashboard.service");
const { isAppError } = require("../utils/app-error");

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

async function getDashboardHandler(req, res, next) {
  try {
    const payload = await getDashboardPayload(req.user);
    return res.json({ ok: true, ...payload });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function getDashboardInsightsHandler(req, res, next) {
  try {
    const payload = await getDashboardPayload(req.user);
    return res.json({
      ok: true,
      visibility: payload.insights.visibility,
      recommendation: payload.insights.recommendation,
    });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

module.exports = {
  getDashboardHandler,
  getDashboardInsightsHandler,
};
