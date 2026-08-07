const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), SALT_ROUNDS);
}

async function comparePassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) {
    return false;
  }

  return bcrypt.compare(String(plainPassword), String(passwordHash));
}

module.exports = {
  hashPassword,
  comparePassword,
};
