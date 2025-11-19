/**
 * DoorKing 1830 Protocol Handler
 *
 * This module handles the low-level protocol communication with the DoorKing device.
 * Based on reverse-engineered protocol from DoorKing 1812AP (github.com/cameronr/doorking-ha)
 * and adapted for DoorKing 1830 series.
 *
 * Protocol Details (from 1812AP):
 * - Port: 1030
 * - Status Request: 0x01 0x10 0x03
 * - Status Response: 7 bytes
 *   - Open: 0x10 0x10 0x07 0x80 0x00 0x80 0x00
 *   - Closed: 0x10 0x10 0x07 0x00 0x00 0x00 0x00
 * - Open Gate: 0x01 0x11 0x05 0x01 0x80 (sent 3 times)
 * - Close Gate: 0x01 0x11 0x05 0x00 0x80 (sent 3 times)
 *
 * NOTE: The 1830 series may use a different protocol. If commands don't work,
 * use Wireshark or similar tools to capture traffic from the official
 * DoorKing Remote Account Manager software.
 */

import { Command, CommandResponse, CommandType } from './types';

export class DoorKingProtocol {
  // Protocol constants
  static readonly DEFAULT_PORT = 1030;
  static readonly STATUS_RESPONSE_LENGTH = 7;
  static readonly COMMAND_REPEAT_COUNT = 3; // Commands sent multiple times for reliability

  // Binary protocol commands (based on 1812AP reverse engineering)
  private static readonly CMD_STATUS_REQUEST = Buffer.from([0x01, 0x10, 0x03]);
  private static readonly CMD_OPEN_GATE = Buffer.from([0x01, 0x11, 0x05, 0x01, 0x80]);
  private static readonly CMD_CLOSE_GATE = Buffer.from([0x01, 0x11, 0x05, 0x00, 0x80]);

  // Response patterns
  private static readonly RESPONSE_GATE_OPEN = Buffer.from([0x10, 0x10, 0x07, 0x80, 0x00, 0x80, 0x00]);
  private static readonly RESPONSE_GATE_CLOSED = Buffer.from([0x10, 0x10, 0x07, 0x00, 0x00, 0x00, 0x00]);

  /**
   * Convert a command to the wire protocol format
   * Uses binary protocol based on reverse-engineered 1812AP commands
   */
  static encodeCommand(command: Command): Buffer {
    switch (command.type) {
      case CommandType.GET_STATUS:
        return this.CMD_STATUS_REQUEST;

      case CommandType.OPEN_DOOR:
        return this.CMD_OPEN_GATE;

      case CommandType.LOCK_DOOR:
      case CommandType.UNLOCK_DOOR:
        // Lock/unlock may use same command as close, or may not be supported
        // on all models. Update based on your device capabilities.
        return this.CMD_CLOSE_GATE;

      case CommandType.ADD_CODE:
      case CommandType.DELETE_CODE:
      case CommandType.LIST_CODES:
      case CommandType.GET_LOGS:
      case CommandType.GET_SYSTEM_INFO:
        // These commands require the Remote Account Manager protocol
        // which uses a different communication method (likely RS-232 over TCP)
        // You may need to connect via the management port (usually port 23)
        // and use a text-based or different binary protocol
        return this.createManagementCommand(command);

      default:
        throw new Error(`Unsupported command type: ${command.type}`);
    }
  }

  /**
   * Create management commands (for RS-232 protocol over TCP)
   * NOTE: These are placeholder implementations. The actual Remote Account Manager
   * protocol is different from the gate control protocol.
   */
  private static createManagementCommand(command: Command): Buffer {
    // Placeholder for management commands
    // The actual protocol may use:
    // - Text-based commands with terminators
    // - Different binary format
    // - Authentication handshake

    const commandStr = JSON.stringify({
      cmd: command.type,
      ...command.params
    });

    return Buffer.concat([
      Buffer.from([0x02]), // STX
      Buffer.from(commandStr, 'utf8'),
      Buffer.from([0x03]), // ETX
      Buffer.from([0x0D, 0x0A]) // CR LF
    ]);
  }

  /**
   * Parse response from the device
   */
  static decodeResponse(data: Buffer): CommandResponse {
    try {
      // Check if it's a status response (7 bytes)
      if (data.length === this.STATUS_RESPONSE_LENGTH) {
        return this.decodeStatusResponse(data);
      }

      // For other responses, try to parse as text/JSON
      const text = data.toString('utf8').replace(/[\x00-\x1F\x7F]/g, '');

      try {
        const parsed = JSON.parse(text);
        return {
          success: true,
          data: parsed,
          timestamp: new Date()
        };
      } catch {
        return {
          success: true,
          data: { raw: text },
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Decode status response
   */
  private static decodeStatusResponse(data: Buffer): CommandResponse {
    if (data.equals(this.RESPONSE_GATE_OPEN)) {
      return {
        success: true,
        data: {
          state: 'open',
          locked: false
        },
        timestamp: new Date()
      };
    } else if (data.equals(this.RESPONSE_GATE_CLOSED)) {
      return {
        success: true,
        data: {
          state: 'closed',
          locked: true
        },
        timestamp: new Date()
      };
    } else {
      // Unknown status pattern
      return {
        success: false,
        error: `Unexpected status response: ${data.toString('hex')}`,
        data: {
          raw: data.toString('hex')
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate login command
   * NOTE: The gate control protocol (port 1030) doesn't require login.
   * Management protocol (port 23) may require authentication.
   */
  static createLoginCommand(username: string, password: string): Buffer {
    // For management protocol - placeholder implementation
    const loginData = `LOGIN:${username}:${password}`;
    return Buffer.concat([
      Buffer.from([0x02]),
      Buffer.from(loginData, 'utf8'),
      Buffer.from([0x03, 0x0D, 0x0A])
    ]);
  }

  /**
   * Validate response indicates successful login
   */
  static isLoginSuccessful(response: string): boolean {
    return response.includes('OK') ||
           response.includes('SUCCESS') ||
           response.includes('LOGGED IN') ||
           response.length === 0; // Gate control port may not send login response
  }

  /**
   * Create door control command (legacy method for compatibility)
   */
  static createDoorCommand(action: 'open' | 'lock' | 'unlock', doorId: number = 1): Buffer {
    if (action === 'open') {
      return this.CMD_OPEN_GATE;
    } else {
      return this.CMD_CLOSE_GATE;
    }
  }

  /**
   * Create access code management command
   */
  static createAccessCodeCommand(action: 'add' | 'delete' | 'list', code?: string, name?: string): Buffer {
    let cmd = `CODE:${action.toUpperCase()}`;
    if (code) cmd += `:${code}`;
    if (name) cmd += `:${name}`;

    return Buffer.concat([
      Buffer.from([0x02]),
      Buffer.from(cmd, 'utf8'),
      Buffer.from([0x03, 0x0D, 0x0A])
    ]);
  }

  /**
   * Create log request command
   */
  static createGetLogsCommand(count: number = 100): Buffer {
    const cmd = `LOGS:${count}`;
    return Buffer.concat([
      Buffer.from([0x02]),
      Buffer.from(cmd, 'utf8'),
      Buffer.from([0x03, 0x0D, 0x0A])
    ]);
  }

  /**
   * Create status request command
   */
  static createStatusCommand(): Buffer {
    return this.CMD_STATUS_REQUEST;
  }

  /**
   * Get expected response length for a command
   */
  static getExpectedResponseLength(command: Command): number {
    switch (command.type) {
      case CommandType.GET_STATUS:
        return this.STATUS_RESPONSE_LENGTH;
      case CommandType.OPEN_DOOR:
      case CommandType.LOCK_DOOR:
      case CommandType.UNLOCK_DOOR:
        return 0; // Control commands don't expect a response
      default:
        return -1; // Variable length, read until timeout or delimiter
    }
  }

  /**
   * Check if command should be repeated for reliability
   */
  static shouldRepeatCommand(command: Command): boolean {
    return command.type === CommandType.OPEN_DOOR ||
           command.type === CommandType.LOCK_DOOR ||
           command.type === CommandType.UNLOCK_DOOR;
  }
}
