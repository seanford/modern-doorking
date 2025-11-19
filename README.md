# Modern DoorKing Interface

A modern web-based interface for controlling and managing DoorKing 1830 access control systems via TCP/IP. This application replaces the outdated software with a clean, responsive web interface.

## Features

- **Real-time TCP Communication**: Direct connection to DoorKing 1830 devices over TCP/IP
- **Modern Web Interface**: Clean, responsive UI that works on desktop and mobile
- **Door Control**: Open, lock, and unlock doors remotely
- **Access Code Management**: Add, delete, and list access codes
- **Access Logs**: View and monitor entry/exit logs
- **System Information**: View device status and system information
- **Real-time Updates**: WebSocket support for live status updates
- **RESTful API**: Complete REST API for integration with other systems

## Architecture

```
┌─────────────────┐
│  Web Browser    │
│  (Frontend)     │
└────────┬────────┘
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│  Express Server │
│  (Backend)      │
└────────┬────────┘
         │ TCP
         │
┌────────▼────────┐
│  DoorKing 1830  │
│  Device         │
└─────────────────┘
```

### Technology Stack

- **Backend**: Node.js with TypeScript, Express, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Protocol**: TCP/IP communication with custom protocol handler
- **Real-time**: WebSocket for live updates

## Installation

### Prerequisites

- Node.js 18+ and npm
- Access to a DoorKing 1830 device with TCP/IP connectivity
- Network access to the DoorKing device

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd modern-doorking
```

2. Install dependencies:
```bash
npm install
```

3. Configure the application:
```bash
cp .env.example .env
```

4. Edit `.env` file with your DoorKing device settings:
```env
DOORKING_HOST=192.168.1.40      # Your DoorKing device IP
DOORKING_PORT=23                 # TCP port (usually 23)
DOORKING_USERNAME=admin          # Device username
DOORKING_PASSWORD=admin          # Device password
PORT=3000                        # Web server port
```

## Usage

### Development Mode

Run the application in development mode with auto-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

1. Build the TypeScript code:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Web Interface

Access the web interface at `http://localhost:3000` (or your configured port).

### Main Features

1. **Connection Panel**: Connect/disconnect to the DoorKing device
2. **Door Control**: Three buttons for door operations:
   - Open Door
   - Lock Door
   - Unlock Door

3. **Access Code Management**:
   - Add new access codes with optional name and unit
   - View all existing codes
   - Delete access codes

4. **Access Logs**:
   - View recent access events
   - Filter by count (50, 100, 200 entries)
   - See timestamps and access details

5. **System Information**:
   - Device model and version
   - Serial number
   - System uptime

6. **Activity Log**:
   - Real-time application activity
   - Color-coded messages (success, error, info)

## REST API

The application provides a complete REST API for programmatic access.

### Connection

**POST** `/api/connect` - Connect to DoorKing device
```json
Response:
{
  "success": true,
  "authenticated": true,
  "status": {
    "connected": true,
    "authenticated": true,
    "connectedAt": "2025-11-19T10:30:00.000Z"
  }
}
```

**POST** `/api/disconnect` - Disconnect from device

**GET** `/api/status` - Get connection status

### Door Control

**POST** `/api/door/open` - Open door
```json
Request body:
{
  "doorId": 1
}
```

**POST** `/api/door/lock` - Lock door

**POST** `/api/door/unlock` - Unlock door

**GET** `/api/door/status` - Get door status

### Access Codes

**POST** `/api/codes/add` - Add access code
```json
Request body:
{
  "code": "1234",
  "name": "John Doe",
  "unit": "101",
  "enabled": true
}
```

**GET** `/api/codes` - List all access codes

**DELETE** `/api/codes/:code` - Delete access code

### Logs

**GET** `/api/logs?count=100` - Get access logs

### System

**GET** `/api/system/info` - Get system information

## Protocol Implementation

The DoorKing 1830 uses a proprietary protocol. The current implementation in `src/protocol.ts` uses a **placeholder format** that should be updated with the actual DoorKing protocol specification.

### Updating the Protocol

1. Obtain the official DoorKing 1830 protocol documentation
2. Update `src/protocol.ts` with actual command formats:
   - `encodeCommand()` - Convert commands to device format
   - `decodeResponse()` - Parse device responses
   - `createLoginCommand()` - Implement actual login sequence
   - Other command methods

3. Common protocol formats to check:
   - Binary protocol with STX/ETX delimiters
   - ASCII text commands with CR/LF terminators
   - Length-prefixed messages
   - Checksum/CRC validation

### Example Protocol Formats

The DoorKing 1830 may use formats similar to:

```
Text-based:
<STX>COMMAND:PARAM1:PARAM2<ETX><CR><LF>

Binary:
[STX][CMD][LEN][DATA...][CHECKSUM][ETX]
```

Refer to your DoorKing documentation for the exact format.

## Project Structure

```
modern-doorking/
├── src/
│   ├── server.ts           # Express server and API routes
│   ├── doorking-client.ts  # TCP client for DoorKing device
│   ├── protocol.ts         # Protocol encoding/decoding
│   └── types.ts            # TypeScript type definitions
├── public/
│   ├── index.html          # Web interface
│   ├── style.css           # Styling
│   └── app.js              # Frontend JavaScript
├── dist/                   # Compiled TypeScript output
├── package.json
├── tsconfig.json
└── .env                    # Configuration (create from .env.example)
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Adding New Features

1. **New API Endpoint**: Add route in `src/server.ts`
2. **New Command**: Add to `CommandType` enum in `src/types.ts` and implement in `src/protocol.ts`
3. **Frontend Feature**: Update `public/index.html` and `public/app.js`

## Troubleshooting

### Cannot Connect to Device

1. Verify network connectivity: `ping <DOORKING_HOST>`
2. Check if TCP port is accessible: `telnet <DOORKING_HOST> <PORT>`
3. Verify credentials in `.env` file
4. Check DoorKing device network settings

### Authentication Failed

1. Verify username and password in `.env`
2. Check if device requires specific login sequence
3. Review protocol implementation in `src/protocol.ts`

### Commands Not Working

1. The protocol implementation is a placeholder
2. Update `src/protocol.ts` with actual DoorKing commands
3. Contact DoorKing for protocol documentation
4. Use packet capture (Wireshark) to reverse engineer protocol

## Security Considerations

- Change default credentials immediately
- Use HTTPS in production (add reverse proxy like nginx)
- Implement authentication for web interface
- Restrict network access to authorized IPs
- Use environment variables for sensitive data
- Never commit `.env` file to version control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built for DoorKing 1830 series access control systems
- Designed to replace outdated legacy software with modern web technology

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact DoorKing for protocol documentation
- Review the code comments for implementation details

---

**Note**: This software is not officially affiliated with or endorsed by DoorKing, Inc. It is an independent implementation for interfacing with DoorKing 1830 devices. Always refer to official DoorKing documentation and follow their guidelines.
