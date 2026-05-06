/**
 * Centralized configuration — reads from .env with sensible defaults.
 * Every tuneable knob lives here so nothing is scattered across modules.
 */

require('dotenv').config();

const config = {
  // ─── Server ──────────────────────────────────────────
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // ─── Upstream APIs ──────────────────────────────────
  sboApiUrl: process.env.SBO_API_URL || 'http://localhost:4001',
  aggregatorApiUrl: process.env.AGGREGATOR_API_URL || 'http://localhost:4002',

  // ─── Bet Splitting ─────────────────────────────────
  minStake: parseFloat(process.env.MIN_STAKE) || 100,

  // ─── Retry Strategy ────────────────────────────────
  aggregatorMaxRetries: parseInt(process.env.AGGREGATOR_MAX_RETRIES, 10) || 2,
  aggregatorRetryDelayMs: parseInt(process.env.AGGREGATOR_RETRY_DELAY_MS, 10) || 500,

  // ─── Rate Limiting ─────────────────────────────────
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  // ─── Outbound Proxy (optional) ─────────────────────
  outboundProxy: process.env.OUTBOUND_PROXY_HOST
    ? {
        host: process.env.OUTBOUND_PROXY_HOST,
        port: parseInt(process.env.OUTBOUND_PROXY_PORT, 10) || 3129,
        auth: {
          username: process.env.OUTBOUND_PROXY_USER || '',
          password: process.env.OUTBOUND_PROXY_PASS || '',
        },
      }
    : null,

  // ─── Logging ───────────────────────────────────────
  logLevel: process.env.LOG_LEVEL || 'info',

  // ─── Allowed Proxy Domains ─────────────────────────
  allowedDomains: [
    'bialanh.com',
    'onlinesbobet.com',
    'dapatceria.com',
  ],
};

module.exports = config;
