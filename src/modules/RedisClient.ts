import Redis from 'ioredis';
import logger from '../service/logger';
import { config } from '../config';
const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
};

const redisClient = new Redis({
    ...redisConfig,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

redisClient.on('connect', () => {
    logger.info('Redis Connected');
});

redisClient.on('error', (err) => {
    logger.info(`Error in Redis connection ${err}`);
});

redisClient.on('end', () => {
    logger.info('Client disconnected from redis');
});

export default redisClient;
