/**
 * Route definitions.
 *
 * Only /place-bet is explicitly handled; everything else falls through
 * to the reverse proxy middleware.
 */

const { Router } = require('express');
const { placeBet } = require('../controllers/betController');
const { validatePlaceBet } = require('../middleware/requestValidator');
const { betRateLimiter } = require('../middleware/rateLimiter');

const router = Router();

// ─── Health Check ──────────────────────────────────────
router.get('/health', (_req, res) => {
  const retryQueue = require('../services/retryQueue');
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    retryQueueSize: retryQueue.getQueueSize(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Bet Placement (intercepted) ──────────────────────
router.post('/place-bet', betRateLimiter, validatePlaceBet, placeBet);

module.exports = router;
