const User = require("../models/user.model");

/**
 * Profil "Kaydetme tercihi" — varsayılan açık (true).
 * Kapalıysa company-based / bulk analiz ve mail kayıtları DB'ye yazılmaz.
 */
async function isPersistOutreachHistoryEnabled(userId) {
  if (!userId) return true;
  const user = await User.findById(userId)
    .select("persistOutreachHistory")
    .lean();
  return user?.persistOutreachHistory !== false;
}

module.exports = {
  isPersistOutreachHistoryEnabled,
};
