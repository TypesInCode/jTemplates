/**
 * Tutorial 3: Reactive State Basics - Main Application
 *
 * This file demonstrates:
 * - Using both @Value and @State components together
 * - Composing reactive components
 * - Real-time reactive updates
 *
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, h1, h2, h3, span } from "j-templates/DOM";
import { counter } from "./counter";
import { userProfile } from "./user-profile";

// ============================================================================
// Tutorial 3 Overview
// ============================================================================
//
// This tutorial covers:
// 1. @Value decorator for primitive state (number, string, boolean)
// 2. @State decorator for complex state (objects, arrays)
// 3. How reactive state triggers automatic UI updates
// 4. When to use @Value vs @State
//
// ============================================================================

/**
 * Main App component
 *
 * Demonstrates:
 * - Composing multiple reactive components
 * - Section-based layout
 * - Introduction to the tutorial features
 */
class App extends Component {
  /**
   * Track which tutorial step is being viewed
   */
  @Value()
  currentStep: number = 1;

  /**
   * Show/hide tutorial notes
   */
  @Value()
  showNotes: boolean = true;

  /**
   * Template() returns the main app layout
   */
   Template() {
    return div({}, [
      h1({}, () => "Tutorial 3: Reactive State Basics"),

      // Introduction section
      div({ props: { className: "container section" } }, [
        h2({}, () => "What You'll Learn"),
        div({ props: { className: "intro" } }, [
          div({}, [
            span({ props: { className: "bullet" } }, () => "✓ "),
            span(
              {},
              () =>
                "Use @Value for primitive state (numbers, strings, booleans)",
            ),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "✓ "),
            span({}, () => "Use @State for complex state (objects, arrays)"),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "✓ "),
            span(
              {},
              () => "Understand how reactive state triggers automatic updates",
            ),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "✓ "),
            span({}, () => "Know when to use @Value vs @State"),
          ]),
        ]),
      ]),

      // Counter demo section - demonstrates @Value
      div({ props: { className: "container section" } }, [
        h2({}, () => "Demo 1: Counter with @Value"),
        div({ props: { className: "description" } }, [
          span({}, () => "This counter uses "),
          span({ props: { className: "code" } }, () => "@Value()"),
          span({}, () => " for the primitive "),
          span({ props: { className: "code" } }, () => "count"),
          span(
            {},
            () =>
              " property. Try clicking the buttons - notice how the UI updates automatically!",
          ),
        ]),
        counter({}),
        div({ props: { className: "notes" } }, [
          h3({}, () => "Key Points:"),
          div({}, [
            span({ props: { className: "bullet" } }, () => "• "),
            span({}, () => "@Value is lightweight - perfect for primitives"),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "• "),
            span({}, () => "Changes to count trigger automatic re-render"),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "• "),
            span({}, () => "No manual DOM updates needed!"),
          ]),
        ]),
      ]),

      // User Profile demo section - demonstrates @State
      div({ props: { className: "container section" } }, [
        h2({}, () => "Demo 2: User Profile with @State"),
        div({ props: { className: "description" } }, [
          span({}, () => "This form uses "),
          span({ props: { className: "code" } }, () => "@State()"),
          span({}, () => " for the "),
          span({ props: { className: "code" } }, () => "user"),
          span(
            {},
            () =>
              " object with nested properties. Type in the fields and watch the preview update in real-time!",
          ),
        ]),
        userProfile({}),
        div({ props: { className: "notes" } }, [
          h3({}, () => "Key Points:"),
          div({}, [
            span({ props: { className: "bullet" } }, () => "• "),
            span({}, () => "@State provides deep reactivity for objects"),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "• "),
            span({}, () => "Changing user.name or user.email triggers updates"),
          ]),
          div({}, [
            span({ props: { className: "bullet" } }, () => "• "),
            span({}, () => "Perfect for forms and complex data structures"),
          ]),
        ]),
      ]),

      // Decision guide section
      div({ props: { className: "container section" } }, [
        h2({}, () => "@Value vs @State Decision Guide"),
        div({ props: { className: "decision-guide" } }, [
          div({ props: { className: "table-wrapper" } }, [
            div({ props: { className: "table-header" } }, [
              div({}, () => "Value Type"),
              div({}, () => "Use"),
              div({}, () => "Why"),
            ]),
            div({ props: { className: "table-row" } }, [
              div({}, () => "number, string, boolean"),
              div({ props: { className: "code" } }, () => "@Value"),
              div({}, () => "Lightweight, no proxy overhead"),
            ]),
            div({ props: { className: "table-row" } }, [
              div({}, () => "null, undefined"),
              div({ props: { className: "code" } }, () => "@Value"),
              div({}, () => "Simple scope storage"),
            ]),
            div({ props: { className: "table-row" } }, [
              div({}, () => "{ nested: objects }"),
              div({ props: { className: "code" } }, () => "@State"),
              div({}, () => "Deep reactivity needed"),
            ]),
            div({ props: { className: "table-row" } }, [
              div({}, () => "arrays (User[], Todo[])"),
              div({ props: { className: "code" } }, () => "@State"),
              div({}, () => "Array mutations tracked"),
            ]),
          ]),
        ]),
      ]),

      // Next steps
      div({ props: { className: "container section" } }, [
        h2({}, () => "Next Steps"),
        div({}, [
          span({}, () => "Continue to "),
          span(
            { props: { className: "code" } },
            () => "Tutorial 4: Template System Deep Dive",
          ),
          span(
            {},
            () =>
              " to learn about conditional rendering, lists, and event handling.",
          ),
        ]),
      ]),
    ]);
  }

  /**
   * Bound() is called when component is attached to DOM
   */
  Bound() {
    console.log("App component bound");
    console.log("Tutorial 3: Reactive State Basics");
    console.log("Try the counter and user profile demos above!");
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
// 1. Add a "double" button to the counter that multiplies by 2
// 2. Add a phone field to the user profile
// 3. Create a new Toggle component with boolean @Value
// 4. Create an ItemList with @State array
//
// ============================================================================
