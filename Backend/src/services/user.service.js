const User = require("../models/user.model");
const { hashPassword } = require("../utils/password.utils");
const { assertValidEmail, assertValidPassword } = require("../utils/password-policy.utils");
const { createClientId } = require("../utils/client-id.utils");
const { AppError } = require("../utils/app-error");

const ALLOWED_SELF_REGISTER_ROLES = new Set(["user"]);

const PUBLIC_USER_FIELDS =
  "email fullName firstName lastName title contactEmail phone country city linkedinUrl portfolioUrl githubUrl autoSendOutreachAfterAnalysis preferredAiProvider gmailSendIntervalMinMinutes gmailSendIntervalMaxMinutes enableMailTracking profileImageUrl profileImagePublicId clientId role isActive emailVerified emailVerifiedAt createdAt updatedAt";

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    title: user.title || "",
    contactEmail: user.contactEmail || "",
    phone: user.phone || "",
    country: user.country || "",
    city: user.city || "",
    linkedinUrl: user.linkedinUrl || "",
    portfolioUrl: user.portfolioUrl || "",
    githubUrl: user.githubUrl || "",
    autoSendOutreachAfterAnalysis: user.autoSendOutreachAfterAnalysis === true,
    preferredAiProvider: user.preferredAiProvider || "gemini-free",
    gmailSendIntervalMinMinutes: user.gmailSendIntervalMinMinutes || 0,
    gmailSendIntervalMaxMinutes: user.gmailSendIntervalMaxMinutes || 0,
    enableMailTracking: user.enableMailTracking !== false,
    profileImageUrl: user.profileImageUrl || "",
    profileImagePublicId: user.profileImagePublicId || "",
    clientId: user.clientId || "",
    role: user.role,
    isActive: user.isActive !== false,
    emailVerified: user.emailVerified === true,
    emailVerifiedAt: user.emailVerifiedAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function ensureClientId(user) {
  if (!user) return null;
  if (user.clientId) return user;

  const clientId = createClientId();
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { clientId } },
    { new: true }
  );

  return updated || user;
}

async function findUserByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return User.findOne({ email: normalizedEmail });
}

async function findActiveUserById(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findOne({
    _id: userId,
    isActive: { $ne: false },
  }).select(`${PUBLIC_USER_FIELDS} passwordHash`);

  return ensureClientId(user);
}

async function updateUserPasswordHash(userId, passwordHash) {
  return User.findByIdAndUpdate(
    userId,
    { $set: { passwordHash } },
    { new: true }
  ).select(PUBLIC_USER_FIELDS);
}

async function createUser({
  email,
  password,
  fullName = "",
  role = "user",
  clientId = null,
  isActive = true,
  emailVerified = false,
}) {
  const normalizedEmail = assertValidEmail(email);
  const validatedPassword = assertValidPassword(password);
  const normalizedRole = String(role || "user").trim().toLowerCase() || "user";

  if (!ALLOWED_SELF_REGISTER_ROLES.has(normalizedRole)) {
    throw new AppError("Bu rol ile kayıt yapılamaz.", 403, "ROLE_NOT_ALLOWED");
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError("Bu e-posta adresi zaten kayıtlı.", 409, "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(validatedPassword);
  const isVerified = emailVerified === true;
  const resolvedClientId = String(clientId || "").trim() || createClientId();

  try {
    const created = await User.create({
      email: normalizedEmail,
      passwordHash,
      fullName: String(fullName || "").trim(),
      clientId: resolvedClientId,
      role: normalizedRole,
      isActive: isActive !== false,
      emailVerified: isVerified,
      emailVerifiedAt: isVerified ? new Date() : null,
      failedLoginAttempts: 0,
      loginLockUntil: null,
    });

    return toPublicUser(created);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === "clientId") {
        throw new AppError(
          "clientId çakışması oluştu. Tekrar deneyin.",
          409,
          "CLIENT_ID_DUPLICATE"
        );
      }
      throw new AppError("Bu e-posta adresi zaten kayıtlı.", 409, "EMAIL_ALREADY_EXISTS");
    }
    throw error;
  }
}

async function updateUserProfile(
  userId,
  {
    fullName,
    firstName,
    lastName,
    title,
    contactEmail,
    phone,
    country,
    city,
    linkedinUrl,
    portfolioUrl,
    githubUrl,
    autoSendOutreachAfterAnalysis,
    preferredAiProvider,
    gmailSendIntervalMinMinutes,
    gmailSendIntervalMaxMinutes,
    enableMailTracking,
  } = {}
) {
  const updates = {};

  if (firstName !== undefined) updates.firstName = String(firstName || "").trim();
  if (lastName !== undefined) updates.lastName = String(lastName || "").trim();
  if (title !== undefined) updates.title = String(title || "").trim();
  if (contactEmail !== undefined) {
    updates.contactEmail = String(contactEmail || "").trim().toLowerCase();
  }
  if (phone !== undefined) updates.phone = String(phone || "").trim();
  if (country !== undefined) updates.country = String(country || "").trim();
  if (city !== undefined) updates.city = String(city || "").trim();
  if (linkedinUrl !== undefined) updates.linkedinUrl = String(linkedinUrl || "").trim();
  if (portfolioUrl !== undefined) updates.portfolioUrl = String(portfolioUrl || "").trim();
  if (githubUrl !== undefined) updates.githubUrl = String(githubUrl || "").trim();
  if (autoSendOutreachAfterAnalysis !== undefined) {
    updates.autoSendOutreachAfterAnalysis = Boolean(autoSendOutreachAfterAnalysis);
  }
  if (preferredAiProvider !== undefined) {
    const provider = String(preferredAiProvider || "gemini-free").toLowerCase().trim();
    if (provider === "openai" || provider === "gemini-free" || provider === "gemini-pro") {
      updates.preferredAiProvider = provider;
    }
  }
  
  if (gmailSendIntervalMinMinutes !== undefined) {
    const interval = Number(gmailSendIntervalMinMinutes);
    if (Number.isFinite(interval) && interval >= 0 && interval <= 1440) {
      updates.gmailSendIntervalMinMinutes = interval;
    }
  }
  
  if (gmailSendIntervalMaxMinutes !== undefined) {
    const interval = Number(gmailSendIntervalMaxMinutes);
    if (Number.isFinite(interval) && interval >= 0 && interval <= 1440) {
      updates.gmailSendIntervalMaxMinutes = interval;
    }
  }
  
  if (enableMailTracking !== undefined) {
    updates.enableMailTracking = Boolean(enableMailTracking);
  }

  if (fullName !== undefined) {
    updates.fullName = String(fullName || "").trim();
  } else if (updates.firstName !== undefined || updates.lastName !== undefined) {
    // first/last geldiyse fullName'i senkron tut
    const existing = await User.findById(userId).select("firstName lastName fullName");
    const f =
      updates.firstName !== undefined
        ? updates.firstName
        : String(existing?.firstName || "").trim();
    const l =
      updates.lastName !== undefined
        ? updates.lastName
        : String(existing?.lastName || "").trim();
    updates.fullName = [f, l].filter(Boolean).join(" ").trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Güncellenecek alan bulunamadı.", 400, "NO_UPDATE_FIELDS");
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId, isActive: { $ne: false } },
    { $set: updates },
    { new: true }
  ).select(PUBLIC_USER_FIELDS);

  if (!updated) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  // İstek aralığı değiştiyse bekleyen mailleri yeni değere göre yeniden planla
  if (
    updates.gmailSendIntervalMinMinutes !== undefined ||
    updates.gmailSendIntervalMaxMinutes !== undefined
  ) {
    try {
      const { rescheduleUserPendingEmails } = require("./email-queue.service");
      await rescheduleUserPendingEmails(userId);
    } catch (err) {
      console.error("[USER] Pending mail yeniden planlama hatası:", err);
    }
  }

  return toPublicUser(updated);
}

/**
 * Profil fotoğrafı yükle — hesap başına tek; eski Cloudinary görseli silinir.
 */
async function updateUserProfilePhoto(userId, imageDataUrl) {
  const { uploadProfileImage, deleteCloudinaryImage } = require("./cloudinary.service");

  const user = await User.findOne({ _id: userId, isActive: { $ne: false } }).select(
    "profileImageUrl profileImagePublicId"
  );
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  const previousPublicId = user.profileImagePublicId || "";

  const uploaded = await uploadProfileImage(imageDataUrl, { userId: String(userId) });

  // overwrite:true ile aynı public_id kullanıldığında destroy gerekmeyebilir;
  // farklı id ise eskisini sil
  if (previousPublicId && previousPublicId !== uploaded.publicId) {
    await deleteCloudinaryImage(previousPublicId);
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        profileImageUrl: uploaded.url,
        profileImagePublicId: uploaded.publicId,
      },
    },
    { new: true }
  ).select(PUBLIC_USER_FIELDS);

  return toPublicUser(updated);
}

async function deleteUserProfilePhoto(userId) {
  const { deleteCloudinaryImage } = require("./cloudinary.service");

  const user = await User.findOne({ _id: userId, isActive: { $ne: false } }).select(
    "profileImagePublicId"
  );
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı.", 404, "USER_NOT_FOUND");
  }

  if (user.profileImagePublicId) {
    await deleteCloudinaryImage(user.profileImagePublicId);
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { profileImageUrl: "", profileImagePublicId: "" } },
    { new: true }
  ).select(PUBLIC_USER_FIELDS);

  return toPublicUser(updated);
}

module.exports = {
  findUserByEmail,
  findActiveUserById,
  updateUserPasswordHash,
  createUser,
  updateUserProfile,
  updateUserProfilePhoto,
  deleteUserProfilePhoto,
  toPublicUser,
  ensureClientId,
  ALLOWED_SELF_REGISTER_ROLES,
};
