/**
 * @file activity.ts
 * @description Activity data model interface
 * 
 * This file defines the data structure for user activity records.
 * It demonstrates how to model domain entities with nested relationships.
 * 
 * @purpose Shows data modeling patterns for jTemplates applications
 * @see User - Nested user data structure
 */

import { User } from "./user";

/**
 * Activity interface - Represents a user activity record.
 * 
 * @purpose Domain model for tracking user activities in the application
 * @example
 * const activity: Activity = {
 *   id: "act-123",
 *   timestamp: "2023-01-01T12:00:00Z",
 *   url: "https://example.com/dashboard",
 *   time_spent: 30.5,
 *   user: { id: "usr-1", name: "John Doe" }
 * };
 * 
 * @property {string} id - Unique identifier for the activity
 * @property {string} timestamp - ISO 8601 timestamp when activity occurred
 * @property {string} url - URL or resource accessed during activity
 * @property {number} time_spent - Duration of activity in seconds
 * @property {User} user - Associated user information (nested object)
 * 
 * @jTemplates Data modeling notes:
 * - Interfaces are used for type safety
 * - Nested objects (like User) are supported directly
 * - Store system can handle nested object relationships
 * 
 * @see User - User data structure
 * @see ActivityRow - Simplified activity data for display
 */
export interface Activity {
  /** Unique identifier for the activity record */
  id: string;
  /** ISO 8601 timestamp when the activity occurred */
  timestamp: string;
  /** URL or resource accessed during the activity */
  url: string;
  /** Duration of the activity in seconds */
  time_spent: number;
  /** Associated user information (nested object) */
  user: User;
}
