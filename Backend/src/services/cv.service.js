const Cv = require("../models/cv.model");
const { AppError } = require("../utils/app-error");

const CV_CREATE_SOURCE = "cv_create";

function toPublicCv(doc) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    clientId: doc.clientId,
    displayTitle: doc.displayTitle || "Untitled CV",
    strengthPercent: Number(doc.strengthPercent || 0),
    badge: doc.badge || null,
    previewImageUrl: doc.previewImageUrl || "",
    source: doc.source || CV_CREATE_SOURCE,
    data: doc.data || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function deriveDisplayTitle(data = {}, fallback = "Untitled CV") {
  const title = String(data?.personalInfo?.title || "").trim();
  if (title) return title;

  const first = String(data?.personalInfo?.firstName || "").trim();
  const last = String(data?.personalInfo?.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || fallback;
}

/** My Resumes dışı (company-based vb.) kayıtları siler */
async function purgeNonCvCreateCvs(clientId) {
  const filter = clientId
    ? { clientId, source: { $ne: CV_CREATE_SOURCE } }
    : { source: { $ne: CV_CREATE_SOURCE } };
  const result = await Cv.deleteMany(filter);
  return { deletedCount: result.deletedCount || 0 };
}

async function listCvsByClientId(clientId) {
  // Eski company-based otomatik kayıtları bu client için temizle
  await purgeNonCvCreateCvs(clientId);

  const items = await Cv.find({ clientId, source: CV_CREATE_SOURCE })
    .sort({ updatedAt: -1 })
    .lean();

  return items.map(toPublicCv);
}

async function getCvByIdForClient(cvId, clientId) {
  const doc = await Cv.findOne({
    _id: cvId,
    clientId,
    source: CV_CREATE_SOURCE,
  }).lean();
  if (!doc) {
    throw new AppError("CV bulunamadı.", 404, "CV_NOT_FOUND");
  }
  return toPublicCv(doc);
}

async function createCv({ clientId, userId, data, displayTitle, strengthPercent, previewImageUrl }) {
  if (!data || typeof data !== "object") {
    throw new AppError("CV data zorunludur.", 400, "VALIDATION_ERROR");
  }

  // Optimizer / company alanlarını My Resumes payload'undan ayıkla
  const {
    companyInfo: _c,
    analysisResult: _a,
    coverLetter: _cl,
    linkedinMessage: _lm,
    analysisPreferences: _ap,
    ...cleanData
  } = data;

  const created = await Cv.create({
    clientId,
    userId,
    source: CV_CREATE_SOURCE,
    displayTitle: String(displayTitle || deriveDisplayTitle(cleanData)).trim() || "Untitled CV",
    strengthPercent: Number.isFinite(Number(strengthPercent))
      ? Math.max(0, Math.min(100, Number(strengthPercent)))
      : 0,
    badge: "recently-edited",
    previewImageUrl: String(previewImageUrl || "").trim(),
    data: cleanData,
  });

  return toPublicCv(created);
}

async function updateCv({ cvId, clientId, data, displayTitle, strengthPercent, previewImageUrl, badge }) {
  const updates = { badge: badge === undefined ? "recently-edited" : badge };

  if (data !== undefined) {
    if (!data || typeof data !== "object") {
      throw new AppError("CV data geçersiz.", 400, "VALIDATION_ERROR");
    }
    const {
      companyInfo: _c,
      analysisResult: _a,
      coverLetter: _cl,
      linkedinMessage: _lm,
      analysisPreferences: _ap,
      ...cleanData
    } = data;
    updates.data = cleanData;
    if (displayTitle === undefined) {
      updates.displayTitle = deriveDisplayTitle(cleanData);
    }
  }

  if (displayTitle !== undefined) {
    updates.displayTitle = String(displayTitle || "").trim() || "Untitled CV";
  }

  if (strengthPercent !== undefined) {
    updates.strengthPercent = Math.max(0, Math.min(100, Number(strengthPercent) || 0));
  }

  if (previewImageUrl !== undefined) {
    updates.previewImageUrl = String(previewImageUrl || "").trim();
  }

  const updated = await Cv.findOneAndUpdate(
    { _id: cvId, clientId, source: CV_CREATE_SOURCE },
    { $set: updates },
    { new: true }
  ).lean();

  if (!updated) {
    throw new AppError("CV bulunamadı.", 404, "CV_NOT_FOUND");
  }

  return toPublicCv(updated);
}

async function deleteCv(cvId, clientId) {
  const deleted = await Cv.findOneAndDelete({
    _id: cvId,
    clientId,
    source: CV_CREATE_SOURCE,
  }).lean();
  if (!deleted) {
    throw new AppError("CV bulunamadı.", 404, "CV_NOT_FOUND");
  }
  return { deleted: true, id: String(deleted._id) };
}

module.exports = {
  CV_CREATE_SOURCE,
  listCvsByClientId,
  getCvByIdForClient,
  createCv,
  updateCv,
  deleteCv,
  purgeNonCvCreateCvs,
  toPublicCv,
};
