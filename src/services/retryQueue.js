/**
 * In-memory retry queue for Aggregator bets.
 *
 * When the inline retry strategy is exhausted, failed bets are pushed here.
 * A background worker drains the queue periodically, attempting redelivery.
 * In production you'd swap this for Redis / BullMQ.
 */

const aggregatorService = require('./aggregatorService');
const logger = require('../utils/logger');

/** @type {Array<{ betPayload: object, enqueuedAt: Date }>} */
const queue = [];

/** Maximum items held in memory (circuit-breaker). */
const MAX_QUEUE_SIZE = 500;

/** Worker interval (ms). */
const DRAIN_INTERVAL_MS = 30_000; // every 30 seconds

/**
 * Enqueue a failed Aggregator bet for later retry.
 */
function enqueue(betPayload) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    logger.error('Retry queue is full — dropping bet', { transId: betPayload.transId });
    return;
  }

  queue.push({ betPayload, enqueuedAt: new Date() });
  logger.info('Bet enqueued for background retry', {
    transId: betPayload.transId,
    queueSize: queue.length,
  });
}

/**
 * Drain one pass of the queue.
 */
async function drain() {
  if (queue.length === 0) return;

  logger.info(`Retry queue drain started — ${queue.length} item(s)`);
  const batch = queue.splice(0, queue.length); // take all current items

  for (const item of batch) {
    const result = await aggregatorService.placeBet(item.betPayload);
    if (!result.success) {
      // If it still fails, re-enqueue (it will get another full retry cycle next drain)
      logger.warn('Background retry still failing — re-enqueuing', {
        transId: item.betPayload.transId,
      });
      enqueue(item.betPayload);
    }
  }
}

/**
 * Start the background worker.
 */
function startWorker() {
  logger.info(`Retry queue worker started (interval=${DRAIN_INTERVAL_MS}ms)`);
  setInterval(drain, DRAIN_INTERVAL_MS);
}

/**
 * Get current queue depth (for health checks / metrics).
 */
function getQueueSize() {
  return queue.length;
}

module.exports = { enqueue, startWorker, getQueueSize };
