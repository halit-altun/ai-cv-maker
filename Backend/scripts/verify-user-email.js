require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const User = require("../src/models/user.model");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const updated = await User.findOneAndUpdate(
    { email: "halitaltun002@gmail.com" },
    {
      $set: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        failedLoginAttempts: 0,
        loginLockUntil: null,
      },
    },
    { new: true }
  );

  if (!updated) {
    console.error("Kullanici bulunamadi: halitaltun002@gmail.com");
    process.exit(1);
  }

  console.log(
    "OK:",
    updated.email,
    "verified=",
    updated.emailVerified,
    "at=",
    updated.emailVerifiedAt
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
