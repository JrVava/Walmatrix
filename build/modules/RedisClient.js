"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = __importDefault(require("../service/logger"));
const config_1 = require("../config");
const redisConfig = {
    host: config_1.config.redis.host,
    port: config_1.config.redis.port,
};
const redisClient = new ioredis_1.default(Object.assign(Object.assign({}, redisConfig), { maxRetriesPerRequest: null, enableReadyCheck: false }));
redisClient.on('connect', () => {
    logger_1.default.info('Redis Connected');
});
redisClient.on('error', (err) => {
    logger_1.default.info(`Error in Redis connection ${err}`);
});
redisClient.on('end', () => {
    logger_1.default.info('Client disconnected from redis');
});
exports.default = redisClient;
//# sourceMappingURL=RedisClient.js.map