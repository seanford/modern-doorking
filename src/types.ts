/**
 * DoorKing 1830 Interface Types
 */

export interface DoorKingConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  lastError?: string;
  connectedAt?: Date;
}

export interface AccessCode {
  code: string;
  name?: string;
  unit?: string;
  enabled: boolean;
  createdAt?: Date;
  expiresAt?: Date;
}

export interface AccessLog {
  timestamp: Date;
  code?: string;
  name?: string;
  action: 'entry' | 'exit' | 'denied' | 'door_open' | 'door_close';
  location?: string;
}

export interface DoorStatus {
  doorId: number;
  state: 'open' | 'closed' | 'opening' | 'closing' | 'unknown';
  locked: boolean;
  lastChanged?: Date;
}

export interface SystemInfo {
  model: string;
  version: string;
  serialNumber?: string;
  uptime?: number;
}

export enum CommandType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  GET_STATUS = 'GET_STATUS',
  ADD_CODE = 'ADD_CODE',
  DELETE_CODE = 'DELETE_CODE',
  LIST_CODES = 'LIST_CODES',
  GET_LOGS = 'GET_LOGS',
  OPEN_DOOR = 'OPEN_DOOR',
  LOCK_DOOR = 'LOCK_DOOR',
  UNLOCK_DOOR = 'UNLOCK_DOOR',
  GET_SYSTEM_INFO = 'GET_SYSTEM_INFO',
}

export interface Command {
  type: CommandType;
  params?: any;
}

export interface CommandResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}
