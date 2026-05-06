/**
 * Mock Aggregator API Server
 *
 * Simulates the internal Aggregator service with in-memory transaction storage.
 *
 * Behaviour:
 *   - Accepts POST /aggregator/place-bet
 *   - Stores every successful transaction in memory
 *   - GET /aggregator/transactions → view all stored transactions
 *   - GET /aggregator/transactions/:transId → view a specific transaction
 *   - Send header `x-simulate-error: true` to force a 500 error
 *   - Adds ~150ms latency
 */

const express = require('express');

const app = express();
const PORT = 4002;

app.use(express.json());

// ─── In-Memory Transaction Store ─────────────────────
/** @type {Map<string, object>} */
const transactions = new Map();

// ─── Request Logger ──────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[Aggregator Mock] ${req.method} ${req.url}`, JSON.stringify(req.body || {}));
  next();
});

// ─── Place Bet ───────────────────────────────────────
app.post('/aggregator/place-bet', async (req, res) => {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 150));

  // Error simulation
  if (req.headers['x-simulate-error'] === 'true') {
    console.log('[Aggregator Mock] ⚠️  Simulating ERROR for transId:', req.body.transId);
    return res.status(500).json({
      success: false,
      message: 'Aggregator internal error (simulated)',
      transId: req.body.transId,
    });
  }

  const { eventId, odds, stake, transId } = req.body;

  // Store transaction
  const txn = {
    transId,
    eventId,
    odds,
    stake,
    aggregatorRefId: `AGG-${Date.now()}`,
    status: 'STORED',
    createdAt: new Date().toISOString(),
  };

  transactions.set(transId, txn);
  console.log(`[Aggregator Mock] ✅ Bet stored — transId=${transId} stake=${stake} (total stored: ${transactions.size})`);

  res.status(200).json({
    success: true,
    message: 'Bet stored in Aggregator',
    data: txn,
  });
});

// ─── List All Transactions ──────────────────────────
app.get('/aggregator/transactions', (_req, res) => {
  res.json({
    success: true,
    count: transactions.size,
    transactions: Array.from(transactions.values()),
  });
});

// ─── Get Single Transaction ─────────────────────────
app.get('/aggregator/transactions/:transId', (req, res) => {
  const txn = transactions.get(req.params.transId);
  if (!txn) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }
  res.json({ success: true, data: txn });
});

app.listen(PORT, () => {
  console.log(`\n📦 Mock Aggregator API running on http://localhost:${PORT}\n`);
});
