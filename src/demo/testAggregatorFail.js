/**
 * Demo: Aggregator API failure scenario.
 *
 * Uses x-simulate-aggregator-error header.
 * Expected: SBO succeeds → user sees success, Aggregator failure logged + retried.
 */

const http = require('http');

const payload = JSON.stringify({
  eventId: 'EVT-77777',
  odds: 3.2,
  stake: 750,
  transId: 'TXN-AGGFAIL-001',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/place-bet',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-simulate-aggregator-error': 'true',
  },
};

console.log('\n🧪 TEST: Aggregator Failure (stake=750)');
console.log('   Expected: Success returned (SBO ok), Aggregator failure logged');
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
