/**
 * Test utility to probe DoorKing device and analyze protocol
 */

import * as net from 'net';
import * as dotenv from 'dotenv';

dotenv.config();

const HOST = process.env.DOORKING_HOST || 'localhost';
const PORT = parseInt(process.env.DOORKING_PORT || '1030');
const MASTER_CODE = process.env.DOORKING_PASSWORD || '1969';

// Test commands to try
const TEST_COMMANDS = {
  // DoorKing 1812AP protocol commands
  STATUS_REQUEST: Buffer.from([0x01, 0x10, 0x03]),
  OPEN_GATE: Buffer.from([0x01, 0x11, 0x05, 0x01, 0x80]),
  CLOSE_GATE: Buffer.from([0x01, 0x11, 0x05, 0x00, 0x80]),

  // Alternative possible commands
  SIMPLE_STATUS: Buffer.from([0x01]),
  QUERY: Buffer.from([0x00, 0x01, 0x02]),

  // Text-based attempts
  TEXT_STATUS: Buffer.from('STATUS\r\n'),
  TEXT_LOGIN: Buffer.from(`${MASTER_CODE}\r\n`),
};

interface TestResult {
  command: string;
  sent: string;
  received: string;
  receivedHex: string;
  success: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Test a single command
 */
async function testCommand(name: string, command: Buffer): Promise<TestResult> {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${name}`);
    console.log(`Command (hex): ${command.toString('hex')}`);
    console.log(`Command (bytes): [${Array.from(command).join(', ')}]`);

    const socket = new net.Socket();
    let responseData = Buffer.alloc(0);
    let resolved = false;

    socket.setTimeout(3000);

    socket.on('connect', () => {
      console.log('✓ Connected to device');
      socket.write(command);
      console.log('✓ Command sent');
    });

    socket.on('data', (data: Buffer) => {
      responseData = Buffer.concat([responseData, data]);
      console.log(`✓ Received ${data.length} bytes`);
      console.log(`  Hex: ${data.toString('hex')}`);
      console.log(`  Dec: [${Array.from(data).join(', ')}]`);

      // Try to interpret as ASCII
      const ascii = data.toString('utf8').replace(/[\x00-\x1F\x7F]/g, (char) =>
        `<0x${char.charCodeAt(0).toString(16).padStart(2, '0')}>`
      );
      console.log(`  ASCII: ${ascii}`);
    });

    socket.on('timeout', () => {
      console.log('⏱ Timeout (no more data)');
      socket.destroy();

      if (!resolved) {
        resolved = true;
        resolve({
          command: name,
          sent: command.toString('hex'),
          received: responseData.toString('utf8'),
          receivedHex: responseData.toString('hex'),
          success: responseData.length > 0
        });
      }
    });

    socket.on('error', (error: Error) => {
      console.log(`✗ Error: ${error.message}`);

      if (!resolved) {
        resolved = true;
        resolve({
          command: name,
          sent: command.toString('hex'),
          received: '',
          receivedHex: '',
          success: false,
          error: error.message
        });
      }
    });

    socket.on('close', () => {
      console.log('⊗ Connection closed');

      if (!resolved) {
        resolved = true;
        resolve({
          command: name,
          sent: command.toString('hex'),
          received: responseData.toString('utf8'),
          receivedHex: responseData.toString('hex'),
          success: responseData.length > 0
        });
      }
    });

    socket.connect(PORT, HOST);
  });
}

/**
 * Test basic connectivity
 */
async function testConnectivity(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('CONNECTIVITY TEST');
  console.log('='.repeat(60));
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);
  console.log(`Master Code: ${MASTER_CODE}`);

  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on('connect', () => {
      console.log('✓ Successfully connected to device!');
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log('✗ Connection timeout');
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (error: Error) => {
      console.log(`✗ Connection error: ${error.message}`);
      resolve(false);
    });

    socket.connect(PORT, HOST);
  });
}

/**
 * Main test execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     DoorKing Protocol Test Utility                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Test connectivity first
  const canConnect = await testConnectivity();

  if (!canConnect) {
    console.error('\n✗ Cannot connect to device. Please check:');
    console.error('  - Host is correct and reachable');
    console.error('  - Port is open and not firewalled');
    console.error('  - Device is powered on');
    process.exit(1);
  }

  // Test each command
  console.log('\n' + '='.repeat(60));
  console.log('PROTOCOL COMMAND TESTS');
  console.log('='.repeat(60));

  for (const [name, command] of Object.entries(TEST_COMMANDS)) {
    const result = await testCommand(name, command);
    results.push(result);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);

  console.log('\n' + 'DETAILED RESULTS:');
  console.log('-'.repeat(60));

  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.command}`);
    console.log(`   Sent: ${result.sent}`);
    if (result.success) {
      console.log(`   ✓ Response received (${result.receivedHex.length / 2} bytes)`);
      console.log(`   Hex: ${result.receivedHex}`);
      if (result.receivedHex.length <= 40) {
        console.log(`   Dec: [${Buffer.from(result.receivedHex, 'hex').join(', ')}]`);
      }
    } else {
      console.log(`   ✗ ${result.error || 'No response'}`);
    }
  });

  // Identify working protocol
  console.log('\n\n' + '='.repeat(60));
  console.log('PROTOCOL ANALYSIS');
  console.log('='.repeat(60));

  const statusResult = results.find(r => r.command === 'STATUS_REQUEST');
  if (statusResult && statusResult.success && statusResult.receivedHex.length === 14) {
    console.log('✓ Device appears to use DoorKing 1812AP protocol');
    console.log('  Status response is 7 bytes as expected');
    console.log(`  Response: ${statusResult.receivedHex}`);
  } else if (results.some(r => r.success)) {
    console.log('⚠ Device uses a different protocol');
    console.log('  Successful responses detected but not matching 1812AP pattern');
    console.log('  Review the responses above to identify the protocol');
  } else {
    console.log('⚠ No successful responses received');
    console.log('  Device may use:');
    console.log('  - A different binary protocol');
    console.log('  - Text-based protocol');
    console.log('  - Require authentication first');
    console.log('  - Be listening on a different port');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
