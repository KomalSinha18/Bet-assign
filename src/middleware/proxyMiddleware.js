/**
 * Reverse Proxy Middleware.
 *
 * Uses http-proxy-middleware for transparent forwarding of all non-bet routes
 * to the appropriate upstream (SBO / domain-based routing).
 *
 * The /place-bet route is excluded — it goes through our split controller instead.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Create a domain-aware reverse proxy that forwards unhandled requests
 * to the correct upstream based on the Host header.
 */
function createDomainProxy() {
  // Map each allowed domain to the SBO upstream (in production, each might
  // point to a different backend; for now they all funnel to SBO).
  const domainTargetMap = {};
  for (const domain of config.allowedDomains) {
    domainTargetMap[domain] = config.sboApiUrl;
  }

  return createProxyMiddleware({
    router: (req) => {
      const host = (req.headers.host || '').split(':')[0]; // strip port
      const target = domainTargetMap[host];
      if (target) {
        logger.debug('Proxy routing by domain', { host, target });
        return target;
      }
      // Default target
      return config.sboApiUrl;
    },
    target: config.sboApiUrl, // fallback
    changeOrigin: true,
    logLevel: 'warn',
    on: {
      proxyReq: (proxyReq, req) => {
        logger.debug('Proxying request', {
          method: req.method,
          url: req.originalUrl,
          target: proxyReq.getHeader('host'),
        });
      },
      error: (err, req, res) => {
        logger.error('Proxy error', { error: err.message, url: req.originalUrl });
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: 'PROXY_ERROR',
            message: 'Upstream server unavailable',
          });
        }
      },
    },
  });
}

module.exports = { createDomainProxy };
