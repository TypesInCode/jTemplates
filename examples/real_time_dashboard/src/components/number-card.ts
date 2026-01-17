/**
 * @file number-card.ts
 * @description Animated number card component
 * 
 * This file demonstrates jTemplates animation system and reactive value tracking:
 * - Animation class for smooth transitions
 * - @Value decorator for primitive state
 * - @Watch decorator for observing data changes
 * - @Destroy decorator for cleanup
 * 
 * @purpose Shows how to create UI components with animated value transitions
 * @see Animation - Animation class for smooth transitions
 * @see Value - Decorator for primitive reactive state
 * @see Watch - Decorator for observing data changes
 * @see Destroy - Decorator for automatic cleanup
 * @see src/Utils/animation.ts - Animation implementation
 */

import { Component } from "j-templates";
import { div, h1 } from "j-templates/DOM";
import { vNode } from "j-templates/Node/vNode.types";
import {
  AnimationType,
  Destroy,
  Value,
  Watch,
  Animation,
} from "j-templates/Utils";

import "./number-card.scss";

/**
 * NumberCard - Component that displays a title and animated number value
 * 
 * @purpose Demonstrates animated value transitions using jTemplates animation system
 * @features
 * - Animated number transitions
 * - Reactive data binding
 * - Automatic cleanup of animation resources
 * - Watch decorator for data change observation
 * 
 * @template { title: string; value: number } - Component data interface
 * @property {string} title - The title text to display
 * @property {number} value - The numeric value to display with animation
 */
class NumberCard extends Component<{ title: string; value: number }> {
  /**
   * Animation instance for smooth value transitions.
   * 
   * @Destroy() - Marks this animation for automatic cleanup when component is destroyed.
   * This prevents memory leaks from animation callbacks and scheduled updates.
   * 
   * @AnimationType.Linear - Uses linear interpolation for smooth transitions
   * @duration 500ms - Animation duration
   * @callback (next: number) => void - Called with interpolated values during animation
   * 
   * @jTemplates Animation system:
   * 1. Creates interpolated values between start and end
   * 2. Calls the callback with each interpolated value
   * 3. Uses NodeConfig.scheduleUpdate for efficient DOM updates
   * 4. Implements IDestroyable for automatic cleanup
   * 
   * @see src/Utils/animation.ts:36 - Animation class implementation
   * @see src/Utils/animation.ts:102 - Animate method
   */
  @Destroy()
  animateCardValue = new Animation(AnimationType.Linear, 500, (next) => {
    this.cardValue = Math.floor(next);
  });

  /**
   * Current displayed value.
   * 
   * @Value() - Creates a reactive primitive property.
   * Unlike @State() which uses ObservableNode, @Value() creates an ObservableScope
   * that tracks the primitive value and triggers reactivity when changed.
   * 
   * @jTemplates How @Value works:
   * 1. Creates a getter/setter pair
   * 2. Lazily creates an ObservableScope
   * 3. Updates the scope when the value changes
   * 4. Triggers dependent computations and re-renders
   * 
   * @see src/Utils/decorators.ts:333 - Value decorator implementation
   */
  @Value()
  cardValue = 0;

  /**
   * Watch for data value changes and trigger animation.
   * 
   * @Watch((comp) => comp.Data.value) - Observes changes to the component's data.value
   * The decorator creates a scope that watches the specified property and
   * calls the method when the value changes.
   * 
   * @param {number} value - The new target value
   * 
   * @jTemplates How @Watch works:
   * 1. Creates a scope that tracks the watched property
   * 2. When the watched property changes, the method is called with the new value
   * 3. The scope is automatically managed and cleaned up
   * 
   * @see src/Utils/decorators.ts:338 - Watch decorator implementation
   */
  @Watch((comp) => comp.Data.value)
  setCardValue(value: number) {
    // Start animation from current value to new value
    this.animateCardValue.Animate(this.cardValue, value);
  }

  /**
   * Component template method.
   * 
   * Defines the UI structure with title and animated value display.
   * 
   * @returns {vNode | vNode[]} Virtual nodes representing the component UI
   * 
   * @jTemplates Template reactivity:
   * - h1({}, () => this.Data.title) creates reactive binding to title
   * - div({}, () => `${this.cardValue}`) creates reactive binding to cardValue
   * - When cardValue changes, the div content updates automatically
   */
  Template(): vNode | vNode[] {
    return [
      // Title element - reacts to Data.title changes
      h1({}, () => this.Data.title),
      // Value element - reacts to cardValue changes (updated by animation)
      div({}, () => `${this.cardValue}`)
    ];
  }
}

/**
 * Convert NumberCard class to function component.
 * 
 * @jTemplates Component.ToFunction enables:
 * - Component reuse in parent templates
 * - Data passing via props
 * - Type-safe component composition
 * 
 * @example
 * // Usage in parent component:
 * numberCard({
 *   data: () => ({ title: "Total Visits", value: 42 })
 * })
 * 
 * @see src/Node/component.ts:158 - ToFunction implementation
 */
export const numberCard = Component.ToFunction("number-card", NumberCard);
