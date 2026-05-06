/**
 * Demo: Successful bet placement (stake > MIN_STAKE → split happens)
 */

const http = require('http');

const payload = JSON.stringify({
  eventId: 'EVT-12345',
  odds: 2.5,
  stake: 500,
  transId: 'TXN-SUCCESS-001',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/place-bet',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
};

console.log('\n🧪 TEST: Successful Bet (stake=500, MIN_STAKE=100)');
console.log('   Expected: SBO gets 100, Aggregator gets 400');
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
