/**
 * @file dataService.ts
 * @description Data service for activity data management
 * 
 * This file demonstrates advanced jTemplates state management patterns:
 * - StoreAsync with key functions for object sharing
 * - ObservableScope for reactive computations
 * - ObservableNode for nested data access
 * - Complex derived state calculations
 * - Automatic cleanup with IDestroyable
 * 
 * @purpose Shows how to build sophisticated data services with jTemplates
 * @see StoreAsync - Asynchronous store with key-based object sharing
 * @see ObservableScope - Reactive computation scopes
 * @see ObservableNode - Nested observable data structures
 * @see src/Store/Store/storeAsync.ts - StoreAsync implementation
 * @see src/Store/Tree/observableScope.ts - ObservableScope implementation
 */

import {
  ActivityDataService,
  ActivityRow,
} from "../components/activity-data-table.types";
import { generateActivities } from "../../sample_data/generateActivities";
import { ObservableNode, ObservableScope, StoreAsync } from "j-templates/Store";
import { Activity } from "@/data/activity";
import { IDestroyable } from "j-templates/Utils";

/**
 * DataService - Service for managing and analyzing activity data.
 * 
 * @purpose Central data management with reactive computations and statistics
 * @features
 * - Asynchronous data storage with StoreAsync
 * - Key-based object sharing for memory efficiency
 * - Reactive derived state calculations
 * - Statistics computation
 * - Data refresh functionality
 * 
 * @implements {ActivityDataService} - Data service interface
 * @implements {IDestroyable} - Automatic resource cleanup
 * 
 * @jTemplates Key concepts demonstrated:
 * - StoreAsync with key function for object sharing
 * - ObservableScope for reactive computations
 * - ObservableNode for nested data access
 * - Automatic dependency tracking
 */
export class DataService implements ActivityDataService, IDestroyable {
  /**
   * StoreAsync with a key function for object sharing.
   * 
   * The key function (value => value.id) extracts an identity from each stored
   * object, so objects with the same ID reference the same instance — e.g. two
   * activities with the same user share one user object.
   * 
   * @see src/Store/Store/storeAsync.ts:39 - StoreAsync class
   * @see src/Store/Store/store.ts - Base Store class
   */
  private store = new StoreAsync((value) => value.id);

  /**
   * Reactive scope for sorted activity data.
   * 
   * ObservableScope.Create tracks the observables read inside the callback and
   * re-computes (and caches) the result whenever a dependency changes.
   * 
   * @see src/Store/Tree/observableScope.ts:733 - ObservableScope class
   */
  private activityData = ObservableScope.Create(() => {
    const activities = this.store.Get<Activity[]>("activities", []);
    const data = ObservableNode.Unwrap(activities).slice();

    // Sort by timestamp (newest first)
    data.sort((a, b) =>
      a.timestamp < b.timestamp ? 1 : a.timestamp === b.timestamp ? 0 : -1,
    );
    return data;
    // Alternative commented approach showing method chaining
    // this.store
    //   .Get<Activity[]>("activities", [])
    //   .slice()
    //   .sort((a, b) =>
    //     a.timestamp < b.timestamp ? 1 : a.timestamp === b.timestamp ? 0 : -1,
    //   ),
  });
  
  /**
   * Getter for activity data (reactive).
   * 
   * @ObservableScope.Value - Accesses the current value of the scope
   * Returns cached result until dependencies change.
   */
  get ActivityData() {
    return ObservableScope.Value(this.activityData);
  }

  /**
   * Reactive scope for unique user count.
   * 
   * Computes the number of unique users from activity data.
   * Automatically updates when activity data changes.
   */
  private userCount = ObservableScope.Create(
    () =>
      this.ActivityData.reduce((pre, curr) => {
        pre.add(curr.user.id);
        return pre;
      }, new Set<string>()).size,
  );
  get UserCount() {
    return ObservableScope.Value(this.userCount);
  }

  /**
   * Reactive scope for total visits count.
   * 
   * Simple count of all activities.
   */
  private totalVisits = ObservableScope.Create(() => this.ActivityData.length);
  get TotalVisits() {
    return ObservableScope.Value(this.totalVisits);
  }

  /**
   * Reactive scope for total time spent.
   * 
   * Sums up time_spent across all activities.
   */
  private totalTime = ObservableScope.Create(() =>
    this.ActivityData.reduce((pre, curr) => pre + curr.time_spent, 0),
  );
  get TotalTime() {
    return ObservableScope.Value(this.totalTime);
  }

  /**
   * Reactive scope for the comprehensive activity report.
   * 
   * Computes top user/URL by visits and time, plus totals and averages, in a
   * single O(n) pass using object maps for counting.
   */
  private report = ObservableScope.Create(() => {
    let topUser = "";
    let topUserCount = 0;
    let topUrl = "";
    let topUrlCount = 0;
    let topUserByTime = "";
    let topUserTimeSpent = 0;
    let topUrlByTime = "";
    let topUrlTimeSpent = 0;

    const data = ObservableScope.Value(this.activityData);

    // Use object maps for efficient counting
    const userCounts: { [userId: string]: number } = {};
    const urlCounts: { [url: string]: number } = {};
    const userTimeSpent: { [userId: string]: number } = {};
    const urlTimeSpent: { [url: string]: number } = {};

    for (let x = 0; x < data.length; x++) {
      const row = data[x];
      const userId = row.user.id;
      
      // Count visits per user
      userCounts[userId] ??= 0;
      userCounts[userId]++;
      if (userCounts[userId] > topUserCount) {
        topUserCount = userCounts[userId];
        topUser = userId;
      }

      // Sum time spent per user
      userTimeSpent[userId] ??= 0;
      userTimeSpent[userId] += row.time_spent;
      if (userTimeSpent[userId] > topUserTimeSpent) {
        topUserTimeSpent = userTimeSpent[userId];
        topUserByTime = userId;
      }

      const url = row.url;
      // Count visits per URL
      urlCounts[url] ??= 0;
      urlCounts[url]++;
      if (urlCounts[url] > topUrlCount) {
        topUrlCount = urlCounts[url];
        topUrl = url;
      }

      // Sum time spent per URL
      urlTimeSpent[url] ??= 0;
      urlTimeSpent[url] += row.time_spent;
      if (urlTimeSpent[url] > topUrlTimeSpent) {
        topUrlTimeSpent = urlTimeSpent[url];
        topUrlByTime = url;
      }
    }

    const totalTime = data.reduce((pre, curr) => pre + curr.time_spent, 0);
    const avgTimePerActivity = data.length > 0 ? totalTime / data.length : 0;

    return {
      topUrl,
      // Object sharing in action - store.Get returns the shared user object
      topUser: this.store.Get(topUser, { name: "" }).name,
      totalActivities: data.length,
      uniqueUsers: Object.keys(userCounts).length,
      totalTime: Number(totalTime.toFixed(1)),
      avgTimePerActivity: Number(avgTimePerActivity.toFixed(1)),
      topUserByVisits: topUserCount,
      // Object sharing - same user instance is retrieved
      topUserByTime: this.store.Get(topUserByTime, { name: "" }).name,
      topUserTimeSpent: Number(topUserTimeSpent.toFixed(1)),
      topUrlByVisits: topUrlCount,
      topUrlByTime: topUrlByTime,
      topUrlTimeSpent: Number(topUrlTimeSpent.toFixed(1)),
    };
  });

  /**
   * Getter for activity report (reactive).
   * 
   * @returns Complete activity statistics object
   */
  get Report() {
    return ObservableScope.Value(this.report);
  }

  /**
   * Constructor - Initializes with sample data.
   * 
   * @jTemplates Store.Write:
   * - Asynchronously writes data to store
   * - Triggers all dependent scopes to recompute
   * - Returns Promise<void>
   */
  constructor() {
    // Fire-and-forget StoreAsync write: the constructor can't be async, and the
    // UI tolerates the eventual consistency because scopes resolve to an empty
    // array until the write lands, then re-render with data. If you needed the
    // data before rendering, await the write in an async init() instead.
    this.store.Write(generateActivities(2), "activities");
  }

  /**
   * Refresh data with new random activities.
   * 
   * Store.Push appends to the activities array; dependent scopes re-compute and
   * the UI updates automatically through reactivity.
   * 
   * @see src/Store/Store/storeAsync.ts:106 - StoreAsync.Push method
   */
  RefreshData() {
    const nextActivities = generateActivities();
    // Fire-and-forget StoreAsync push — the reactive scopes re-compute once the
    // worker applies the diff, so the UI updates asynchronously. No need to await
    // here because nothing reads the pushed data back in this same call.
    this.store.Push("activities", ...nextActivities);
  }

  /**
   * Get activity report (implements ActivityDataService interface).
   * 
   * @returns Current activity report
   */
  GetReport() {
    return this.Report;
  }

  /**
   * Get total visits count (implements ActivityDataService interface).
   * 
   * @returns Total number of activities
   */
  GetTotalVisits(): number {
    return this.TotalVisits;
  }

  /**
   * Get total time spent (implements ActivityDataService interface).
   * 
   * @returns Total time spent across all activities
   */
  GetTotalTime(): number {
    return this.TotalTime;
  }

  /**
   * Get activity data (implements ActivityDataService interface).
   * 
   * @returns Array of activity rows for display
   */
  GetActivityData(): ActivityRow[] {
    return this.ActivityData;
  }

  /**
   * Cleanup resources (implements IDestroyable interface).
   * 
   * @Destroy - Called automatically when service is no longer needed:
   * 1. Called by @Destroy decorator in parent component
   * 2. Cleans up StoreAsync resources
   * 3. Prevents memory leaks
   * 
   * @see src/Utils/utils.types.ts - IDestroyable interface
   * @see app.ts:69 - @Destroy decorator usage
   */
  Destroy(): void {
    this.store.Destroy();
  }
}
