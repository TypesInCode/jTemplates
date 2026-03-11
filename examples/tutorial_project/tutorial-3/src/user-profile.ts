/**
 * Tutorial 3: Reactive State Basics - User Profile Component
 *
 * This file demonstrates:
 * - Using @State decorator for complex state (objects)
 * - Deep reactivity - nested property changes trigger updates
 * - Form handling with reactive bindings
 *
 * Run this tutorial:
 * 1. npm install
 * 2. npm run dev
 * 3. Open http://localhost:5173 in your browser
 */

import { Component } from "j-templates";
import { State, Value } from "j-templates/Utils";
import { div, h2, h3, input, label, span, button } from "j-templates/DOM";

// ============================================================================
// Step 1: Why @State for Objects?
// ============================================================================
//
// @Value only tracks top-level changes. For objects with nested properties,
// you need @State for deep reactivity.
//
// ❌ Using @Value for objects:
// @Value()
// user = { name: "", email: "" };
// this.user.name = "John";  // UI WON'T update!
//
// ✅ Using @State for objects:
// @State()
// user = { name: "", email: "" };
// this.user.name = "John";  // UI updates!
//
// ============================================================================

// ============================================================================
// Step 2: The @State Decorator
// ============================================================================
//
// @State wraps your value in an ObservableNode proxy.
// This provides:
// - Deep reactivity for nested properties
// - Array mutation tracking (push, pop, splice, etc.)
// - Automatic proxy creation for nested objects/arrays
//
// Use @State for:
// - Objects with nested properties
// - Arrays
// - Any structure needing deep change detection
//
// ============================================================================

/**
 * User profile data interface
 */
interface UserData {
  name: string;
  email: string;
  age: number;
}

/**
 * UserProfile component demonstrates @State for complex state
 *
 * Features:
 * - Form with multiple fields
 * - Real-time preview of changes
 * - Deep reactivity for nested object properties
 * - Validation feedback
 */
class UserProfile extends Component {
  /**
   * Reactive user object using @State decorator
   *
   * The @State decorator:
   * - Creates an ObservableNode proxy
   * - Tracks changes to nested properties
   * - Notifies dependent bindings when ANY property changes
   * - Supports deep reactivity (user.name, user.email, etc.)
   */
  @State()
  user: UserData = {
    name: "",
    email: "",
    age: 0,
  };

  /**
   * Form submission status
   */
  @Value()
  isSubmitted: boolean = false;

  /**
   * Check if form is valid
   */
  private get isFormValid(): boolean {
    return (
      this.user.name.trim().length > 0 &&
      this.user.email.includes("@") &&
      this.user.age > 0
    );
  }

  /**
   * Handle name input change
   */
  private handleNameChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.user.name = target.value;
    this.isSubmitted = false; // Reset submission status
  }

  /**
   * Handle email input change
   */
  private handleEmailChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.user.email = target.value;
    this.isSubmitted = false;
  }

  /**
   * Handle age input change
   */
  private handleAgeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const age = parseInt(target.value, 10);
    this.user.age = isNaN(age) ? 0 : age;
    this.isSubmitted = false;
  }

  /**
   * Handle form submission
   */
  private handleSubmit() {
    if (this.isFormValid) {
      this.isSubmitted = true;
      console.log("Form submitted:", this.user);
      alert(
        `Profile saved!\n\nName: ${this.user.name}\nEmail: ${this.user.email}\nAge: ${this.user.age}`,
      );
    }
  }

  /**
   * Reset form to initial values
   */
  private handleReset() {
    this.user.name = "";
    this.user.email = "";
    this.user.age = 0;
    this.isSubmitted = false;
  }

  /**
   * Template() returns the vNode to render
   *
   * Notice all the reactive bindings:
   * - () => this.user.name - Updates when name changes
   * - () => this.isFormValid - Updates when any field changes
   * - () => this.user.age - Updates when age changes
   */
   Template() {
    return div({ props: { className: "profile" } }, [
      h2({}, () => "User Profile"),

      // Form section
      div({ props: { className: "form" } }, [
        // Name field
        div({ props: { className: "form-group" } }, [
          label({}, () => "Name:"),
          input({
            props: () => ({
              value: this.user.name,
              placeholder: "Enter your name",
              className:
                this.user.name.trim().length === 0 && this.isSubmitted
                  ? "error"
                  : "",
            }),
            on: { input: (e: Event) => this.handleNameChange(e) },
          }),
        ]),

        // Email field
        div({ props: { className: "form-group" } }, [
          label({}, () => "Email:"),
          input({
            props: () => ({
              value: this.user.email,
              placeholder: "Enter your email",
              className:
                !this.user.email.includes("@") && this.isSubmitted
                  ? "error"
                  : "",
            }),
            on: { input: (e: Event) => this.handleEmailChange(e) },
          }),
        ]),

        // Age field
        div({ props: { className: "form-group" } }, [
          label({}, () => "Age:"),
          input({
            props: () => ({
              type: "number",
              value: this.user.age > 0 ? String(this.user.age) : "",
              placeholder: "Enter your age",
              min: "0",
              max: "150",
            }),
            on: { input: (e: Event) => this.handleAgeChange(e) },
          }),
        ]),

        // Action buttons
        div({ props: { className: "actions" } }, [
          button(
            {
              on: { click: () => this.handleSubmit() },
              props: () => ({ disabled: !this.isFormValid }),
            },
            () => "Save Profile",
          ),

          button(
            {
              on: { click: () => this.handleReset() },
            },
            () => "Reset",
          ),
        ]),
      ]),

      // Preview section - shows reactive updates in real-time
      div({ props: { className: "preview" } }, [
        h3({}, () => "Live Preview:"),

        // Name preview - updates as you type
        span({}, () => `Name: ${this.user.name || "(empty)"}`),

        // Email preview - updates as you type
        span({}, () => `Email: ${this.user.email || "(empty)"}`),

        // Age preview - updates as you type
        span(
          {},
          () => `Age: ${this.user.age > 0 ? this.user.age : "(not set)"}`,
        ),

        // Validation status
        this.isSubmitted
          ? this.isFormValid
            ? span(
                { props: { className: "status success" } },
                () => "✓ Valid profile!",
              )
            : span(
                { props: { className: "status error" } },
                () => "✗ Please fix validation errors",
              )
          : span(
              { props: { className: "status info" } },
              () => "Fill out the form to save",
            ),
      ]),
    ]);
  }

  /**
   * Bound() is called when component is attached to DOM
   */
  Bound() {
    console.log("UserProfile component bound");
    console.log("Initial user data:", this.user);
  }
}

// Convert class to reusable function
const userProfile = Component.ToFunction("user-profile", UserProfile);

// Export only the factory function
export { userProfile };

// ============================================================================
// Try It Yourself
// ============================================================================
//
// 1. Add a "phone" field to the user object
// 2. Add address with nested fields (street, city, zip)
// 3. Add a "tags" array field with add/remove functionality
// 4. Add a character counter for the name field
//
// ============================================================================
