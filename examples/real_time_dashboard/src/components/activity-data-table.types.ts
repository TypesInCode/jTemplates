/**
 * @file activity-data-table.types.ts
 * @description Type definitions for activity data components
 * 
 * This file demonstrates TypeScript interface design for jTemplates:
 * - Data transfer objects (DTOs)
 * - Service interfaces for dependency injection
 * - Abstract classes for service contracts
 * 
 * @purpose Shows type system design patterns for jTemplates applications
 * @see Activity - Full activity data model
 * @see User - User data model
 */

/**
 * ActivityRow interface - Simplified activity data for display.
 * 
 * @purpose Data transfer object for table display
 * @example
 * const row: ActivityRow = {
 *   timestamp: "2023-01-01T12:00:00Z",
 *   url: "https://example.com/dashboard",
 *   time_spent: 30.5,
 *   user: { name: "John Doe" }
 * };
 * 
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} url - Activity URL
 * @property {number} time_spent - Duration in seconds
 * @property {{ name: string }} user - Simplified user info (name only)
 * 
 * @jTemplates DTO pattern:
 * - Contains only data needed for display
 * - Flattens nested structures for easy access
 * - Optimized for rendering performance
 * 
 * @see Activity - Full activity model with nested User
 * @see activity-data-table.ts - Uses this interface for display
 */
export interface ActivityRow {
  /** ISO 8601 timestamp when activity occurred */
  timestamp: string;
  /** URL or resource accessed */
  url: string;
  /** Duration of activity in seconds */
  time_spent: number;
  /** User information (name only for display) */
  user: {
    name: string;
  };
}

/**
 * ActivityDataService - Abstract service interface for activity data.
 * 
 * @purpose Defines contract for activity data services
 * @example
 * // Concrete implementation:
 * class DataService implements ActivityDataService {
 *   GetActivityData(): ActivityRow[] {
 *     return [...];
 *   }
 * }
 * 
 * @jTemplates Dependency injection benefits:
 * - Abstract class enables interface-based dependency injection
 * - @Inject(ActivityDataService) can inject any concrete implementation
 * - Enables mocking for testing
 * - Follows dependency inversion principle
 * 
 * @see dataService.ts - Concrete implementation
 * @see app.ts:70 - Dependency injection usage
 * @see src/Utils/decorators.ts:504 - @Inject decorator
 */
export abstract class ActivityDataService {
  /**
   * Get activity data for display.
   * 
   * @abstract
   * @returns {ActivityRow[]} Array of activity rows for table display
   * 
   * @jTemplates Service method pattern:
   * - Returns display-optimized data
   * - Called by components for data access
   * - Enables separation of data access from UI
   */
  abstract GetActivityData(): ActivityRow[];
}
