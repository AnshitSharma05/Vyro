const Redis = require('ioredis');
const config = require('./env');
const redisOptions = require('./redis');

let client;

function getRedisClient() {
  if (!client) {
    client = new Redis(config.REDIS_URL || redisOptions);
  }
  return client;
}

module.exports = getRedisClient();
