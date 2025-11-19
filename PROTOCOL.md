# DoorKing Protocol Documentation

This document details the communication protocol used with DoorKing devices, based on reverse engineering of the DoorKing 1812AP and research into the 1830 series.

## Protocol Research

### Sources

1. **DoorKing 1812AP Reverse Engineering**
   - Repository: https://github.com/cameronr/doorking-ha
   - Method: Network traffic capture from official Windows client
   - Status: Working implementation for 1812AP model

2. **DoorKing 1830 Series**
   - Official documentation: Limited/proprietary
   - Protocol may differ from 1812AP
   - Requires validation with actual hardware

## Connection Details

### Gate Control Protocol (Port 1030)

This protocol is used for basic gate/door control operations.

- **Transport**: TCP/IP
- **Port**: 1030
- **Authentication**: None required for basic operations
- **Message Format**: Binary

### Management Protocol (Port 23)

This protocol is used for advanced features like access code management.

- **Transport**: TCP/IP over RS-232 converter
- **Port**: 23 (typical RS-232 bridge port)
- **Authentication**: Username/password required
- **Message Format**: Unknown (requires further research)

## Binary Protocol Commands (Port 1030)

### Status Request

**Command Bytes**: `0x01 0x10 0x03`

**Response**: 7 bytes

**Gate Open Response**:
```
0x10 0x10 0x07 0x80 0x00 0x80 0x00
```

**Gate Closed Response**:
```
0x10 0x10 0x07 0x00 0x00 0x00 0x00
```

### Open Gate

**Command Bytes**: `0x01 0x11 0x05 0x01 0x80`

**Transmission**: Sent 3 times consecutively for reliability

**Response**: None (connection closed after sending)

### Close Gate

**Command Bytes**: `0x01 0x11 0x05 0x00 0x80`

**Transmission**: Sent 3 times consecutively for reliability

**Response**: None (connection closed after sending)

## Protocol Analysis

### Byte Breakdown

#### Status Request: `0x01 0x10 0x03`
- `0x01`: Start marker / command prefix
- `0x10`: Command ID (status query)
- `0x03`: Command length or terminator

#### Open Command: `0x01 0x11 0x05 0x01 0x80`
- `0x01`: Start marker / command prefix
- `0x11`: Command ID (gate control)
- `0x05`: Payload length
- `0x01`: Action (open)
- `0x80`: Checksum or terminator

#### Close Command: `0x01 0x11 0x05 0x00 0x80`
- `0x01`: Start marker / command prefix
- `0x11`: Command ID (gate control)
- `0x05`: Payload length
- `0x00`: Action (close)
- `0x80`: Checksum or terminator

#### Status Response (Open): `0x10 0x10 0x07 0x80 0x00 0x80 0x00`
- `0x10 0x10`: Response header
- `0x07`: Length
- `0x80 0x00 0x80 0x00`: Status flags (bit 7 set indicates open)

#### Status Response (Closed): `0x10 0x10 0x07 0x00 0x00 0x00 0x00`
- `0x10 0x10`: Response header
- `0x07`: Length
- `0x00 0x00 0x00 0x00`: Status flags (all zeros indicates closed)

## Communication Pattern

### Successful Status Check
```
Client → Server: 0x01 0x10 0x03
Server → Client: 0x10 0x10 0x07 [status bytes]
Client closes connection
```

### Gate Control
```
Client → Server: 0x01 0x11 0x05 0x01 0x80
Client → Server: 0x01 0x11 0x05 0x01 0x80  (repeat)
Client → Server: 0x01 0x11 0x05 0x01 0x80  (repeat)
Client closes connection
```

## Implementation Notes

### Reliability

Commands are sent **3 times** in succession to ensure delivery. This suggests:
- No acknowledgment mechanism in the protocol
- UDP-like "fire and forget" over TCP
- Device may process duplicate commands idempotently

### Timeouts

Based on the Python implementation:
- Connection timeout: 5 seconds
- Retry attempts: 5 times with 1-second delays

### Error Handling

- **Connection errors**: OSError, socket.gaierror
- **Timeout errors**: TimeoutError
- **Unexpected responses**: Compare byte-for-byte with expected patterns

## Advanced Features (Unimplemented)

The following features require the management protocol:

### Access Code Management
- Add user codes
- Delete user codes
- List all codes
- Modify code permissions

### Access Logs
- Download entry logs
- Real-time log streaming
- Log filtering

### System Configuration
- Device settings
- Network configuration
- Time synchronization

### Required Research

To implement these features, you need to:

1. **Capture RS-232 traffic** from Remote Account Manager software
2. **Identify command structures** for each operation
3. **Document authentication flow** if required
4. **Test on actual hardware** to verify commands

## Protocol Variations

### DoorKing 1812AP
- **Confirmed working** with documented protocol
- Binary commands on port 1030

### DoorKing 1830 Series
- **Assumed similar** to 1812AP for gate control
- **Not verified** - may have variations
- Management features may use different protocol

### DoorKing 1833/1834/1835/1837/1838
- Part of 1830 series family
- Likely share similar protocol
- May have model-specific commands

## Reverse Engineering Guide

If the protocol doesn't work with your device:

### 1. Setup Wireshark

```bash
# Install Wireshark
sudo apt-get install wireshark

# Capture traffic on network interface
sudo wireshark
```

### 2. Capture Official Software Traffic

1. Install DoorKing Remote Account Manager
2. Start Wireshark capture
3. Connect to device using official software
4. Perform operations (open gate, add code, etc.)
5. Stop capture and analyze

### 3. Analyze Packets

Look for:
- **TCP handshake** to identify port
- **Repeated patterns** in commands
- **Binary data** in payload
- **Response formats**

### 4. Test Commands

Use netcat or Python to send raw bytes:

```bash
# Using netcat
echo -ne '\x01\x10\x03' | nc <IP> 1030

# Using Python
python3 -c "import socket; s=socket.socket(); s.connect(('<IP>', 1030)); s.send(b'\x01\x10\x03'); print(s.recv(1024).hex())"
```

### 5. Document Findings

Update this document and `src/protocol.ts` with your findings.

## Security Considerations

### Port 1030 (Gate Control)
- **No authentication** required
- **No encryption** - commands sent in clear
- **Network access** = physical access to gate
- **Recommendation**: Isolate on secure VLAN

### Port 23 (Management)
- May require **username/password**
- Credentials often **default** (admin/admin)
- **Change immediately** on production systems

### Best Practices

1. **Network Isolation**: Place DoorKing devices on isolated network segment
2. **Firewall Rules**: Restrict access to authorized IPs only
3. **VPN Access**: Require VPN for remote management
4. **Monitoring**: Log all access attempts
5. **Credential Rotation**: Change default passwords immediately

## Contributing

If you discover new protocol details or implement additional features:

1. Document your findings in this file
2. Update `src/protocol.ts` with implementation
3. Add test cases if possible
4. Submit a pull request

## References

- DoorKing 1812AP Home Assistant Integration: https://github.com/cameronr/doorking-ha
- DoorKing Official Site: https://www.doorking.com
- DoorKing Remote Account Manager Manual: https://www.doorking.com/wp-content/uploads/2013/09/1835-066-K-4-10_V6-2c.pdf
- Security Research (Medium): "Doorking Around" by @rem1nd

## Disclaimer

This protocol documentation is based on reverse engineering and community research. It is not officially endorsed or supported by DoorKing, Inc. Use at your own risk and always follow manufacturer guidelines for your specific device model.
