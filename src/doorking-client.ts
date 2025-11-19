/**
 * DoorKing 1830 TCP Client
 *
 * Manages TCP connection and communication with DoorKing 1830 device
 */

import * as net from 'net';
import { EventEmitter } from 'events';
import {
  DoorKingConfig,
  ConnectionStatus,
  Command,
  CommandResponse,
  CommandType,
  AccessCode,
  AccessLog,
  DoorStatus,
  SystemInfo
} from './types';
import { DoorKingProtocol } from './protocol';

export class DoorKingClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: DoorKingConfig;
  private status: ConnectionStatus;
  private responseBuffer: Buffer = Buffer.alloc(0);
  private commandQueue: Array<{
    command: Command;
    resolve: (response: CommandResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private processingCommand = false;

  constructor(config: DoorKingConfig) {
    super();
    this.config = {
      timeout: 5000,
      ...config
    };
    this.status = {
      connected: false,
      authenticated: false
    };
  }

  /**
   * Connect to the DoorKing device
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.status.connected) {
        return resolve();
      }

      this.socket = new net.Socket();
      this.socket.setTimeout(this.config.timeout!);

      this.socket.on('connect', () => {
        this.status.connected = true;
        this.status.connectedAt = new Date();
        this.emit('connected');
        console.log(`Connected to DoorKing at ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (error: Error) => {
        this.status.lastError = error.message;
        this.emit('error', error);
        console.error('DoorKing connection error:', error.message);
        reject(error);
      });

      this.socket.on('close', () => {
        this.status.connected = false;
        this.status.authenticated = false;
        this.emit('disconnected');
        console.log('Disconnected from DoorKing');
      });

      this.socket.on('timeout', () => {
        const error = new Error('Connection timeout');
        this.status.lastError = error.message;
        this.emit('timeout');
        this.socket?.destroy();
        reject(error);
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * Authenticate with the DoorKing device
   */
  async login(): Promise<boolean> {
    if (!this.status.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const loginBuffer = DoorKingProtocol.createLoginCommand(
        this.config.username,
        this.config.password
      );

      const timeoutId = setTimeout(() => {
        reject(new Error('Login timeout'));
      }, this.config.timeout);

      this.socket!.write(loginBuffer, (error) => {
        if (error) {
          clearTimeout(timeoutId);
          this.status.lastError = error.message;
          reject(error);
          return;
        }
      });

      // Listen for response
      const responseHandler = (data: Buffer) => {
        clearTimeout(timeoutId);
        const response = data.toString('utf8');

        if (DoorKingProtocol.isLoginSuccessful(response)) {
          this.status.authenticated = true;
          this.emit('authenticated');
          console.log('Successfully authenticated to DoorKing');
          resolve(true);
        } else {
          this.status.lastError = 'Authentication failed';
          this.emit('authFailed');
          resolve(false);
        }

        this.socket!.removeListener('data', responseHandler);
      };

      this.socket!.once('data', responseHandler);
    });
  }

  /**
   * Disconnect from the device
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.status.connected = false;
    this.status.authenticated = false;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Handle incoming data from the device
   */
  private handleData(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // Check if we have a complete message (looking for ETX)
    const etxIndex = this.responseBuffer.indexOf(0x03);
    if (etxIndex !== -1) {
      const messageBuffer = this.responseBuffer.slice(0, etxIndex + 1);
      this.responseBuffer = this.responseBuffer.slice(etxIndex + 1);

      const response = DoorKingProtocol.decodeResponse(messageBuffer);
      this.emit('response', response);

      // Process queued command
      if (this.commandQueue.length > 0) {
        const current = this.commandQueue.shift();
        if (current) {
          current.resolve(response);
        }
      }

      this.processingCommand = false;
      this.processQueue();
    }
  }

  /**
   * Send a command to the device
   */
  async sendCommand(command: Command): Promise<CommandResponse> {
    if (!this.status.connected || !this.status.authenticated) {
      throw new Error('Not connected or authenticated');
    }

    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process command queue
   */
  private processQueue(): void {
    if (this.processingCommand || this.commandQueue.length === 0) {
      return;
    }

    this.processingCommand = true;
    const { command } = this.commandQueue[0];

    const commandBuffer = DoorKingProtocol.encodeCommand(command);
    this.socket!.write(commandBuffer, (error) => {
      if (error) {
        const current = this.commandQueue.shift();
        if (current) {
          current.reject(error);
        }
        this.processingCommand = false;
        this.processQueue();
      }
    });
  }

  // High-level API methods

  /**
   * Open a door
   */
  async openDoor(doorId: number = 1): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.OPEN_DOOR,
      params: { doorId }
    });
  }

  /**
   * Lock a door
   */
  async lockDoor(doorId: number = 1): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.LOCK_DOOR,
      params: { doorId }
    });
  }

  /**
   * Unlock a door
   */
  async unlockDoor(doorId: number = 1): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.UNLOCK_DOOR,
      params: { doorId }
    });
  }

  /**
   * Add an access code
   */
  async addAccessCode(code: AccessCode): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.ADD_CODE,
      params: code
    });
  }

  /**
   * Delete an access code
   */
  async deleteAccessCode(code: string): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.DELETE_CODE,
      params: { code }
    });
  }

  /**
   * List all access codes
   */
  async listAccessCodes(): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.LIST_CODES
    });
  }

  /**
   * Get access logs
   */
  async getAccessLogs(count: number = 100): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.GET_LOGS,
      params: { count }
    });
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.GET_SYSTEM_INFO
    });
  }

  /**
   * Get door status
   */
  async getDoorStatus(): Promise<CommandResponse> {
    return this.sendCommand({
      type: CommandType.GET_STATUS
    });
  }
}
