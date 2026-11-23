import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";

/**
 * Creates a standard Redis TCP connection via ioredis.
 * BullMQ requires `maxRetriesPerRequest: null` and native blocking commands.
 */
export function createRedisConnection(redisUrl: string): Redis {
  const isTls = redisUrl.startsWith("rediss://");
  
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis connection retrying in ${delay}ms (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err) {
      logger.warn(`Redis reconnecting on error: ${err.message}`);
      return true;
    },
  });

  client.on("connect", () => {
    logger.info("Connected to Redis server");
  });

  client.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
  });

  return client;
}
