/**
 * @file generateActivities.ts
 * @description Sample data generator for activity records
 * 
 * This file demonstrates how to create mock data for development and testing.
 * It shows patterns for generating realistic random data.
 * 
 * @purpose Provides sample activity data for the dashboard
 * @see Activity - Activity data model
 * @see userNames - Sample user data
 */

import { Activity } from "../src/data/activity";
import { userNames } from "./names";

/**
 * Sample URLs for activity generation.
 * 
 * Represents common application routes that users might access.
 */
const urls = [
  "https://example.com/dashboard",
  "https://example.com/settings",
  "https://example.com/reports",
  "https://example.com/profile",
  "https://example.com/analytics",
  "https://example.com/users",
  "https://example.com/logs",
];

/**
 * Generate random activity data for testing and development.
 * 
 * @param {number} [count] - Optional number of activities to generate
 * @returns {Activity[]} Array of randomly generated activity objects
 * 
 * @example
 * // Generate default random number of activities (1-10):
 * const activities = generateActivities();
 * 
 * // Generate specific number of activities:
 * const activities = generateActivities(5);
 * 
 * @jTemplates Sample data patterns:
 * - Random data generation for development
 * - Realistic distributions (time, user selection)
 * - Proper data structure conformance
 * 
 * @see names.ts - Sample user data
 * @see activity.ts - Activity data model
 */
export function generateActivities(count?: number): Activity[] {
  // Generate random count if not specified (1-10 activities)
  const numActivities = count ?? Math.floor(Math.random() * 10) + 1;
  const activities: Activity[] = [];
  const now = new Date();

  for (let i = 0; i < numActivities; i++) {
    // Generate random timestamp within the last hour
    const timestamp = new Date(
      now.getTime() - Math.random() * 3600000, // 1 hour in milliseconds
    ).toISOString();

    // Select random user from sample data
    const user = userNames[Math.floor(Math.random() * userNames.length)];

    // Create activity with realistic random data
    activities.push({
      id: `act-${Date.now()}-${i}`, // Unique ID with timestamp
      timestamp, // Random timestamp within last hour
      url: urls[Math.floor(Math.random() * urls.length)], // Random URL
      time_spent: Math.floor(Math.random() * 300) / 10, // Random time 0-30 seconds
      user, // Random user
    });
  }

  return activities;
}
