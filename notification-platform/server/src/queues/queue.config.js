const connection = require('../config/redis');

const defaultJobOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

module.exports = {
  connection,
  defaultJobOptions,
};
