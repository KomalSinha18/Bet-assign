/**
 * Bet Controller — orchestrates the split + fan-out + response pipeline.
 *
 * Flow:
 *   1. Split bet into SBO + Aggregator portions
 *   2. Fire both in parallel (Promise.allSettled)
 *   3. If SBO fails → return error immediately (Aggregator ignored)
 *   4. If SBO succeeds → return success (Aggregator failure only logged)
 *   5. If Aggregator fails after retries → push to retry queue
 */

const { splitBet } = require('../services/betSplitter');
const sboService = require('../services/sboService');
const aggregatorService = require('../services/aggregatorService');
const retryQueue = require('../services/retryQueue');
const logger = require('../utils/logger');

/**
 * POST /place-bet handler
 */
async function placeBet(req, res) {
  const bet = req.validatedBet; // set by validation middleware
  const { transId } = bet;

  try {
    // ── 1. Split ───────────────────────────────────────
    const { sboBet, aggregatorBet } = splitBet(bet);

    // ── 2. Fan-out (parallel) ──────────────────────────
    // Check for simulation headers (testing only)
    const simulateSboError = req.headers['x-simulate-sbo-error'] === 'true';
    const simulateAggError = req.headers['x-simulate-aggregator-error'] === 'true';

    const promises = [sboService.placeBet(sboBet, { simulateError: simulateSboError })];

    // Only call Aggregator if there's a remainder
    if (aggregatorBet) {
      promises.push(aggregatorService.placeBet(aggregatorBet, { simulateError: simulateAggError }));
    } else {
      promises.push(Promise.resolve({ success: true, data: { skipped: true } }));
    }

    const [sboResult, aggResult] = await Promise.allSettled(promises);

    // ── 3. Evaluate SBO result (authoritative) ────────
    if (sboResult.status === 'rejected') {
      const sboError = sboResult.reason;
      const errorPayload = sboError.response?.data || { message: sboError.message };

      logger.error('Bet REJECTED — SBO failed', {
        transId,
        sboError: errorPayload,
        aggregatorStatus: aggResult.status,
      });

      return res.status(sboError.response?.status || 502).json({
        success: false,
        error: 'SBO_BET_FAILED',
        message: errorPayload.message || 'SBO rejected the bet',
        transId,
      });
    }

    // ── 4. SBO succeeded → evaluate Aggregator (non-blocking) ──
    const sboData = sboResult.value;

    if (aggregatorBet) {
      if (aggResult.status === 'rejected' || (aggResult.value && !aggResult.value.success)) {
        // Aggregator failed — log & enqueue for background retry
        logger.warn('Aggregator failed but SBO succeeded — enqueuing for retry', { transId });
        retryQueue.enqueue(aggregatorBet);
      }
    }

    // ── 5. Return SBO response to client ──────────────
    logger.info('Bet placed successfully', {
      transId,
      sboStake: sboBet.stake,
      aggregatorStake: aggregatorBet?.stake ?? 0,
    });

    return res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      transId,
      data: sboData,
    });
  } catch (error) {
    logger.error('Unexpected error in placeBet controller', {
      transId,
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      transId,
    });
  }
}

module.exports = { placeBet };
