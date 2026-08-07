require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const { hashPassword } = require("../src/utils/password.utils");
const { assertValidPassword, assertValidEmail } = require("../src/utils/password-policy.utils");

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Kullanım: npm run auth:set-password -- <email> <password>");
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI tanımlı değil.");
    process.exit(1);
  }

  const normalizedEmail = assertValidEmail(email);
  const validatedPassword = assertValidPassword(password);
  const passwordHash = await hashPassword(validatedPassword);

  await mongoose.connect(process.env.MONGODB_URI);

  const updated = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        failedLoginAttempts: 0,
        loginLockUntil: null,
      },
    },
    { new: true }
  );

  if (!updated) {
    console.error("Kullanıcı bulunamadı:", normalizedEmail);
    process.exit(1);
  }

  console.log("Şifre güncellendi:", normalizedEmail);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
