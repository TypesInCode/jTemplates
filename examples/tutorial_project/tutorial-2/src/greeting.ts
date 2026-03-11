/**
 * Tutorial 2: Your First Component
 * 
 * This file demonstrates:
 * - Creating a component class that extends Component
 * - Implementing the Template() method
 * - Using Component.ToFunction() for reusability
 * - Understanding the component lifecycle
 * 
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { div, h2, p } from "j-templates/DOM";

// ============================================================================
// Step 1: Component Class Structure
// ============================================================================
// 
// A component is a TypeScript class that extends Component.
// The core method is Template(), which returns a vNode.
//
// Basic structure:
//
// class MyComponent extends Component {
//   Template() {
//     return div({}, () => "Hello!");
//   }
// }
//

// ============================================================================
// Step 2: The Template() Method
// ============================================================================
//
// Template() is the main rendering method of a component.
// It should return a single vNode that represents the component's UI.
//
// The Template() method is called:
// 1. When the component is first attached to the DOM
// 2. Whenever reactive state changes (covered in Tutorial 3)
//

// ============================================================================
// Step 3: Component.ToFunction() Pattern
// ============================================================================
//
// To use a component class as a function (like div(), h1(), etc.),
// call Component.ToFunction() with a type name and your component class.
//
// This creates a helper function that:
// 1. Instantiates your component
// 2. Returns the vNode from Template()
//
// This pattern makes your components reusable throughout your app.
//

// ============================================================================
// Step 4: Component Lifecycle - Bound() Method
// ============================================================================
//
// Components have lifecycle methods that are called at different stages:
//
// 1. Constructor() - Component is instantiated
// 2. Bound() - Component is attached to DOM, called once
// 3. Template() - Returns the vNode to render
//
// Bound() is perfect for:
// - Initializing non-reactive state
// - Setting up event listeners
// - Fetching initial data
//

// ============================================================================
// Creating a Reusable Greeting Component
// ============================================================================

/**
 * Greeting component data interface
 * Defines what data the component expects
 */
interface GreetingData {
  name: string;
  title?: string;
  message?: string;
}

/**
 * GreetingComponent displays a styled greeting card
 * 
 * This component demonstrates:
 * - Extending Component class
 * - Using data for configuration
 * - Implementing Template() method
 * - Using Bound() for initialization
 */
class GreetingComponent extends Component<GreetingData> {
  
  /**
   * Display name - uses getter to access data directly
   * This pattern prepares for reactive state with @Scope in Tutorial 3
   */
  private get displayName(): string {
    return this.Data.name || "Guest";
  }

  /**
   * Display title - uses getter to access data directly
   */
  private get displayTitle(): string {
    return this.Data.title || "Welcome";
  }

  /**
   * Display message - uses getter to access data directly
   */
  private get displayMessage(): string {
    return this.Data.message || "Hello, j-templates!";
  }

  /**
   * Bound() is called when the component is attached to the DOM
   * Use this for initialization that needs the component to be "bound"
   */
  Bound() {
    console.log(`GreetingComponent bound: Welcome ${this.displayName}`);
  }

  /**
   * Template() returns the vNode(s) to render
   * Can return a single vNode or an array of vNodes
   */
  Template() {
    return div({ 
      props: { className: "greeting-card" },
      on: {
        click: () => {
          console.log("Greeting card clicked!");
        }
      }
    }, () => [
      h2({}, () => `${this.displayTitle}, ${this.displayName}!`),
      p({}, () => this.displayMessage)
    ]);
  }
}

// ============================================================================
// Step 5: Convert to Reusable Function
// ============================================================================
//
// Using Component.ToFunction() creates a reusable function
// that can be used just like div(), span(), etc.
//
// Parameters:
// 1. Type name (string) - Used for debugging and component identification
// 2. Constructor (class) - Your component class
//

const greeting = Component.ToFunction("greeting-component", GreetingComponent);

// Export for use in app.ts
export { greeting, GreetingComponent };

// ============================================================================
// Try It Yourself
// ============================================================================
//
// 1. Create a new component called "InfoCard" that displays information
// 2. Add a "primary" prop that changes the card color
// 3. Create multiple greeting cards with different names
// 4. Experiment with the Bound() method to log when components attach
//
// Example InfoCard structure:
//
// interface InfoCardConfig {
//   title: string;
//   content: string;
//   primary?: boolean;
// }
//
// class InfoCard extends Component<InfoCardConfig> {
//   Template() {
//     return div({ 
//       props: { 
//         className: this.Data.primary ? "info-card primary" : "info-card" 
//       } 
//     }, () => [
//       h2({}, () => this.Data.title),
//       p({}, () => this.Data.content)
//     ]);
//   }
// }
//
// const infoCard = Component.ToFunction("info-card", InfoCard);