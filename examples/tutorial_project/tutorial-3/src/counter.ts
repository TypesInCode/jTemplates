/**
 * Tutorial 3: Reactive State Basics - Counter Component
 *
 * This file demonstrates:
 * - Using @Value decorator for primitive state (number)
 * - Reactive updates - UI automatically updates when count changes
 * - Simple state management with minimal overhead
 *
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, h2, button, span } from "j-templates/DOM";

// ============================================================================
// Step 1: The Problem with Manual Updates
// ============================================================================
//
// Before reactive state, you had to manually update the DOM:
//
// class Counter extends Component {
//   private count = 0;  // Not reactive!
//
//   Template() {
//     return div({}, () => [
//       button({
//         on: { click: () => {
//           this.count++;
//           // UI doesn't update automatically!
//         }}
//       }, () => "Increment"),
//       span({}, () => `Count: ${this.count}`)
//     ]);
//   }
// }
//
// The count variable updates, but the displayed value stays the same.
//
// ============================================================================

// ============================================================================
// Step 2: The @Value Decorator
// ============================================================================
//
// @Value creates a reactive scope for primitive values.
// When the value changes, any template bindings automatically update.
//
// Use @Value for:
// - number (count, age, price)
// - string (name, title, message)
// - boolean (isLoading, isActive, isVisible)
//
// ============================================================================

/**
 * Counter component demonstrates @Value for primitive state
 *
 * Features:
 * - Increment, decrement, and reset functionality
 * - Automatic UI updates when count changes
 * - Conditional button states (disabled when at min/max)
 */
class Counter extends Component {
  /**
   * Reactive count using @Value decorator
   *
   * The @Value decorator:
   * - Creates a lightweight ObservableScope
   * - Tracks changes to the value
   * - Notifies dependent bindings (Template) when value changes
   * - Minimal overhead compared to @State
   */
  @Value()
  count: number = 0;

  /**
   * Maximum allowed count
   */
  @Value()
  max: number = 10;

  /**
   * Minimum allowed count
   */
  @Value()
  min: number = 0;

  /**
   * Template() returns the vNode to render
   *
   * Notice the arrow functions in children:
   * - () => `Count: ${this.count}` - Reactive binding!
   * - When count changes, this function re-runs automatically
   */
   Template() {
    return div({ props: { className: "counter" } }, [
      h2({}, () => `Counter: ${this.count}`),

      // Show current count with reactive binding
      span({ props: { className: "count-display" } }, [
        span({}, () => `Current: ${this.count}`),
        span({}, () => ` (min: ${this.min}, max: ${this.max})`),
      ]),

      div({ props: { className: "buttons" } }, [
        // Decrement button - disabled when at minimum
        button(
          {
            on: {
              click: () => {
                if (this.count > this.min) {
                  this.count--; // ✅ Reactive update!
                }
              },
            },
            props: () => ({
              disabled: this.count <= this.min,
            }),
          },
          () => "Decrement",
        ),

        // Reset button
        button(
          {
            on: {
              click: () => {
                this.count = 0; // ✅ Reactive update!
              },
            },
          },
          () => "Reset",
        ),

        // Increment button - disabled when at maximum
        button(
          {
            on: {
              click: () => {
                if (this.count < this.max) {
                  this.count++; // ✅ Reactive update!
                }
              },
            },
            props: () => ({
              disabled: this.count >= this.max,
            }),
          },
          () => "Increment",
        ),
      ]),

      // Show count-based message
      this.count === 0
        ? span({ props: { className: "message" } }, () => "Count is zero!")
        : this.count === this.max
          ? span(
              { props: { className: "message warning" } },
              () => "Maximum reached!",
            )
          : this.count < 0
            ? span(
                { props: { className: "message negative" } },
                () => "Negative count!",
              )
            : span(
                { props: { className: "message" } },
                () => `Count is ${this.count}`,
              ),
    ]);
  }

  /**
   * Bound() is called when component is attached to DOM
   * Good for logging and initialization
   */
  Bound() {
    console.log("Counter component bound");
    console.log(`Initial count: ${this.count}`);
  }
}

// Convert class to reusable function
const counter = Component.ToFunction("counter", Counter);

// Export only the factory function
export { counter };

// ============================================================================
// Try It Yourself
// ============================================================================
//
// 1. Add a "step" value to increment/decrement by more than 1
// 2. Add a "double" button that multiplies count by 2
// 3. Add a color that changes based on count value
// 4. Create a second counter with different min/max values
//
// ============================================================================
