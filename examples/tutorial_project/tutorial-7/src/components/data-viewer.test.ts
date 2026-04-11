import { describe, it, expect, beforeEach } from "vitest";
import { DataService, RealDataService } from "../services/data-service";
import { LoggerService } from "../services/logger-service";
import { Injector } from "j-templates/Utils/injector";
import { dataViewer } from "./data-viewer";
import { div } from "j-templates/DOM";
import { Component } from "j-templates";

class MockLoggerServiceForComponentTest implements LoggerService {
  logs: string[] = [];

  Log(message: string): void {
    this.logs.push(`LOG: ${message}`);
  }

  Error(message: string): void {
    this.logs.push(`ERROR: ${message}`);
  }

  Warn(message: string): void {
    this.logs.push(`WARN: ${message}`);
  }
}

describe("DataViewer Component Logic", () => {
  it("should add item when form is submitted with valid name", async () => {
    const injector = new Injector();
    injector.Set(DataService, new RealDataService());
    injector.Set(LoggerService, new MockLoggerServiceForComponentTest());

    const vnode = Injector.Scope(injector, () =>
      dataViewer(
        {},
        {
          renderItem(item) {
            return div({}, () => `${item.name} - ${item.value}`);
          },
        },
      ),
    );

    // attach vnode to JSDOM element and validate behavior
    const container = document.createElement("div");
    document.body.appendChild(container);

    Component.Attach(container, vnode);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify component rendered
    expect(container.innerHTML).toContain("data-viewer");
    expect(container.innerHTML).toContain("Data Viewer");

    // Test form submission with valid name
    const nameInput = container.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement;
    const valueInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    const addButton = container.querySelector(".btn-add") as HTMLButtonElement;

    nameInput.value = "Test Item";
    valueInput.value = "42";

    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    valueInput.dispatchEvent(new Event("input", { bubbles: true }));

    addButton.click();

    // Verify item was added (check the data service has the item)
    const mockLogger = injector.Get(
      LoggerService,
    ) as MockLoggerServiceForComponentTest;
    expect(mockLogger.logs).toContainEqual(
      expect.stringContaining("Added item: Test Item"),
    );

    // Clean up
    document.body.removeChild(container);
  });
});
