/**
 * Tutorial 4: Template System Deep Dive - Main Application
 *
 * This file demonstrates:
 * - Using components together
 * - Composing a full application
 *
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { todoList } from "./todo-list.js";

/**
 * Main App component
 */
class App extends Component {
  Template() {
    return todoList();
  }
}

// Convert App class to a function component
const appComponent = Component.ToFunction("app-component", App);

// Attach the Component to the DOM
const appElement = document.getElementById("app")!;
Component.Attach(appElement, appComponent({}));