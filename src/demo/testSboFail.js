/**
 * Demo: SBO API failure scenario.
 *
 * Uses x-simulate-error header to make the mock SBO return 500.
 * Expected: proxy returns error to client, Aggregator result ignored.
 */

const http = require('http');

const payload = JSON.stringify({
  eventId: 'EVT-99999',
  odds: 1.8,
  stake: 300,
  transId: 'TXN-SBOFAIL-001',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/place-bet',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-simulate-sbo-error': 'true', // our proxy will forward this
  },
};

console.log('\n🧪 TEST: SBO Failure (stake=300)');
console.log('   Expected: Error returned to user, Aggregator ignored');
console.log('─'.repeat(55));

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log(`   Status: ${res.statusCode}`);
    console.log('   Response:', JSON.parse(data));
    console.log('');
  });
});

req.on('error', (e) => console.error('   ❌ Error:', e.message));
req.write(payload);
req.end();
