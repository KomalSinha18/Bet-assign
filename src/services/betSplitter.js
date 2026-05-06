/**
 * Pure-logic module for splitting a bet stake into SBO and Aggregator portions.
 *
 * Rules:
 *   stake <= MIN_STAKE  → SBO gets full stake, Aggregator gets 0
 *   stake >  MIN_STAKE  → SBO gets MIN_STAKE, Aggregator gets remainder
 */

const config = require('../config');
const logger = require('../utils/logger');

/**
 * @param {object} bet  — validated bet payload
 * @returns {{ sboBet: object, aggregatorBet: object | null }}
 */
function splitBet(bet) {
  const { eventId, odds, stake, transId } = bet;
  const minStake = config.minStake;

  let sboStake, aggregatorStake;

  if (stake <= minStake) {
    sboStake = stake;
    aggregatorStake = 0;
  } else {
    sboStake = minStake;
    aggregatorStake = parseFloat((stake - minStake).toFixed(2)); // avoid floating-point drift
  }

  logger.info('Bet split calculated', {
    transId,
    originalStake: stake,
    sboStake,
    aggregatorStake,
    minStake,
  });

  const sboBet = { eventId, odds, stake: sboStake, transId };
  const aggregatorBet = aggregatorStake > 0
    ? { eventId, odds, stake: aggregatorStake, transId }
    : null;

  return { sboBet, aggregatorBet };
}

module.exports = { splitBet };
