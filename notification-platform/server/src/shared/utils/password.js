const bcrypt = require('bcrypt');
const config = require('../../config/env');

const hashPassword = async (password) => {
  const saltRounds = config.BCRYPT_SALT_ROUNDS || 10;
  return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
