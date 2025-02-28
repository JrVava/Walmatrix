import winston from 'winston';

// Create a new logger instance
const logger = winston.createLogger({
    level: 'info', // Set the logging level
    format: winston.format.json(), // Define the log format
    transports: [
        new winston.transports.Console(), // Output logs to the console
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }), // Output error logs to a file
        new winston.transports.File({ filename: 'logs/combined.log' }), // Output all logs to a file
    ],
});

export const scrapperLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(), // Output logs to the console
        new winston.transports.File({
            filename: 'logs/scrapper-error.log',
            level: 'error',
        }), // Output error logs to a file
        new winston.transports.File({ filename: 'logs/scrapper-combined.log' }), // Output all logs to a file
    ],
});

export default logger;
