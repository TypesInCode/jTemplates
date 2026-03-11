/**
 * Tutorial 2: Your First Component
 * 
 * This file demonstrates:
 * - Using a component class with Component.ToFunction()
 * - Passing data to components
 * - Composing multiple components together
 * 
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { div, h1 } from "j-templates/DOM";
import { greeting } from "./greeting";

// ============================================================================
// Step 1: Using Component.ToFunction()
// ============================================================================
//
// The greeting function was created from GreetingComponent class using:
// const greeting = Component.ToFunction("greeting-component", GreetingComponent);
//
// This allows us to use it like any other DOM function (div, span, etc.)
//

// ============================================================================
// Step 2: Passing Data to Components
// ============================================================================
//
// Components receive data through the data config parameter.
// The data is accessed in the component via this.Data
//

// ============================================================================
// Step 3: Creating the Main App Component
// ============================================================================

class App extends Component {
  Template() {
    return div({}, () => [
      h1({}, () => "Tutorial 2: Your First Component"),
      
      // First greeting card
      greeting({
        data: () => ({
          name: "Developer",
          title: "Welcome",
          message: "This is your first reusable component!"
        })
      }),
      
      // Second greeting card with different data
      greeting({
        data: () => ({
          name: "TypeScript",
          title: "Hello",
          message: "Components are powerful and reusable!"
        })
      }),
      
      // Third greeting card with minimal data (uses defaults)
      greeting({
        data: () => ({
          name: "j-templates"
        })
      })
    ]);
  }

  Bound() {
    console.log("App component bound to DOM");
  }
}

// Convert App class to a function component
const appComponent = Component.ToFunction("app-component", App);

// ============================================================================
// Step 4: Attach the Component to the DOM
// ============================================================================
//
// Component.Attach() renders a vNode into a real DOM element.
// We attach the appComponent to the #app element in index.html
//

const appElement = document.getElementById("app")!;
Component.Attach(appElement, appComponent({}));

// ============================================================================
// Try It Yourself
// ============================================================================
//
// 1. Add a fourth greeting card with your own name
// 2. Create a new InfoCard component (see greeting.ts comments)
// 3. Experiment with different titles and messages
// 4. Try adding a "primary" prop to change card styling
//