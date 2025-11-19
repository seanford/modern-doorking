#!/usr/bin/env node
/**
 * Listen for any data from DoorKing device
 * This will help identify if the device sends an initial greeting or prompt
 */

const net = require('net');

const HOST = process.argv[2] || '96.80.124.65';
const PORT = parseInt(process.argv[3] || '1040');

console.log(`\n╔════════════════════════════════════════════════════════╗`);
console.log(`║  DoorKing Passive Listener - Wait for Device Data    ║`);
console.log(`╚════════════════════════════════════════════════════════╝\n`);
console.log(`Connecting to: ${HOST}:${PORT}`);
console.log(`Waiting for device to send data...\n`);

const socket = new net.Socket();
let dataReceived = false;

socket.setTimeout(10000); // 10 second timeout

socket.on('connect', () => {
  console.log('✓ Connected to device');
  console.log('  Listening for any data from device...');
  console.log('  (Will wait 10 seconds)\n');
});

socket.on('data', (data) => {
  dataReceived = true;
  console.log('✓ Device sent data!');
  console.log(`  Length: ${data.length} bytes`);
  console.log(`  Hex: ${data.toString('hex')}`);
  console.log(`  Dec: [${Array.from(data).join(', ')}]`);

  // Try to interpret as ASCII
  const ascii = data.toString('utf8').replace(/[\x00-\x1F\x7F]/g, (char) => {
    const code = char.charCodeAt(0);
    return `<0x${code.toString(16).padStart(2, '0')}>`;
  });
  console.log(`  ASCII: ${ascii}`);

  // Check for common patterns
  if (data.toString().includes('Password') || data.toString().includes('password')) {
    console.log('\n  → Device appears to be asking for a password!');
  }
  if (data.toString().includes('Login') || data.toString().includes('login')) {
    console.log('\n  → Device appears to be showing a login prompt!');
  }
  if (data.toString().includes('>') || data.toString().includes('#')) {
    console.log('\n  → Device appears to be showing a command prompt!');
  }
});

socket.on('timeout', () => {
  if (!dataReceived) {
    console.log('✗ Timeout - No data received from device');
    console.log('  Device did not send any initial greeting or prompt');
    console.log('\n  This suggests:');
    console.log('  - Device waits for client to send first');
    console.log('  - May need specific command to initiate');
    console.log('  - Could be using a challenge-response protocol');
  }
  socket.destroy();
});

socket.on('error', (error) => {
  console.error(`✗ Connection error: ${error.message}`);
  socket.destroy();
});

socket.on('close', () => {
  console.log('\n⊗ Connection closed');

  if (!dataReceived) {
    console.log('\nNext steps:');
    console.log('  1. Check official DoorKing documentation for port 1040');
    console.log('  2. Try port 23 (standard RS-232 management port)');
    console.log('  3. Use Wireshark to capture traffic from official software');
    console.log('  4. Contact DoorKing support for protocol specification\n');
  }
});

socket.connect(PORT, HOST);
