#!/usr/bin/env node
/**
 * Standalone DoorKing Protocol Tester
 *
 * Usage: node test-doorking.js <host> <port> [master_code]
 * Example: node test-doorking.js ctetaft.dyndns.org 1040 1969
 */

const net = require('net');

const HOST = process.argv[2] || 'ctetaft.dyndns.org';
const PORT = parseInt(process.argv[3] || '1040');
const MASTER_CODE = process.argv[4] || '1969';

// Test commands
const TESTS = {
  'DoorKing 1812AP - Status Request': Buffer.from([0x01, 0x10, 0x03]),
  'DoorKing 1812AP - Open Gate': Buffer.from([0x01, 0x11, 0x05, 0x01, 0x80]),
  'DoorKing 1812AP - Close Gate': Buffer.from([0x01, 0x11, 0x05, 0x00, 0x80]),
  'Text - STATUS': Buffer.from('STATUS\r\n'),
  'Text - Master Code': Buffer.from(`${MASTER_CODE}\r\n`),
  'Simple Byte - 0x01': Buffer.from([0x01]),
  'Simple Byte - 0x00': Buffer.from([0x00]),
};

console.log('╔═════════════════════════════════════════════════════════════╗');
console.log('║         DoorKing Protocol Test Utility v1.0                ║');
console.log('╚═════════════════════════════════════════════════════════════╝\n');
console.log(`Target: ${HOST}:${PORT}`);
console.log(`Master Code: ${MASTER_CODE}\n`);

async function testCommand(name, command) {
  return new Promise((resolve) => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Testing: ${name}`);
    console.log(`Command: ${command.toString('hex')} [${Array.from(command).join(', ')}]`);

    const socket = new net.Socket();
    let response = Buffer.alloc(0);
    let connected = false;

    socket.setTimeout(2000);

    socket.on('connect', () => {
      connected = true;
      console.log('  ✓ Connected');
      socket.write(command);
      console.log('  ✓ Command sent');
    });

    socket.on('data', (data) => {
      response = Buffer.concat([response, data]);
      console.log(`  ✓ Response: ${data.toString('hex')}`);
      console.log(`    Bytes: [${Array.from(data).join(', ')}]`);
      console.log(`    Length: ${data.length} bytes`);

      // Try ASCII interpretation
      const ascii = data.toString('utf8').replace(/[\x00-\x1F\x7F]/g,
        c => `<${c.charCodeAt(0).toString(16).padStart(2,'0')}>`
      );
      if (ascii !== data.toString('hex')) {
        console.log(`    ASCII: ${ascii}`);
      }
    });

    socket.on('timeout', () => {
      console.log('  ⏱ Timeout');
      socket.destroy();
      resolve({ name, success: connected, response: response.toString('hex') });
    });

    socket.on('error', (err) => {
      console.log(`  ✗ Error: ${err.message}`);
      resolve({ name, success: false, error: err.message });
    });

    socket.on('close', () => {
      console.log('  ⊗ Connection closed');
      if (!socket.destroyed) {
        resolve({ name, success: connected, response: response.toString('hex') });
      }
    });

    socket.connect(PORT, HOST);
  });
}

async function main() {
  const results = [];

  // Test each command
  for (const [name, command] of Object.entries(TESTS)) {
    const result = await testCommand(name, command);
    results.push(result);
    await new Promise(r => setTimeout(r, 500)); // Delay between tests
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success && r.response);
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Successful Responses: ${successful.length}`);
  console.log(`Failed: ${results.length - successful.length}`);

  if (successful.length > 0) {
    console.log('\n✓ Working Commands:');
    successful.forEach(r => {
      console.log(`  • ${r.name}`);
      console.log(`    Response: ${r.response}`);
    });
  }

  // Protocol detection
  console.log('\n' + '═'.repeat(60));
  console.log('PROTOCOL ANALYSIS');
  console.log('═'.repeat(60));

  const statusTest = results.find(r => r.name.includes('Status Request'));
  if (statusTest && statusTest.response && statusTest.response.length === 14) {
    console.log('\n✓ Device uses DoorKing 1812AP protocol!');
    console.log('  7-byte status response detected');
    console.log(`  Response: ${statusTest.response}`);

    const responseBytes = Buffer.from(statusTest.response, 'hex');
    if (responseBytes.toString('hex') === '10100780008000') {
      console.log('  Status: GATE OPEN');
    } else if (responseBytes.toString('hex') === '10100700000000') {
      console.log('  Status: GATE CLOSED');
    } else {
      console.log('  Status: UNKNOWN - New pattern detected!');
    }
  } else if (successful.length > 0) {
    console.log('\n⚠ Device uses a non-standard protocol');
    console.log('  Responses received but not matching 1812AP pattern');
    console.log('  You may need to update the protocol implementation');
  } else {
    console.log('\n⚠ Unable to determine protocol');
    console.log('  No responses received from any test command');
    console.log('  Possible reasons:');
    console.log('  - Wrong port number');
    console.log('  - Device requires authentication first');
    console.log('  - Device uses a completely different protocol');
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

main().catch(console.error);
