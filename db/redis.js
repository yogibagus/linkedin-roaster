const redis = require('redis');
const Bull = require('bull');

// redis config
const redisClient = redis.createClient({
  socket: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD
  }
});

(async () => {
  // Connect to redis server
  await redisClient.connect();
})();

// redis connection log
redisClient.on('connect', () => {
  console.log('Redis client connected');
}), redisClient.on('error', (err) => {
  console.log('Something went wrong ' + err);
});

// create new queue for roast
const roastQueue = new Bull('roast-queue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  }
});

// Create a new queue for advice
const adviceQueue = new Bull('advice-queue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  }
});

roastQueue.on('error', (error) => {
  console.error('Queue Error:', error);
});

module.exports = { redisClient , roastQueue , adviceQueue };