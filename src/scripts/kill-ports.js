/**
 * Utility: Kill any process occupying ports 3000, 4001, 4002.
 * Runs automatically before `npm run demo` to prevent EADDRINUSE errors.
 * Works on Windows (netstat + taskkill).
 */

const { execSync } = require('child_process');

const PORTS = [3000, 4001, 4002];

for (const port of PORTS) {
  try {
    // Find PIDs listening on this port
    const output = execSync(
      `netstat -ano | findstr "LISTENING" | findstr ":${port} "`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    // Extract unique PIDs from the last column
    const pids = [...new Set(
      output
        .split('\n')
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && pid !== '0' && /^\d+$/.test(pid))
    )];

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
        console.log(`✅ Killed PID ${pid} on port ${port}`);
      } catch {
        // Process may have already exited
      }
    }
  } catch {
    // No process on this port — nothing to kill
    console.log(`✅ Port ${port} is free`);
  }
}

console.log('🚀 All ports cleared — starting servers...\n');
