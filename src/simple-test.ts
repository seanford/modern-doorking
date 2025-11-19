/**
 * Simple connection test with better error reporting
 */

import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

const HOST = process.argv[2] || 'ctetaft.dyndns.org';
const PORT = parseInt(process.argv[3] || '1040');

async function testConnection() {
  console.log(`\nTesting connection to ${HOST}:${PORT}\n`);
  console.log('Step 1: DNS Resolution');
  console.log('-'.repeat(50));

  try {
    const resolved = await lookup(HOST);
    console.log(`✓ Hostname resolved to: ${resolved.address}`);
    console.log(`  Family: IPv${resolved.family}`);
  } catch (error: any) {
    console.error(`✗ DNS resolution failed: ${error.message}`);
    console.error(`\nPossible solutions:`);
    console.error(`  1. Verify the hostname is correct`);
    console.error(`  2. Try using an IP address directly:`);
    console.error(`     npm run test-device <IP_ADDRESS> ${PORT}`);
    console.error(`  3. Check if your DynDNS account is active`);
    console.error(`  4. Ensure internet connectivity\n`);
    return;
  }

  console.log('\nStep 2: TCP Connection');
  console.log('-'.repeat(50));

  const socket = new net.Socket();
  socket.setTimeout(5000);

  socket.on('connect', () => {
    console.log(`✓ Connected to ${HOST}:${PORT}`);
    console.log(`  Local: ${socket.localAddress}:${socket.localPort}`);
    console.log(`  Remote: ${socket.remoteAddress}:${socket.remotePort}`);
    console.log('\n✓ Device is reachable and ready to test!');
    socket.end();
  });

  socket.on('timeout', () => {
    console.error('✗ Connection timeout');
    console.error('  The port is not responding (firewall or wrong port?)');
    socket.destroy();
  });

  socket.on('error', (error: Error) => {
    console.error(`✗ Connection error: ${error.message}`);
    socket.destroy();
  });

  socket.on('close', () => {
    console.log('\nConnection test complete.\n');
  });

  socket.connect(PORT, HOST);
}

testConnection().catch(console.error);
