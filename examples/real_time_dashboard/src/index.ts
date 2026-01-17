/**
 * @file index.ts
 * @description Entry point for the Real-Time Dashboard application
 * 
 * This file demonstrates the minimal setup required to bootstrap a jTemplates application.
 * It imports the main application component and attaches it to the DOM.
 * 
 * @purpose Shows how to initialize and mount a jTemplates application
 * @see app.ts - The main application component
 * @see src/Node/component.ts:214 - Component.Attach implementation
 * @see src/Node/vNode.ts:116 - vNode.Attach implementation
 */

import { Component } from "j-templates";
import { app } from "./app";

/**
 * The root DOM element where the application will be mounted.
 * This is typically defined in index.html as a global variable.
 * 
 * @jTemplates The Component.Attach method requires a DOM element to mount the application.
 * The root element is usually defined in HTML as:
 * <div id="app"></div>
 * <script>const root = document.getElementById('app');</script>
 */
declare const root: HTMLElement;

/**
 * Mount the application to the DOM.
 * 
 * Component.Attach is the jTemplates entry point that:
 * 1. Initializes the virtual node (vNode.Attach -> vNode.Init)
 * 2. Creates the DOM node structure
 * 3. Instantiates the component using the component factory
 * 4. Calls the component's Bound() lifecycle method
 * 5. Renders the component's template
 * 6. Attaches the rendered DOM to the root element
 * 7. Sets up reactive data bindings and event listeners
 * 
 * @param {HTMLElement} root - The DOM element to mount the application
 * @param {vNode} component - The virtual node representing the application component
 * 
 * @jTemplates The attachment process:
 * - vNode.Init() initializes the component and its children
 * - Component factory creates the component instance
 * - Bound() lifecycle method is called after attachment
 * - Reactive scopes are established for data binding
 * - Event listeners are attached
 * 
 * @example
 * // In index.html:
 * // <div id="app"></div>
 * // <script>const root = document.getElementById('app');</script>
 * Component.Attach(root, app({}));
 */
Component.Attach(root, app({}));
