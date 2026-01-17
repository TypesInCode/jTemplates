/**
 * @file activity-data-table.ts
 * @description Domain-specific activity data table component
 * 
 * This file demonstrates how to create specialized components by composing
 * generic components with domain-specific logic:
 * - Component composition pattern
 * - Dependency injection for services
 * - Custom cell rendering for domain data
 * - Column configuration for specific data types
 * 
 * @purpose Shows how to adapt generic components for specific use cases
 * @see data-table.ts - Generic table component being specialized
 * @see ActivityDataService - Data service interface
 * @see Inject - Decorator for dependency injection
 */

import { Component } from "j-templates";
import { vNode } from "j-templates/Node/vNode.types";
import { Column, dataTable } from "./data-table";
import { span } from "j-templates/DOM";
import { Inject } from "j-templates/Utils";
import { ActivityDataService, ActivityRow } from "./activity-data-table.types";

import "./activity-data-table.scss";

/**
 * Cell template for activity data.
 * 
 * Provides custom rendering logic for different activity data fields:
 * - timestamp: Formats ISO date string as locale string
 * - username: Displays user name from nested user object
 * - url: Displays activity URL
 * - timespent: Displays time spent with unit suffix
 * 
 * @implements {CellTemplate<ActivityRow>}
 * @see CellTemplate - Generic cell template interface
 */
const cellTemplate = {
  /**
   * Cell rendering function for activity data.
   * 
   * @param {ActivityRow} data - Activity data item
   * @param {Column} column - Column definition
   * @returns {vNode | vNode[]} Virtual nodes to render in the cell
   */
  cell: function (data: ActivityRow, column: Column) {
    switch (column.key) {
      case "timestamp":
        // Format ISO timestamp as locale string for display
        return span(
          {},
          () => `${new Date(Date.parse(data.timestamp)).toLocaleString()}`,
        );
      case "username":
        // Access nested user.name property
        return span({}, () => data.user.name);
      case "url":
        // Display URL directly
        return span({}, () => data.url);
      case "timespent":
        // Display time spent with seconds unit
        return span({}, () => `${data.time_spent}s`);
    }

    // Fallback for unknown columns
    return [];
  },
};

/**
 * Column configuration for activity data table.
 * 
 * Defines the structure and display properties for each column:
 * - timestamp: When the activity occurred
 * - timespent: Duration of the activity in seconds
 * - username: User who performed the activity
 * - url: Resource accessed during the activity
 * 
 * @see Column - Column definition interface
 */
const columns: Column[] = [
  {
    key: "timestamp",
    name: "Time Stamp",
    class: "timestamp-cell",
  },
  {
    key: "timespent",
    name: "Time Spent",
    class: "time-spent-cell",
  },
  {
    key: "username",
    name: "User Name",
    class: "user-cell",
  },
  {
    key: "url",
    name: "Url",
    class: "url-cell",
  },
];

/**
 * ActivityDataTable - Specialized table component for displaying activity data.
 * 
 * @purpose Demonstrates component composition and service integration
 * @features
 * - Uses generic dataTable component internally
 * - Injects ActivityDataService for data access
 * - Provides domain-specific column configuration
 * - Handles custom cell rendering for activity data
 * 
 * @jTemplates Component composition pattern:
 * 1. Creates specialized component that uses generic components
 * 2. Provides domain-specific configuration and data
 * 3. Maintains clean separation of concerns
 */
class ActivityDataTable extends Component {
  /**
   * Injected activity data service.
   * 
   * @Inject(ActivityDataService) - Uses dependency injection to get service instance.
   * The service is provided by parent components (in this case, the App component).
   * 
   * @jTemplates Dependency injection benefits:
   * - Decouples component from concrete service implementation
   * - Enables easy testing with mock services
   * - Follows dependency inversion principle
   * 
   * @see src/Utils/decorators.ts:504 - Inject decorator implementation
   * @see app.ts:70 - Service registration in parent component
   */
  @Inject(ActivityDataService)
  service!: ActivityDataService;

  /**
   * Component template method.
   * 
   * Composes the generic dataTable component with activity-specific configuration.
   * 
   * @returns {vNode | vNode[]} Virtual nodes representing the activity table
   * 
   * @jTemplates Composition pattern:
   * - Uses dataTable function component
   * - Passes activity-specific data and templates
   * - Leverages generic component for specific use case
   */
  Template(): vNode | vNode[] {
    return dataTable(
      {
        // Provide activity data and column configuration to generic table
        data: () => ({
          data: this.service.GetActivityData(), // Activity data from service
          columns: columns // Activity-specific column configuration
        })
      },
      cellTemplate, // Activity-specific cell rendering
    );
  }
}

/**
 * Convert ActivityDataTable class to function component.
 * 
 * @jTemplates Component.ToFunction enables:
 * - Reuse in parent components
 * - Type-safe data passing
 * - Consistent component interface
 * 
 * @example
 * // Usage in parent component:
 * activityDataTable({})
 * 
 * @see src/Node/component.ts:158 - ToFunction implementation
 */
export const activityDataTable = Component.ToFunction(
  "activity-data-table",
  ActivityDataTable,
);
