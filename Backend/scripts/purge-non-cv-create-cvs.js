/**
 * My Resumes dışı CV kayıtlarını siler (company-based otomatik kayıtlar vb.).
 * Kullanım: node scripts/purge-non-cv-create-cvs.js
 * Opsiyonel: node scripts/purge-non-cv-create-cvs.js <clientId>
 */
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const { purgeNonCvCreateCvs } = require("../src/services/cv.service");

async function main() {
  const clientId = String(process.argv[2] || "").trim() || undefined;

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI tanımlı değil.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const result = await purgeNonCvCreateCvs(clientId);
  console.log(
    clientId
      ? `clientId=${clientId} için silinen CV: ${result.deletedCount}`
      : `Tüm client'larda silinen (source != cv_create) CV: ${result.deletedCount}`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
