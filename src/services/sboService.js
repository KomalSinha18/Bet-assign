/**
 * SBO API client.
 *
 * - No retries (SBO failure = immediate error to user)
 * - Supports optional outbound proxy for geo-restricted environments
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Build an Axios instance that routes through the outbound proxy if configured.
 */
function createSboClient() {
  const opts = {
    baseURL: config.sboApiUrl,
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
  };

  if (config.outboundProxy) {
    const { host, port, auth } = config.outboundProxy;
    const proxyUrl = `http://${auth.username}:${auth.password}@${host}:${port}`;
    opts.httpAgent = new HttpsProxyAgent(proxyUrl);
    opts.httpsAgent = new HttpsProxyAgent(proxyUrl);
    logger.info('SBO client configured with outbound proxy', { host, port });
  }

  return axios.create(opts);
}

const client = createSboClient();

/**
 * Place a bet with SBO.
 * @param {object} betPayload — { eventId, odds, stake, transId }
 * @param {{ simulateError?: boolean }} opts — testing options
 * @returns {Promise<object>} SBO response data
 */
async function placeBet(betPayload, opts = {}) {
  const { transId } = betPayload;
  logger.info('Sending bet to SBO', { transId, stake: betPayload.stake });

  const headers = {};
  if (opts.simulateError) headers['x-simulate-error'] = 'true';

  try {
    const { data } = await client.post('/sbo/place-bet', betPayload, { headers });
    logger.info('SBO bet placed successfully', { transId, response: data });
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error('SBO bet FAILED', { transId, error: errMsg, status: error.response?.status });
    throw error;
  }
}

module.exports = { placeBet };
