/**
 * Request validation middleware using Zod.
 * Rejects malformed payloads before they hit the splitting logic.
 */

const { z } = require('zod');
const logger = require('../utils/logger');

const placeBetSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  odds: z.number().positive('odds must be a positive number'),
  stake: z.number().positive('stake must be a positive number'),
  transId: z.string().min(1, 'transId is required'),
});

/**
 * Express middleware — validates req.body against the bet schema.
 */
function validatePlaceBet(req, res, next) {
  const result = placeBetSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn('Validation failed for /place-bet', { errors, body: req.body });

    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: errors,
    });
  }

  // Attach validated data so downstream handlers use clean data
  req.validatedBet = result.data;
  next();
}

module.exports = { validatePlaceBet, placeBetSchema };
