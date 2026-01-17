/**
 * @file app.ts
 * @description Main application component for the Real-Time Dashboard
 * 
 * This file demonstrates the core jTemplates component architecture including:
 * - Component class structure
 * - Decorator usage (@Destroy, @Inject, @Computed)
 * - Dependency injection pattern
 * - Template composition
 * - Lifecycle methods (Bound)
 * - Service integration
 * 
 * @purpose Shows how to build a complete dashboard application using jTemplates
 * @see Component - Base component class
 * @see Destroy - Decorator for automatic cleanup
 * @see Inject - Decorator for dependency injection
 * @see Computed - Decorator for derived state
 * @see src/Utils/decorators.ts - Decorator implementations
 */

import { Component } from "j-templates";
import { Computed, Destroy, Inject } from "j-templates/Utils";
import { div } from "j-templates/DOM";
import { numberCard } from "./components/number-card";
import { ActivityDataService } from "./components/activity-data-table.types";
import { DataService } from "./services/dataService";
import { activityDataTable } from "./components/activity-data-table";
import { RefreshTimer } from "./services/refreshTimer";

import "./app.scss";

/**
 * App - Main dashboard component
 * 
 * @purpose Orchestrates the entire dashboard UI and manages data services
 * @features
 * - Dependency injection for data services
 * - Automatic cleanup of resources
 * - Derived state computation
 * - Template composition
 * - Auto-refresh functionality
 * 
 * @decorators
 * - @Destroy: Marks properties for automatic cleanup when component is destroyed
 * - @Inject: Provides dependency injection for services
 * - @Computed: Creates reactive derived state
 */
export class App extends Component {
  /**
   * Data service instance for fetching and managing activity data.
   * 
   * @Inject(ActivityDataService) - The @Inject decorator configures this property
   * to use dependency injection. The service instance is automatically
   * registered in the component's injector and can be accessed via this.dataService.
   * 
   * @Destroy() - The @Destroy decorator marks this property for automatic cleanup.
   * When the component is destroyed, the dataService.Destroy() method will be called
   * if the service implements the IDestroyable interface.
   * 
   * @jTemplates The @Inject decorator works by:
   * 1. Creating a getter/setter pair that uses the component's injector
   * 2. Storing the instance in the injector's type map
   * 3. Allowing child components to access the same instance via @Inject
   * 
   * @see src/Utils/decorators.ts:504 - Inject decorator implementation
   * @see src/Utils/injector.ts:20 - Injector.Get method
   * @see services/dataService.ts - DataService implementation
   */
  @Destroy()
  @Inject(ActivityDataService)
  dataService = new DataService();

  /**
   * Computed property that provides dashboard report data.
   * 
   * @Computed({ ... }) - Creates a reactive derived state property.
   * The decorator creates a StoreSync instance that caches the computed value
   * and automatically updates when dependencies change.
   * 
   * @jTemplates How @Computed works:
   * 1. Creates a getter scope that calls the getter function
   * 2. Watches the scope for changes
   * 3. When dependencies change, updates the StoreSync with new values
   * 4. Returns cached values from StoreSync until dependencies change
   * 
   * @returns Dashboard report object with statistics
   * 
   * @see src/Utils/decorators.ts:148 - Computed decorator implementation
   * @see src/Store/Store/storeSync.ts - StoreSync implementation
   */
  @Computed({
    topUrl: "",
    topUser: "",
    totalActivities: 0,
    uniqueUsers: 0,
    totalTime: 0,
    avgTimePerActivity: 0,
    topUserByVisits: 0,
    topUserByTime: "",
    topUserTimeSpent: 0,
    topUrlByVisits: 0,
    topUrlByTime: "",
    topUrlTimeSpent: 0,
  })
  get Report() {
    return this.dataService.GetReport();
  }

  /**
   * Timer for automatic data refresh.
   * 
   * @Destroy() - Automatically calls refreshTimer.Destroy() when component is destroyed,
   * preventing memory leaks from setInterval.
   * 
   * @see services/refreshTimer.ts - RefreshTimer implementation
   * @see src/Utils/decorators.ts:537 - Destroy decorator implementation
   */
  @Destroy()
  refreshTimer = new RefreshTimer(() => this.dataService.RefreshData(), 500);

  /**
   * Component template method.
   * 
   * Defines the UI structure using jTemplates DOM functions.
   * The template is reactive - any data references are automatically tracked
   * and the UI updates when data changes.
   * 
   * @jTemplates Template features used:
   * - div() function creates DOM elements
   * - Functions in data props enable reactivity
   * - Component.ToFunction() creates reusable components
   * - Dynamic data binding with arrow functions
   * 
   * @returns Array of virtual nodes representing the dashboard UI
   * 
   * @see src/Node/component.ts:105 - Template method definition
   * @see src/DOM/elements.ts - DOM element functions
   */
  Template() {
    return [
      // Metrics row with animated number cards
      div({ props: { className: "card-row" } }, () => [
        numberCard({
          data: () => ({
            title: "Total Visits",
            value: this.dataService.GetTotalVisits(),
          }),
        }),
        numberCard({
          data: () => ({
            title: "Total Time (s)",
            value: this.dataService.GetTotalTime(),
          }),
        }),
      ]),
      // Report statistics row
      div(
        {
          props: { className: "report-row" },
          // data: () => this.Report creates a reactive binding
          // When Report changes, this div's children are re-rendered
          data: () => this.Report
        },
        // The second parameter is a function that renders each data item
        (report) => [
          div({}, () => `Top User (Visits): ${report.topUser} (${report.topUserByVisits})`),
          div({}, () => `Top URL (Visits): ${report.topUrl} (${report.topUrlByVisits})`),
          div({}, () => `Top User (Time): ${report.topUserByTime} (${report.topUserTimeSpent}s)`),
          div({}, () => `Top URL (Time): ${report.topUrlByTime} (${report.topUrlTimeSpent}s)`),
          div({}, () => `Total Activities: ${report.totalActivities}`),
          div({}, () => `Unique Users: ${report.uniqueUsers}`),
          div({}, () => `Total Time: ${report.totalTime}s`),
          div({}, () => `Avg Time/Activity: ${report.avgTimePerActivity}s`),
        ],
      ),
      // Activity data table component
      activityDataTable({}),
    ];
  }

  /**
   * Lifecycle method called after component is bound to the DOM.
   * 
   * @Bound() - Called automatically by the framework after attachment
   * 
   * @jTemplates Lifecycle order:
   * 1. Component.Attach() is called
   * 2. vNode.Init() initializes the component
   * 3. Component constructor runs
   * 4. Bound() method is called
   * 5. Template is rendered and attached to DOM
   * 
   * @see src/Node/component.ts:113 - Bound method definition
   * @see src/Node/vNode.ts:178 - Component instantiation in InitNode
   */
  Bound(): void {
    this.refreshTimer.start();
  }
}

/**
 * Convert App class to a function component for use in templates.
 * 
 * Component.ToFunction transforms the class component into a factory function
 * that can be used to create virtual nodes in parent components.
 * 
 * @param {string} type - Component type name (used for debugging)
 * @param {typeof Component} constructor - Component class
 * 
 * @jTemplates Component.ToFunction:
 * 1. Creates a component factory function
 * 2. Returns a virtual node definition
 * 3. Enables component composition
 * 
 * @see src/Node/component.ts:158 - ToFunction implementation
 */
export const app = Component.ToFunction("app-component", App);
