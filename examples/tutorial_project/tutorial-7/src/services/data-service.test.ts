import { describe, it, expect, beforeEach } from "vitest";
import { RealDataService, MockDataService } from "./data-service";
import { RealLoggerService, MockLoggerService } from "./logger-service";

describe("DataService", () => {
  let service: RealDataService;

  beforeEach(() => {
    service = new RealDataService();
  });

  it("should start with empty data", () => {
    const data = service.GetData();
    expect(data).toHaveLength(0);
  });

  it("should add items correctly", () => {
    service.AddItem({ name: "Test Item", value: 100 });
    
    const data = service.GetData();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test Item");
    expect(data[0].value).toBe(100);
    expect(data[0].id).toBe(1);
    expect(data[0].createdAt).toBeInstanceOf(Date);
  });

  it("should assign incrementing IDs", () => {
    service.AddItem({ name: "Item 1", value: 100 });
    service.AddItem({ name: "Item 2", value: 200 });
    
    const data = service.GetData();
    expect(data[0].id).toBe(1);
    expect(data[1].id).toBe(2);
  });

  it("should delete items by ID", () => {
    service.AddItem({ name: "Item 1", value: 100 });
    service.AddItem({ name: "Item 2", value: 200 });
    
    service.DeleteItem(1);
    
    const data = service.GetData();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(2);
  });

  it("should clean up on destroy", () => {
    service.AddItem({ name: "Test", value: 100 });
    service.Destroy();
    
    const data = service.GetData();
    expect(data).toHaveLength(0);
  });
});

describe("MockDataService for Testing", () => {
  it("should provide mock data for unit tests", () => {
    const mockService = new MockDataService();
    
    // Mock services can provide predefined test data
    mockService.AddItem({ name: "Mock Item", value: 50 });
    
    const data = mockService.GetData();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Mock Item");
  });

  it("should be suitable for component testing without side effects", () => {
    const mockService = new MockDataService();
    
    // Perform operations
    mockService.AddItem({ name: "Test", value: 100 });
    mockService.DeleteItem(1);
    
    // Verify state - no external dependencies, no persistence
    expect(mockService.GetData()).toHaveLength(0);
  });
});

describe("LoggerService", () => {
  let service: RealLoggerService;

  beforeEach(() => {
    service = new RealLoggerService();
  });

  it("should log messages", () => {
    service.Log("Test message");
    // In real implementation, this logs to console
    // For testing, we verify no errors occur
    expect(() => service.Log("Test")).not.toThrow();
  });

  it("should clean up on destroy", () => {
    service.Log("Test");
    service.Destroy();
    // After destroy, logHistory should be cleared
    expect(() => service.Log("Test")).not.toThrow();
  });
});

describe("MockLoggerService for Testing", () => {
  it("should capture logs in memory for verification", () => {
    const mockService = new MockLoggerService();
    
    mockService.Log("Log 1");
    mockService.Error("Error 1");
    mockService.Warn("Warning 1");
    
    const logs = mockService.GetLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0]).toContain("LOG: Log 1");
    expect(logs[1]).toContain("ERROR: Error 1");
    expect(logs[2]).toContain("WARN: Warning 1");
  });

  it("should allow clearing logs between tests", () => {
    const mockService = new MockLoggerService();
    
    mockService.Log("Test 1");
    mockService.ClearLogs();
    
    expect(mockService.GetLogs()).toHaveLength(0);
  });

  it("should be suitable for testing component logging without console noise", () => {
    const mockService = new MockLoggerService();
    
    // Component under test would use this service
    mockService.Log("Component action");
    mockService.Error("Component error");
    
    // Verify logging occurred
    const logs = mockService.GetLogs();
    expect(logs).toContainEqual(expect.stringContaining("Component"));
  });
});
