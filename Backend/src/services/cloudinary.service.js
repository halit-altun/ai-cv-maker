const { v2: cloudinary } = require("cloudinary");
const { AppError } = require("../utils/app-error");

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      "Cloudinary yapılandırması eksik (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).",
      500,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

/**
 * Base64 data URL veya ham base64 → Cloudinary upload
 * Folder: cv-ai-maker/profile
 */
async function uploadProfileImage(dataUrlOrBase64, { userId } = {}) {
  const cloudinaryClient = configureCloudinary();
  let payload = String(dataUrlOrBase64 || "").trim();
  if (!payload) {
    throw new AppError("Görsel verisi gerekli", 400, "MISSING_IMAGE");
  }
  if (!payload.startsWith("data:")) {
    payload = `data:image/jpeg;base64,${payload}`;
  }

  // ~4MB limit (base64)
  if (payload.length > 5_500_000) {
    throw new AppError("Görsel çok büyük (max ~4MB).", 400, "IMAGE_TOO_LARGE");
  }

  const result = await cloudinaryClient.uploader.upload(payload, {
    folder: "cv-ai-maker/profile",
    public_id: userId ? `user_${userId}` : undefined,
    overwrite: true,
    invalidate: true,
    transformation: [
      { width: 600, height: 600, crop: "fill", gravity: "face" },
      { quality: "auto:good", fetch_format: "auto" },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return { deleted: false };
  try {
    const cloudinaryClient = configureCloudinary();
    await cloudinaryClient.uploader.destroy(String(publicId), { invalidate: true });
    return { deleted: true };
  } catch (err) {
    console.warn("[CLOUDINARY] Silme hatası:", err.message);
    return { deleted: false, error: err.message };
  }
}

module.exports = {
  uploadProfileImage,
  deleteCloudinaryImage,
  configureCloudinary,
};
