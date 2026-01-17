/**
 * @file names.ts
 * @description Sample user data for development and testing
 * 
 * This file provides realistic sample user data that can be used:
 * - For development and testing
 * - As mock data in examples
 * - For prototyping UI components
 * 
 * @purpose Demonstrates data structure for user information
 * @see User - User data model interface
 * @see generateActivities.ts - Uses this data for activity generation
 */

/**
 * Sample user data array.
 * 
 * @constant {Array<{ id: string, name: string }>} userNames
 * @example
 * // Access random user:
 * const randomUser = userNames[Math.floor(Math.random() * userNames.length)];
 * 
 * @jTemplates Sample data patterns:
 * - Realistic user names
 * - Consistent ID format (usr-XXX)
 * - Proper data structure conformance to User interface
 * 
 * @see User - User data model
 * @see generateActivities.ts - Uses this data for activity generation
 */
export const userNames = [
  { id: "usr-001", name: "Alice Johnson" },
  { id: "usr-002", name: "Bob Smith" },
  { id: "usr-003", name: "Carol Davis" },
  { id: "usr-004", name: "David Wilson" },
  { id: "usr-005", name: "Eva Martinez" },
  { id: "usr-006", name: "Frank Garcia" },
  { id: "usr-007", name: "Grace Lee" },
  { id: "usr-008", name: "Henry Brown" },
  { id: "usr-009", name: "Ivy Chen" },
  { id: "usr-010", name: "Jack Taylor" },
  { id: "usr-011", name: "Karen White" },
  { id: "usr-012", name: "Leo Harris" },
  { id: "usr-013", name: "Mia Robinson" },
  { id: "usr-014", name: "Noah Clark" },
  { id: "usr-015", name: "Olivia Walker" },
  { id: "usr-016", name: "Peter Hall" },
  { id: "usr-017", name: "Quinn Allen" },
  { id: "usr-018", name: "Rosa Young" },
  { id: "usr-019", name: "Sam King" },
  { id: "usr-020", name: "Tina Wright" },
  { id: "usr-021", name: "Uma Scott" },
  { id: "usr-022", name: "Victor Green" },
  { id: "usr-023", name: "Wendy Adams" },
  { id: "usr-024", name: "Xavier Baker" },
  { id: "usr-025", name: "Yara Nelson" },
  { id: "usr-026", name: "Zach Carter" },
  { id: "usr-027", name: "Amy Mitchell" },
  { id: "usr-028", name: "Brian Perez" },
  { id: "usr-029", name: "Chloe Roberts" },
  { id: "usr-030", name: "Derek Turner" }
];
