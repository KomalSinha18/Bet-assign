/**
 * Mock SBO API Server
 *
 * Simulates the external SBO betting API for local development / testing.
 *
 * Behaviour:
 *   - Accepts POST /sbo/place-bet
 *   - Returns success by default
 *   - Send header `x-simulate-error: true` to force a 500 error (for testing)
 *   - Adds ~200ms latency to simulate network delay
 */

const express = require('express');

const app = express();
const PORT = 4001;

app.use(express.json());

// ─── Request Logger ──────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[SBO Mock] ${req.method} ${req.url}`, JSON.stringify(req.body || {}));
  next();
});

// ─── Place Bet ───────────────────────────────────────
app.post('/sbo/place-bet', async (req, res) => {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  // Error simulation
  if (req.headers['x-simulate-error'] === 'true') {
    console.log('[SBO Mock] ⚠️  Simulating ERROR for transId:', req.body.transId);
    return res.status(500).json({
      success: false,
      message: 'SBO internal error (simulated)',
      transId: req.body.transId,
    });
  }

  const { eventId, odds, stake, transId } = req.body;

  console.log(`[SBO Mock] ✅ Bet accepted — transId=${transId} stake=${stake}`);

  res.status(200).json({
    success: true,
    message: 'Bet placed with SBO',
    data: {
      transId,
      eventId,
      odds,
      stake,
      sboRefId: `SBO-${Date.now()}`,
      status: 'ACCEPTED',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── Catch-all (reverse-proxy passthrough target) ────
app.all('*', (req, res) => {
  res.json({
    source: 'sbo-mock',
    message: 'Passthrough endpoint',
    method: req.method,
    url: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`\n🎰 Mock SBO API running on http://localhost:${PORT}\n`);
});
