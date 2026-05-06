/**
 * Structured logger using Winston.
 * Outputs JSON in production, colorized console in development.
 */

const { createLogger, format, transports } = require('winston');
const config = require('../config');

const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    config.nodeEnv === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `  ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        }))
  ),
  defaultMeta: { service: 'bet-split-proxy' },
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5_242_880, maxFiles: 5 }),
    new transports.File({ filename: 'logs/combined.log', maxsize: 5_242_880, maxFiles: 5 }),
  ],
});

module.exports = logger;
