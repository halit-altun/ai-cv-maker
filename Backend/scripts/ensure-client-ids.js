require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const { createClientId } = require("../src/utils/client-id.utils");

async function main() {
  const emailArg = String(process.argv[2] || "halitaltun002@gmail.com")
    .trim()
    .toLowerCase();

  await mongoose.connect(process.env.MONGODB_URI);

  const missing = await User.find({
    $or: [{ clientId: { $exists: false } }, { clientId: null }, { clientId: "" }],
  });

  for (const user of missing) {
    user.clientId = createClientId();
    await user.save();
    console.log("clientId eklendi:", user.email, user.clientId);
  }

  const target = await User.findOneAndUpdate(
    { email: emailArg },
    {
      $set: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      $setOnInsert: {},
    },
    { new: true }
  );

  if (!target) {
    console.error("Kullanici bulunamadi:", emailArg);
    process.exit(1);
  }

  if (!target.clientId) {
    target.clientId = createClientId();
    await target.save();
  }

  console.log("OK:", target.email, "clientId=", target.clientId, "verified=", target.emailVerified);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
