/**
 * Aggregator API client.
 *
 * - Internal-only; never exposed to the frontend
 * - Retries up to N times with configurable delay
 * - Failures are swallowed (logged, but never surface to the user)
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: config.aggregatorApiUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Sleep helper for retry backoff.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Place a bet with the Aggregator, retrying on failure.
 *
 * @param {object} betPayload — { eventId, odds, stake, transId }
 * @param {{ simulateError?: boolean }} opts — testing options
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function placeBet(betPayload, opts = {}) {
  const { transId, stake } = betPayload;
  const maxRetries = config.aggregatorMaxRetries;
  const retryDelay = config.aggregatorRetryDelayMs;

  const headers = {};
  if (opts.simulateError) headers['x-simulate-error'] = 'true';

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      logger.info('Sending bet to Aggregator', { transId, stake, attempt });
      const { data } = await client.post('/aggregator/place-bet', betPayload, { headers });
      logger.info('Aggregator bet placed successfully', { transId, attempt, response: data });
      return { success: true, data };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.warn('Aggregator bet attempt failed', {
        transId,
        attempt,
        maxAttempts: maxRetries + 1,
        error: errMsg,
        status: error.response?.status,
      });

      if (attempt <= maxRetries) {
        logger.info(`Retrying Aggregator in ${retryDelay}ms…`, { transId, nextAttempt: attempt + 1 });
        await sleep(retryDelay);
      }
    }
  }

  // All attempts exhausted — log and return graceful failure
  logger.error('Aggregator bet FAILED after all retries', {
    transId,
    totalAttempts: maxRetries + 1,
  });

  return { success: false, error: 'All retry attempts exhausted' };
}

module.exports = { placeBet };
