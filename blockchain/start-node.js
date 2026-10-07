const { spawn } = require('child_process');
const http = require('http');

console.log('[Blockchain Container] Starting Hardhat node on 0.0.0.0:8545...');
const node = spawn('npx', ['hardhat', 'node', '--hostname', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
});

function checkNodeReady() {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 8545,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    (res) => {
      console.log('[Blockchain Container] Node is ready! Deploying TrustMesh.sol...');
      const deploy = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
        stdio: 'inherit',
        shell: true,
      });

      deploy.on('close', (code) => {
        console.log(`[Blockchain Container] Contract deployed (exit code ${code}). Blockchain node is running.`);
      });
    }
  );

  req.on('error', () => {
    setTimeout(checkNodeReady, 1000);
  });

  req.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }));
  req.end();
}

setTimeout(checkNodeReady, 2000);

node.on('close', (code) => {
  console.log(`Hardhat node exited with code ${code}`);
  process.exit(code);
});
