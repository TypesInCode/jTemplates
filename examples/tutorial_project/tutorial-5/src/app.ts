/**
 * Tutorial 5: Decorators Deep Dive - Main Application
 *
 * This file demonstrates:
 * - Composing the shopping cart component
 * - Using all decorator types together
 *
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { div, h1, h2, p } from "j-templates/DOM";
import { shoppingCart } from "./shopping-cart";

// ============================================================================
// Tutorial 5 Overview
// ============================================================================
//
// This tutorial covers:
// 1. @Computed decorator for derived state
// 2. @Scope decorator for simple cached getters
// 3. @Watch decorator for side effects
// 4. @Destroy decorator for cleanup
// 5. IDestroyable pattern for custom cleanup
//
// ============================================================================

/**
 * Main App component
 *
 * Demonstrates:
 * - Composing the shopping cart demo
 * - Tutorial overview
 */
class App extends Component {
  /**
   * Template() returns the main app layout
   */
  Template() {
    return div({}, [
      h1({}, () => "Tutorial 5: Decorators Deep Dive"),
      
      p({}, () => 
        "Build a shopping cart with computed totals, watch logging, and automatic cleanup."
      ),

      // Shopping cart demo section
      div({ props: { className: "container section" } }, [
        shoppingCart({})
      ]),

      // Key concepts section
      div({ props: { className: "container section" } }, [
        h1({ props: { style: "font-size: 1.5em; margin-top: 30px;" } }, () => "What You'll Learn"),
        div({ props: { className: "intro" } }, [
          div({}, [
            p({}, () => "• "),
            p({ props: { className: "code" } }, () => "@Computed"),
            p({}, () => " - Create derived values like subtotals and totals"),
          ]),
          div({}, [
            p({}, () => "• "),
            p({ props: { className: "code" } }, () => "@Scope"),
            p({}, () => " - Simple cached getters for cheap computations"),
          ]),
          div({}, [
            p({}, () => "• "),
            p({ props: { className: "code" } }, () => "@Watch"),
            p({}, () => " - React to changes with side effects (logging, analytics)"),
          ]),
          div({}, [
            p({}, () => "• "),
            p({ props: { className: "code" } }, () => "@Destroy"),
            p({}, () => " - Automatic cleanup to prevent memory leaks"),
          ]),
        ]),
      ]),

      // Next steps
      div({ props: { className: "container section" } }, [
        h2({}, () => "Next Steps"),
        div({}, [
          p({}, () => "Continue to "),
          p({ props: { className: "code" } }, () => "Tutorial 6: Component Composition"),
          p({}, () => " to learn about generic components and template functions."),
        ]),
      ]),
    ]);
  }

  /**
   * Bound() is called when component is attached to DOM
   */
  Bound() {
    console.log("App component bound");
    console.log("Tutorial 5: Decorators Deep Dive");
    console.log("Try adding items to the cart and watch the logs!");
  }
}

// Convert App class to a function component
const appComponent = Component.ToFunction("app-component", App);

// ============================================================================
// Attach the Component to the DOM
// ============================================================================

const appElement = document.getElementById("app")!;
Component.Attach(appElement, appComponent({}));

// ============================================================================
// Try It Yourself
// ============================================================================
//
// 1. Add a @Watch that logs when total exceeds $1000
// 2. Create a @Computed for "average item price"
// 3. Add a Reset button that clears the cart
// 4. Create a custom IDestroyable service for tracking analytics
//
// ============================================================================
