import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 10000);
    return delay;
  },
});

let lastLoggedTime = 0;
redisConnection.on('error', (err) => {
  const now = Date.now();
  if (now - lastLoggedTime > 30000) {
    console.log('Redis connection status: Redis offline or connecting... (BullMQ queue waiting for Redis)');
    lastLoggedTime = now;
  }
});

redisConnection.on('connect', () => {
  console.log('BullMQ connected to Redis cleanly.');
});

// Connect lazily
redisConnection.connect().catch(() => {});
