import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 2000, 10000);
  },
});

let lastLog = 0;
redisConnection.on('error', (err) => {
  const now = Date.now();
  if (now - lastLog > 30000) {
    console.log('Redis status: Waiting for Redis server on port 6379 (docker compose up -d)...');
    lastLog = now;
  }
});

redisConnection.on('connect', () => {
  console.log('BullMQ connected to Redis cleanly on port 6379.');
});
