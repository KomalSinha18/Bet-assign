/**
 * Rate limiting middleware using express-rate-limit.
 * Protects the proxy from abuse and upstream flooding.
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');

const betRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,  // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: `Too many requests. Try again after ${Math.ceil(config.rateLimitWindowMs / 1000)}s.`,
  },
});

module.exports = { betRateLimiter };
