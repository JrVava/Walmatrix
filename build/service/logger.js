"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapperLogger = void 0;
const winston_1 = __importDefault(require("winston"));
// Create a new logger instance
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }), // Output all logs to a file
    ],
});
exports.scrapperLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({
            filename: 'logs/scrapper-error.log',
            level: 'error',
        }),
        new winston_1.default.transports.File({ filename: 'logs/scrapper-combined.log' }), // Output all logs to a file
    ],
});
exports.default = logger;
//# sourceMappingURL=logger.js.map