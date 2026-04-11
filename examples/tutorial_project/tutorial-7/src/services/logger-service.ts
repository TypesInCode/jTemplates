import { IDestroyable } from "j-templates/Utils/utils.types";

export abstract class LoggerService {
  abstract Log(message: string): void;
  abstract Error(message: string): void;
  abstract Warn(message: string): void;
}

export class RealLoggerService extends LoggerService implements IDestroyable {
  private logHistory: string[] = [];
  
  Log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] LOG: ${message}`;
    this.logHistory.push(logEntry);
    console.log(logEntry);
  }
  
  Error(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ERROR: ${message}`;
    this.logHistory.push(logEntry);
    console.error(logEntry);
  }
  
  Warn(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] WARN: ${message}`;
    this.logHistory.push(logEntry);
    console.warn(logEntry);
  }
  
  GetLogs(): string[] {
    return [...this.logHistory];
  }
  
  ClearLogs(): void {
    this.logHistory = [];
  }
  
  Destroy(): void {
    this.ClearLogs();
  }
}

// Mock implementation for testing
export class MockLoggerService extends LoggerService {
  public logs: string[] = [];
  
  Log(message: string): void {
    this.logs.push(`LOG: ${message}`);
  }
  
  Error(message: string): void {
    this.logs.push(`ERROR: ${message}`);
  }
  
  Warn(message: string): void {
    this.logs.push(`WARN: ${message}`);
  }
  
  GetLogs(): string[] {
    return [...this.logs];
  }
  
  ClearLogs(): void {
    this.logs = [];
  }
  
  Destroy(): void {
    this.ClearLogs();
  }
}
