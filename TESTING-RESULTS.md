# DoorKing 1830 Testing Results

## Device Information
- **Host**: 96.80.124.65
- **Port**: 1040
- **Master Code**: 1969
- **Model**: DoorKing 1830

## Test Results

### Connection Tests
✓ Device is reachable on port 1040
✓ Device is reachable on port 23
✗ No initial greeting or prompt from device
✗ Device does not respond to DoorKing 1812AP protocol commands

### Commands Tested (Port 1040)

#### Binary Protocol Commands (1812AP)
- Status Request: `0x01 0x10 0x03` → No response
- Open Gate: `0x01 0x11 0x05 0x01 0x80` → No response
- Close Gate: `0x01 0x11 0x05 0x00 0x80` → No response

#### Text-Based Commands
- `STATUS\r\n` → No response
- `1969\r\n` (master code) → No response

#### Simple Probes
- Single byte `0x01` → No response
- Single byte `0x00` → No response

## Analysis

The DoorKing 1830 uses a **different protocol** than the 1812AP model.

### Observations:
1. Device accepts TCP connections on both ports 1040 and 23
2. Device does not send any initial greeting or prompt
3. Device does not respond to any test commands
4. Connection remains open but silent

### Possible Explanations:
1. **Different Binary Protocol**: The 1830 may use different command bytes than 1812AP
2. **Authentication Required**: May need to send master code in a specific format first
3. **UDP Instead of TCP**: Some access control systems use UDP
4. **Proprietary Application Protocol**: May require specific initialization sequence
5. **Port 1040 is Web Interface**: Could be HTTP/WebSocket, not raw TCP

## Next Steps

### Option 1: Protocol Capture (Recommended)
Use Wireshark or tcpdump to capture traffic from the official DoorKing Remote Account Manager software:

```bash
# On Windows with Wireshark
1. Start Wireshark
2. Filter: tcp.port == 1040 or tcp.port == 23
3. Open Remote Account Manager
4. Connect to device
5. Perform operations (open gate, check status)
6. Analyze captured packets
```

### Option 2: Try Port 1040 as HTTP
The device might use a web interface:

```bash
curl http://96.80.124.65:1040
# or
curl http://96.80.124.65:1040/status
```

### Option 3: Contact DoorKing
Request protocol documentation:
- DoorKing Technical Support: https://www.doorking.com/tech-support/
- Phone: Check their website for support number
- Ask specifically for "TCP/IP protocol specification for DoorKing 1830"

### Option 4: Community Research
- Search for "DoorKing 1830 protocol" on forums
- Check Home Assistant community
- Look for security research papers
- Reddit: r/homeautomation, r/homeassistant

## Recommendations

Since the 1830 protocol is different from 1812AP:

1. **Capture the official software traffic** - This is the most reliable method
2. **Check if port 1040 is HTTP-based** - Try web browser or curl
3. **Verify the correct port** - Port 1040 is non-standard (1812AP uses 1030)
4. **Request documentation** - DoorKing may provide protocol specs to integrators

## Updated Protocol Implementation Needed

Once you capture the protocol, update `src/protocol.ts` with:
- Actual command bytes for DoorKing 1830
- Expected response formats
- Authentication sequence (if required)
- Status codes and their meanings

The current implementation in this repository is ready to use once the correct protocol is identified.
