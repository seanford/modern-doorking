/**
 * Modern DoorKing Interface Server
 *
 * Express server with REST API and WebSocket support
 */

import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { DoorKingClient } from './doorking-client';
import { DoorKingConfig, AccessCode } from './types';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// DoorKing client instance
let doorkingClient: DoorKingClient | null = null;
const connectedClients = new Set<WebSocket>();

// Initialize DoorKing client
function initializeDoorKingClient(): DoorKingClient {
  const config: DoorKingConfig = {
    host: process.env.DOORKING_HOST || '192.168.1.40',
    port: parseInt(process.env.DOORKING_PORT || '23'),
    username: process.env.DOORKING_USERNAME || 'admin',
    password: process.env.DOORKING_PASSWORD || 'admin',
    timeout: 5000
  };

  const client = new DoorKingClient(config);

  // Event handlers
  client.on('connected', () => {
    broadcast({ type: 'status', data: { connected: true } });
  });

  client.on('authenticated', () => {
    broadcast({ type: 'status', data: { authenticated: true } });
  });

  client.on('disconnected', () => {
    broadcast({ type: 'status', data: { connected: false, authenticated: false } });
  });

  client.on('error', (error: Error) => {
    broadcast({ type: 'error', data: { message: error.message } });
  });

  client.on('response', (response: any) => {
    broadcast({ type: 'response', data: response });
  });

  return client;
}

// Broadcast to all connected WebSocket clients
function broadcast(message: any): void {
  const data = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  connectedClients.add(ws);

  // Send current status on connection
  if (doorkingClient) {
    ws.send(JSON.stringify({
      type: 'status',
      data: doorkingClient.getStatus()
    }));
  }

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// REST API Routes

/**
 * GET / - Serve the web interface
 */
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * POST /api/connect - Connect to DoorKing device
 */
app.post('/api/connect', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      doorkingClient = initializeDoorKingClient();
    }

    await doorkingClient.connect();
    const authenticated = await doorkingClient.login();

    res.json({
      success: true,
      authenticated,
      status: doorkingClient.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    });
  }
});

/**
 * POST /api/disconnect - Disconnect from DoorKing device
 */
app.post('/api/disconnect', (req: Request, res: Response) => {
  if (doorkingClient) {
    doorkingClient.disconnect();
  }

  res.json({ success: true });
});

/**
 * GET /api/status - Get connection status
 */
app.get('/api/status', (req: Request, res: Response) => {
  const status = doorkingClient ? doorkingClient.getStatus() : {
    connected: false,
    authenticated: false
  };

  res.json(status);
});

/**
 * POST /api/door/open - Open door
 */
app.post('/api/door/open', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const { doorId = 1 } = req.body;
    const response = await doorkingClient.openDoor(doorId);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open door'
    });
  }
});

/**
 * POST /api/door/lock - Lock door
 */
app.post('/api/door/lock', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const { doorId = 1 } = req.body;
    const response = await doorkingClient.lockDoor(doorId);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to lock door'
    });
  }
});

/**
 * POST /api/door/unlock - Unlock door
 */
app.post('/api/door/unlock', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const { doorId = 1 } = req.body;
    const response = await doorkingClient.unlockDoor(doorId);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlock door'
    });
  }
});

/**
 * GET /api/door/status - Get door status
 */
app.get('/api/door/status', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const response = await doorkingClient.getDoorStatus();
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get door status'
    });
  }
});

/**
 * POST /api/codes/add - Add access code
 */
app.post('/api/codes/add', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const accessCode: AccessCode = req.body;
    const response = await doorkingClient.addAccessCode(accessCode);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add access code'
    });
  }
});

/**
 * DELETE /api/codes/:code - Delete access code
 */
app.delete('/api/codes/:code', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const { code } = req.params;
    const response = await doorkingClient.deleteAccessCode(code);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete access code'
    });
  }
});

/**
 * GET /api/codes - List all access codes
 */
app.get('/api/codes', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const response = await doorkingClient.listAccessCodes();
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list access codes'
    });
  }
});

/**
 * GET /api/logs - Get access logs
 */
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const count = parseInt(req.query.count as string) || 100;
    const response = await doorkingClient.getAccessLogs(count);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get access logs'
    });
  }
});

/**
 * GET /api/system/info - Get system information
 */
app.get('/api/system/info', async (req: Request, res: Response) => {
  try {
    if (!doorkingClient) {
      throw new Error('Not connected to DoorKing device');
    }

    const response = await doorkingClient.getSystemInfo();
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system info'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚪 Modern DoorKing Interface running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  if (doorkingClient) {
    doorkingClient.disconnect();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
