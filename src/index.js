/**
 * Application entry point.
 *
 * Wires together:
 *   1. JSON body parser
 *   2. Request logging
 *   3. Explicit routes (/place-bet, /health)
 *   4. Reverse proxy for everything else
 *   5. Retry queue background worker
 */

const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { createDomainProxy } = require('./middleware/proxyMiddleware');
const retryQueue = require('./services/retryQueue');

const app = express();

// ─── Body Parsing ────────────────────────────────────
app.use(express.json());

// ─── Request Logging ─────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    host: req.headers.host,
  });
  next();
});

// ─── Explicit Routes (bet interception + health) ─────
app.use(routes);

// ─── Reverse Proxy (everything else → upstream) ──────
app.use(createDomainProxy());

// ─── Global Error Handler ────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
});

// ─── Start Server ────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`🚀 Bet-Split Proxy running on port ${config.port}`, {
    env: config.nodeEnv,
    minStake: config.minStake,
    sboUpstream: config.sboApiUrl,
    aggregatorUpstream: config.aggregatorApiUrl,
  });

  // Start background retry worker
  retryQueue.startWorker();
});

module.exports = app; // export for testing
