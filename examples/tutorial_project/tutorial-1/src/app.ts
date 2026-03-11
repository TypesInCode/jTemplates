/**
 * Tutorial 1: Getting Started
 * 
 * This file demonstrates the basics of j-templates:
 * - Importing from j-templates
 * - Creating virtual nodes (vNodes)
 * - Rendering to the DOM
 * 
 * Run this tutorial:
 * 1. npm install
 * 2. npm run build
 * 3. npm run serve
 * 4. Open http://localhost:8080 in your browser
 */

import { Component } from "j-templates";
import { div, h1, span } from "j-templates/DOM";

// ============================================================================
// Step 1: Create a simple vNode
// ============================================================================
// 
// The div() function creates a virtual node representing a <div> element.
// Parameters:
//   - First param: Configuration object (props, attrs, events, data)
//   - Second param: Children (string, array, or callback for reactivity)
//
// const message = div({}, () => "Hello, j-templates!");

// ============================================================================
// Step 2: Create nested vNodes
// ============================================================================
//
// You can nest vNodes by passing an array as the second parameter to div().
// The array becomes the children of the parent div.
//
// IMPORTANT: Component.Attach() takes a SINGLE vNode, not an array.
// If you have multiple root elements, wrap them in a container div.
//
const content = div({}, () => [
  h1({}, () => "Tutorial 1: Getting Started"),
  div({ props: { className: "container" } }, () => [
    span({}, () => "Hello, "),
    span({ props: { style: "color: blue;" } }, () => "j-templates!"),
    span({}, () => " This is your first virtual node.")
  ])
]);

// ============================================================================
// Step 3: Render to the DOM
// ============================================================================
//
// Component.Attach() renders a vNode into a real DOM element.
// Parameters:
//   - First param: Target DOM element
//   - Second param: SINGLE vNode to render (not an array)
//
const app = document.getElementById("app")!;
Component.Attach(app, content);

// ============================================================================
// Try It Yourself
// ============================================================================
//
// 1. Change the text in the h1 element
// 2. Add another span with your name
// 3. Add styling using the props parameter
// 4. Create a new div with multiple paragraphs
//
// Example with styling:
// const styledDiv = div({
//   props: {
//     style: "background: #f0f0f0; padding: 10px; border-radius: 4px;"
//   }
// }, () => "Styled content");

// ============================================================================
// What's Next?
// ============================================================================
//
// In Tutorial 2, you'll learn how to create component classes with
// the Template() method. Components are reusable and have lifecycle hooks.
//
// See: docs/tutorials/02-your-first-component.md