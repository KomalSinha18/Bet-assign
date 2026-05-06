/**
 * Run all demo scenarios sequentially.
 */

const { execSync } = require('child_process');

const tests = [
  { name: 'Success Scenario', script: 'src/demo/testSuccess.js' },
  { name: 'SBO Failure', script: 'src/demo/testSboFail.js' },
  { name: 'Aggregator Failure', script: 'src/demo/testAggregatorFail.js' },
  { name: 'Validation Tests', script: 'src/demo/testValidation.js' },
];

console.log('╔══════════════════════════════════════════════╗');
console.log('║   Bet-Split Proxy — Full Demo Suite          ║');
console.log('╚══════════════════════════════════════════════╝\n');
console.log('⚠️  Make sure all 3 servers are running:');
console.log('   npm run demo\n');
console.log('═'.repeat(50));

for (const test of tests) {
  console.log(`\n▶ ${test.name}`);
  try {
    execSync(`node ${test.script}`, { stdio: 'inherit', cwd: process.cwd() });
  } catch {
    console.error(`   ❌ ${test.name} failed`);
  }
}

console.log('\n' + '═'.repeat(50));
console.log('✅ All demos completed\n');
