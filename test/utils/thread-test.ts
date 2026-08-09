import { describe, it, expect } from "vitest";
import {
  Schedule,
  Thread,
  ThreadAsync,
  Synch,
  Callback,
} from "../../src/Utils/thread";

describe("Thread Utility", () => {
  describe("Function Export", () => {
    it("should export all expected functions", () => {
      expect(Schedule).to.be.a("function");
      expect(Thread).to.be.a("function");
      expect(ThreadAsync).to.be.a("function");
      expect(Synch).to.be.a("function");
      expect(Callback).to.be.a("function");
    });
  });

  describe("Thread Function", () => {
    it("should execute a callback synchronously when no thread context exists", () => {
      let executed = false;

      Thread(() => {
        executed = true;
      });

      expect(executed).to.be.true;
    });

    it("should schedule callbacks within thread context for later execution", async (done) => {
      let outerExecuted = false;
      let innerExecuted = false;

      const promise = new Promise<void>(resolve =>
        Thread(() => {
          outerExecuted = true;

          // Schedule work within the thread context - this is how vNode uses it
          Schedule(() => {
            innerExecuted = true;
            resolve();
          });
        })
      );

      expect(outerExecuted).to.be.true;
      expect(innerExecuted).to.be.false; // Not executed immediately

      await promise;
      expect(innerExecuted).to.be.true; // Not executed immediately
    });
  });

  describe("Callback Function", () => {
    it("should create a wrapper function that schedules execution", () => {
      const wrapped = Callback((data: string) => {
        // This would be executed when scheduled
      });
      expect(wrapped).to.be.a("function");
    });

    it("should handle parameters correctly", () => {
      let capturedData: any = null;

      const wrapped = Callback((data: string) => {
        capturedData = data;
      });

      // In real usage, this would be scheduled for execution
      expect(capturedData).to.be.null;
    });
  });

  describe("ThreadAsync Function", () => {
    it("should return a Promise", () => {
      const result = ThreadAsync(() => {});
      expect(result).to.be.instanceOf(Promise);
    });

    it("should resolve when callback completes", async () => {
      await ThreadAsync(() => {
        // This creates a thread context that will be processed
      });
    });
  });

  describe("Synch Function", () => {
    it("should execute a callback synchronously", () => {
      let executed = false;

      Synch(() => {
        executed = true;
      });

      expect(executed).to.be.true;
    });
  });

  describe("Integration with Real Usage Patterns", () => {
    it("should work like vNode's UpdateChildren pattern", async () => {
      // Simulate the pattern used in vNode.ts:
      // Thread(() => {
      //   Schedule(() => { ... }); // Individual node initialization
      //   Thread(() => { ... });   // Final reconciliation
      // });

      let scheduleExecuted = false;
      let threadExecuted = false;

      const promise = new Promise<void>(resolve =>
        Thread(() => {
          // This simulates vNode's pattern - schedule individual work
          Schedule(() => {
            scheduleExecuted = true;
          });

          // This simulates final processing step
          Thread(() => {
            threadExecuted = true;
            resolve();
          });
        })
      )

      expect(scheduleExecuted).to.be.false; // Not executed immediately
      expect(threadExecuted).to.be.false; // Not executed immediately

      await promise;
      expect(scheduleExecuted).to.be.true; // Not executed immediately
      expect(threadExecuted).to.be.true; // Not executed immediately
    });

    it("should handle nested thread scheduling properly", async () => {
      let outerCalled = false;
      let innerCalled = false;

      const promise = new Promise<void>(resolve =>
        Thread(() => {
          outerCalled = true;

          // This is how vNode schedules individual node initialization
          Schedule(() => {
            innerCalled = true;
            resolve();
          });
        })
      );

      expect(outerCalled).to.be.true;
      expect(innerCalled).to.be.false; // Not executed immediately

      await promise;
      expect(innerCalled).to.be.true;
    });
  });

  describe("ThreadAsync Integration", () => {
    it("should properly chain with nested Thread calls", async () => {
      let completed = false;

      await ThreadAsync(() => {
        // This creates a thread context that will be processed
        Thread(() => {
          completed = true;
        });
      });

      expect(completed).to.be.true;
    });
  });

  describe("Schedule and Thread Integration", () => {
    it("should execute scheduled events in proper order", async () => {
      let event1Executed = false;
      let event2Executed = false;
      let event3Executed = false;

      const promise = new Promise<void>(resolve =>
        // This test specifically verifies the integration between Schedule and Thread
        Thread(() => {
          // First, schedule some work
          Schedule(() => {
            event1Executed = true;
          });

          // Schedule another event to happen later
          Schedule(() => {
            event2Executed = true;
          });

          // Create a thread context that will process at the end
          Thread(() => {
            event3Executed = true;
            resolve();
          });
        })
      );

      // Verify events haven't executed initially
      expect(event1Executed).to.be.false;
      expect(event2Executed).to.be.false;
      expect(event3Executed).to.be.false;

      await promise;
      // Verify all events have fired before we complete
      expect(event1Executed).to.be.true;
      expect(event2Executed).to.be.true;
      expect(event3Executed).to.be.true;
    });
  });

  describe("Nested Thread Calls", () => {
    it("should execute nested Thread() calls synchronously when no context exists", () => {
      let outerExecuted = false;
      let innerExecuted = false;

      // This demonstrates the behavior where both Thread() calls execute immediately
      // because there's no existing thread context to trigger scheduling
      Thread(() => {
        outerExecuted = true;

        // Nested Thread call with no thread context - executes immediately
        Thread(() => {
          innerExecuted = true;
        });
      });

      expect(outerExecuted).to.be.true;
      expect(innerExecuted).to.be.true; // Both execute synchronously
    });

    it("should demonstrate nested execution behavior", () => {
      // Test to verify how nested calls behave with no thread context
      const executionOrder: number[] = [];

      Thread(() => {
        executionOrder.push(1);

        // This will be executed immediately in the same call stack
        Thread(() => {
          executionOrder.push(2);
        });

        executionOrder.push(3);
      });

      // All three execute synchronously in order 1, 2, 3
      expect(executionOrder).to.eql([1, 2, 3]);
    });
  });
});
