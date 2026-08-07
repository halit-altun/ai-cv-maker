const {
  listCvsByClientId,
  getCvByIdForClient,
  createCv,
  updateCv,
  deleteCv,
} = require("../services/cv.service");
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

async function listCvsHandler(req, res, next) {
  try {
    const items = await listCvsByClientId(req.clientId);
    return res.json({ ok: true, items });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function getCvHandler(req, res, next) {
  try {
    const item = await getCvByIdForClient(req.params.id, req.clientId);
    return res.json({ ok: true, item });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function createCvHandler(req, res, next) {
  try {
    const { data, displayTitle, strengthPercent, previewImageUrl } = req.body || {};
    const item = await createCv({
      clientId: req.clientId,
      userId: req.user.id,
      data,
      displayTitle,
      strengthPercent,
      previewImageUrl,
    });
    return res.status(201).json({ ok: true, item });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function updateCvHandler(req, res, next) {
  try {
    const { data, displayTitle, strengthPercent, previewImageUrl, badge } = req.body || {};
    const item = await updateCv({
      cvId: req.params.id,
      clientId: req.clientId,
      data,
      displayTitle,
      strengthPercent,
      previewImageUrl,
      badge,
    });
    return res.json({ ok: true, item });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

async function deleteCvHandler(req, res, next) {
  try {
    const result = await deleteCv(req.params.id, req.clientId);
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (sendError(res, error)) return undefined;
    return next(error);
  }
}

module.exports = {
  listCvsHandler,
  getCvHandler,
  createCvHandler,
  updateCvHandler,
  deleteCvHandler,
};
