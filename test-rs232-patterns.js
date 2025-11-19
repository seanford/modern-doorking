#!/usr/bin/env node
/**
 * RS-232 Protocol Pattern Tester for DoorKing 1830
 *
 * Tests common RS-232 serial protocol patterns over TCP
 * Since port 1040 is RS-232 over TCP, we'll try various serial command formats
 */

const net = require('net');

const HOST = process.argv[2] || '96.80.124.65';
const PORT = parseInt(process.argv[3] || '1040');
const MASTER_CODE = process.argv[4] || '1969';

console.log('╔═════════════════════════════════════════════════════════════╗');
console.log('║     DoorKing RS-232 Pattern Tester                         ║');
console.log('╚═════════════════════════════════════════════════════════════╝\n');
console.log(`Target: ${HOST}:${PORT}`);
console.log(`Master Code: ${MASTER_CODE}\n`);

// Common RS-232 protocol patterns
const PATTERNS = [
  // 1. Plain master code (common in access control)
  {
    name: 'Plain Master Code',
    data: Buffer.from(`${MASTER_CODE}\r`),
    description: 'Master code with CR'
  },
  {
    name: 'Master Code + CRLF',
    data: Buffer.from(`${MASTER_CODE}\r\n`),
    description: 'Master code with CR+LF'
  },

  // 2. Login sequences
  {
    name: 'LOGIN Command',
    data: Buffer.from(`LOGIN ${MASTER_CODE}\r\n`),
    description: 'LOGIN with master code'
  },
  {
    name: 'USER Command',
    data: Buffer.from(`USER ${MASTER_CODE}\r\n`),
    description: 'USER authentication'
  },
  {
    name: 'PASS Command',
    data: Buffer.from(`PASS ${MASTER_CODE}\r\n`),
    description: 'PASS authentication'
  },

  // 3. Menu selection (common in serial devices)
  {
    name: 'Menu Option 1',
    data: Buffer.from('1\r'),
    description: 'Select menu option 1'
  },
  {
    name: 'Menu Option 2',
    data: Buffer.from('2\r'),
    description: 'Select menu option 2'
  },

  // 4. AT-style commands
  {
    name: 'AT Command',
    data: Buffer.from('AT\r'),
    description: 'Basic AT command'
  },
  {
    name: 'AT Status',
    data: Buffer.from('ATS\r'),
    description: 'AT status query'
  },

  // 5. Control characters
  {
    name: 'Ctrl+C (ETX)',
    data: Buffer.from([0x03]),
    description: 'End of text / Break'
  },
  {
    name: 'ESC',
    data: Buffer.from([0x1B]),
    description: 'Escape character'
  },
  {
    name: 'ENQ (Enquiry)',
    data: Buffer.from([0x05]),
    description: 'Enquiry for status'
  },
  {
    name: 'ACK',
    data: Buffer.from([0x06]),
    description: 'Acknowledge'
  },

  // 6. Text commands
  {
    name: 'STATUS Command',
    data: Buffer.from('STATUS\r\n'),
    description: 'Status query'
  },
  {
    name: 'HELP Command',
    data: Buffer.from('HELP\r\n'),
    description: 'Help/command list'
  },
  {
    name: 'INFO Command',
    data: Buffer.from('INFO\r\n'),
    description: 'System information'
  },
  {
    name: 'VER Command',
    data: Buffer.from('VER\r\n'),
    description: 'Version query'
  },

  // 7. DoorKing-specific attempts
  {
    name: 'DK Master Code Format',
    data: Buffer.from(`*01${MASTER_CODE}#\r`),
    description: 'DoorKing programming format'
  },
  {
    name: 'Pound Code',
    data: Buffer.from(`#${MASTER_CODE}\r`),
    description: 'Hash-prefixed master code'
  },
  {
    name: 'Star Code',
    data: Buffer.from(`*${MASTER_CODE}\r`),
    description: 'Star-prefixed master code'
  },

  // 8. Binary handshakes
  {
    name: 'XON',
    data: Buffer.from([0x11]),
    description: 'XON (resume transmission)'
  },
  {
    name: 'STX',
    data: Buffer.from([0x02]),
    description: 'Start of text'
  },
  {
    name: 'SOH',
    data: Buffer.from([0x01]),
    description: 'Start of heading'
  },

  // 9. Carriage return alone (prompts menu)
  {
    name: 'Just CR',
    data: Buffer.from('\r'),
    description: 'Single carriage return'
  },
  {
    name: 'Just LF',
    data: Buffer.from('\n'),
    description: 'Single line feed'
  },
  {
    name: 'Just CRLF',
    data: Buffer.from('\r\n'),
    description: 'CR+LF combo'
  },

  // 10. Empty/space (some devices respond to connection)
  {
    name: 'Space Character',
    data: Buffer.from(' '),
    description: 'Single space'
  },
  {
    name: 'Multiple Spaces',
    data: Buffer.from('   '),
    description: 'Three spaces'
  }
];

const results = [];
let currentTest = 0;

async function testPattern(pattern) {
  return new Promise((resolve) => {
    console.log(`\n${'─'.repeat(65)}`);
    console.log(`[${currentTest + 1}/${PATTERNS.length}] Testing: ${pattern.name}`);
    console.log(`Description: ${pattern.description}`);
    console.log(`Sending: ${pattern.data.toString('hex')} (${pattern.data.length} bytes)`);

    // Show ASCII if printable
    const ascii = pattern.data.toString('utf8').replace(/[\x00-\x1F\x7F]/g,
      c => `<0x${c.charCodeAt(0).toString(16).padStart(2,'0')}>`
    );
    console.log(`ASCII: ${ascii}`);

    const socket = new net.Socket();
    let response = Buffer.alloc(0);
    let gotResponse = false;

    socket.setTimeout(3000);

    socket.on('connect', () => {
      console.log('  ✓ Connected');
      socket.write(pattern.data);
      console.log('  ✓ Pattern sent');
    });

    socket.on('data', (data) => {
      gotResponse = true;
      response = Buffer.concat([response, data]);

      console.log(`  ✓✓✓ RESPONSE RECEIVED! ✓✓✓`);
      console.log(`  Length: ${data.length} bytes`);
      console.log(`  Hex: ${data.toString('hex')}`);
      console.log(`  Bytes: [${Array.from(data).join(', ')}]`);

      // Try ASCII
      const respAscii = data.toString('utf8').replace(/[\x00-\x1F\x7F]/g,
        c => `<${c.charCodeAt(0).toString(16).padStart(2,'0')}>`
      );
      console.log(`  ASCII: ${respAscii}`);

      // Try UTF-8
      try {
        const utf8 = data.toString('utf8');
        if (utf8 !== respAscii) {
          console.log(`  UTF-8: ${utf8}`);
        }
      } catch(e) {}
    });

    socket.on('timeout', () => {
      if (!gotResponse) {
        console.log('  ⏱ Timeout - No response');
      }
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.log(`  ✗ Error: ${err.message}`);
      socket.destroy();
    });

    socket.on('close', () => {
      console.log('  ⊗ Connection closed');

      results.push({
        name: pattern.name,
        success: gotResponse,
        response: response.toString('hex'),
        responseLength: response.length
      });

      resolve();
    });

    socket.connect(PORT, HOST);
  });
}

async function main() {
  console.log('Starting RS-232 pattern tests...\n');
  console.log('This will test various common serial protocol patterns.');
  console.log('Looking for ANY response from the device.\n');

  for (let i = 0; i < PATTERNS.length; i++) {
    currentTest = i;
    await testPattern(PATTERNS[i]);

    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('\n\n' + '═'.repeat(65));
  console.log('FINAL RESULTS');
  console.log('═'.repeat(65));

  const successful = results.filter(r => r.success);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Responses Received: ${successful.length}`);
  console.log(`No Response: ${results.length - successful.length}`);

  if (successful.length > 0) {
    console.log('\n✓✓✓ SUCCESS! Device responded to these patterns: ✓✓✓\n');

    successful.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   Response (${r.responseLength} bytes): ${r.response}`);

      // Try to decode response
      const buf = Buffer.from(r.response, 'hex');
      const ascii = buf.toString('utf8').replace(/[\x00-\x1F\x7F]/g,
        c => `<0x${c.charCodeAt(0).toString(16).padStart(2,'0')}>`
      );
      console.log(`   ASCII: ${ascii}`);
      console.log('');
    });

    console.log('\n' + '═'.repeat(65));
    console.log('NEXT STEPS:');
    console.log('═'.repeat(65));
    console.log('The device responded! Now we can:');
    console.log('1. Analyze the response format');
    console.log('2. Try follow-up commands based on the response');
    console.log('3. Implement the protocol in the application');
    console.log('4. Build command sequences for door control\n');

  } else {
    console.log('\n⚠ No responses received from any pattern');
    console.log('\nPossible reasons:');
    console.log('  1. Device requires specific initialization sequence');
    console.log('  2. Wrong baud rate setting (try 9600 vs 19200)');
    console.log('  3. Device uses completely custom protocol');
    console.log('  4. Need to configure TCP/IP adapter settings');
    console.log('\nRecommendation:');
    console.log('  → Capture traffic from Remote Account Manager with Wireshark');
    console.log('  → Contact DoorKing for protocol documentation\n');
  }

  console.log('═'.repeat(65) + '\n');
}

main().catch(console.error);
