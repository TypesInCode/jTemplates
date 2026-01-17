/**
 * @file user.ts
 * @description User data model interface
 * 
 * This file defines the basic user data structure used throughout the application.
 * It demonstrates simple domain modeling with jTemplates.
 * 
 * @purpose Shows basic entity modeling for application data
 */

/**
 * User interface - Represents a user in the system.
 * 
 * @purpose Domain model for user information
 * @example
 * const user: User = {
 *   id: "usr-123",
 *   name: "Jane Smith"
 * };
 * 
 * @property {string} id - Unique identifier for the user
 * @property {string} name - Full name of the user
 * 
 * @jTemplates Data modeling notes:
 * - Simple interfaces work seamlessly with jTemplates
 * - Properties are automatically reactive when used in components
 * - Store system can track objects by ID for sharing
 * 
 * @see Activity - Activity data that references users
 * @see ActivityRow - Display version that includes user data
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** Full name of the user */
  name: string;
}
