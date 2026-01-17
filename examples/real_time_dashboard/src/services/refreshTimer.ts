/**
 * @file refreshTimer.ts
 * @description Timer utility for periodic data refresh
 * 
 * This file demonstrates the IDestroyable pattern for resource cleanup:
 * - Implementing IDestroyable interface
 * - Automatic cleanup via @Destroy decorator
 * - Manual lifecycle control
 * 
 * @purpose Shows how to create cleanup-aware utility classes
 * @see IDestroyable - Interface for automatic resource cleanup
 * @see app.ts:118 - Usage with @Destroy decorator
 * @see src/Utils/utils.types.ts - IDestroyable interface definition
 */

import { IDestroyable } from "j-templates/Utils";

/**
 * RefreshTimer - Utility class for periodic refresh operations.
 * 
 * @purpose Provides automatic and manual control over periodic callbacks
 * @features
 * - Periodic callback execution
 * - Automatic cleanup via IDestroyable
 * - Manual start/stop control
 * - Prevents memory leaks from setInterval
 * 
 * @implements {IDestroyable} - Enables automatic cleanup
 * 
 * @example
 * // Usage with automatic cleanup:
 * class MyComponent extends Component {
 *   @Destroy()
 *   timer = new RefreshTimer(() => this.refreshData(), 5000);
 * 
 *   Bound() {
 *     this.timer.start(); // Start periodic refresh
 *   }
 * }
 * 
 * @jTemplates IDestroyable pattern:
 * 1. Implement Destroy() method
 * 2. Mark property with @Destroy decorator
 * 3. Framework automatically calls Destroy() when component is destroyed
 */
export class RefreshTimer implements IDestroyable {
  /**
   * Internal interval ID for tracking the timer.
   * 
   * @private
   * @type {ReturnType<typeof setInterval> | null}
   */
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Constructor.
   * 
   * @param {() => void} onRefresh - Callback function to execute on each interval
   * @param {number} interval - Interval in milliseconds between refreshes
   * 
   * @example
   * // Create timer that refreshes every 5 seconds:
   * const timer = new RefreshTimer(() => console.log("Refresh!"), 5000);
   */
  constructor(private onRefresh: () => void, private interval: number) {}

  /**
   * Destroy the timer (implements IDestroyable interface).
   * 
   * @Destroy - Called automatically when parent component is destroyed:
   * 1. Stops the timer if running
   * 2. Cleans up interval resources
   * 3. Prevents memory leaks
   * 
   * @see src/Utils/decorators.ts:537 - @Destroy decorator implementation
   */
  Destroy(): void {
    this.stop();
  }

  /**
   * Start the timer.
   * 
   * @method start
   * @returns {void}
   * 
   * @jTemplates Safe interval management:
   * - Checks if timer is already running
   * - Stores interval ID for cleanup
   * - Uses arrow function to preserve this context
   */
  start(): void {
    if (this.intervalId === null) {
      this.intervalId = setInterval(this.onRefresh, this.interval);
    }
  }

  /**
   * Stop the timer.
   * 
   * @method stop
   * @returns {void}
   * 
   * @jTemplates Cleanup pattern:
   * - Checks if timer is running
   * - Clears the interval
   * - Resets interval ID to null
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
