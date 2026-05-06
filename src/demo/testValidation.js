/**
 * Demo: Validation failure scenarios.
 */

const http = require('http');

function sendRequest(label, body) {
  const payload = JSON.stringify(body);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/place-bet',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  };

  return new Promise((resolve) => {
    console.log(`\n🧪 VALIDATION: ${label}`);
    console.log('─'.repeat(55));

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log('   Response:', JSON.parse(data));
        resolve();
      });
    });

    req.on('error', (e) => { console.error('   ❌ Error:', e.message); resolve(); });
    req.write(payload);
    req.end();
  });
}

(async () => {
  // Missing eventId
  await sendRequest('Missing eventId', {
    odds: 2.0,
    stake: 100,
    transId: 'TXN-VAL-001',
  });

  // Negative stake
  await sendRequest('Negative stake', {
    eventId: 'EVT-001',
    odds: 2.0,
    stake: -50,
    transId: 'TXN-VAL-002',
  });

  // Non-numeric odds
  await sendRequest('Non-numeric odds', {
    eventId: 'EVT-001',
    odds: 'abc',
    stake: 100,
    transId: 'TXN-VAL-003',
  });

  // Empty body
  await sendRequest('Empty body', {});

  // Stake exactly at MIN_STAKE (should succeed — no split)
  await sendRequest('Stake = MIN_STAKE (100, no split)', {
    eventId: 'EVT-001',
    odds: 1.5,
    stake: 100,
    transId: 'TXN-VAL-004',
  });
})();
