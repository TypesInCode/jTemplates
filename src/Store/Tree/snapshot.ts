import { JsonType } from "../../Utils/json";

/**
 * Resolves a keyed child to the root entity it should be read through. Returns undefined
 * when the child isn't keyed (or has no root), in which case the child itself is used.
 */
export type SnapshotResolver = (child: any) => object | undefined;

/**
 * Snapshot cache state. Each owner (a `DiffTree` instance, or `ObservableNode` at module
 * level) creates its own state, so cached snapshots are never shared between owners.
 */
export interface ISnapshotState {
  /** Raw value -> its cached immutable snapshot */
  cache: WeakMap<object, any>;
  /** Raw value -> every parent whose cached snapshot embedded it */
  hierarchy: WeakMap<object, Set<object>>;
  /** Default resolver for keyed children; a call to `Snapshot.Get` may override it */
  resolve: SnapshotResolver | undefined;
}

function CreateSnapshotLink(state: ISnapshotState, child: object, parent: object) {
  let parents = state.hierarchy.get(child);
  if (!parents) state.hierarchy.set(child, (parents = new Set()));
  parents.add(parent);
}

/**
 * Clears the cached snapshot for a raw value that was just written to, and climbs to
 * every parent whose own cached snapshot embedded it, so a write to a deeply nested value
 * invalidates every cached ancestor that still holds a snapshot.
 */
function InvalidateValue(state: ISnapshotState, value: object) {
  state.cache.delete(value);
  const parents = state.hierarchy.get(value);
  if (parents === undefined) return;
  state.hierarchy.delete(value);
  for (const parent of parents)
    if (state.cache.has(parent)) InvalidateValue(state, parent);
}

/**
 * An immutable snapshot of a raw value (arrays and plain objects; other values are
 * returned as they are). A snapshot is cached per raw value and returned as-is until a
 * write invalidates it. A rebuild makes new containers but reuses the cached snapshots of
 * unchanged children, so a snapshot handed out never changes and unchanged parts are
 * shared between snapshots. Keyed children are read through their root.
 */
function CreateSnapshot(
  state: ISnapshotState,
  resolve: SnapshotResolver | undefined,
  value: any,
): any {
  if (JsonType(value) === "value") return value;

  const cached = state.cache.get(value);
  if (cached !== undefined) return cached;

  let snapshot: any;
  if (Array.isArray(value)) {
    snapshot = new Array(value.length);
    for (let x = 0; x < value.length; x++)
      snapshot[x] = ChildSnapshot(state, resolve, value, value[x]);
  } else {
    snapshot = {};
    const keys = Object.keys(value);
    for (let x = 0; x < keys.length; x++)
      snapshot[keys[x]] = ChildSnapshot(state, resolve, value, value[keys[x]]);
  }

  state.cache.set(value, snapshot);
  return snapshot;
}

/**
 * A child's snapshot, linking the child to its parent so a write to the child
 * invalidates the parent. A keyed child's snapshot comes from its root, so the root is
 * linked too; the parent's own embedded copy stays linked because a positional write
 * (one that changes which entity a slot holds) mutates that copy in place.
 */
function ChildSnapshot(
  state: ISnapshotState,
  resolve: SnapshotResolver | undefined,
  parent: object,
  child: unknown,
) {
  if (JsonType(child) === "value") return child;

  CreateSnapshotLink(state, child as object, parent);
  const resolved = resolve?.(child);
  if (resolved !== undefined && resolved !== child) {
    CreateSnapshotLink(state, resolved, parent);
    return CreateSnapshot(state, resolve, resolved);
  }

  return CreateSnapshot(state, resolve, child);
}

export namespace Snapshot {
  /**
   * Creates a new, empty snapshot cache.
   * @param resolve Optional default resolver for keyed children.
   * @returns A new snapshot state.
   */
  export function Create(resolve?: SnapshotResolver): ISnapshotState {
    return {
      cache: new WeakMap(),
      hierarchy: new WeakMap(),
      resolve,
    };
  }

  /**
   * Returns an immutable, cached snapshot of a raw value. The same snapshot is returned
   * until a write invalidates it, and unchanged nested parts are shared between snapshots,
   * so `===` holds for any part that hasn't changed.
   * @param state The snapshot cache to read from and populate.
   * @param value The raw value to snapshot.
   * @param resolve Resolver for keyed children; defaults to the state's resolver.
   * @returns The snapshot.
   */
  export function Get<T>(
    state: ISnapshotState,
    value: T,
    resolve: SnapshotResolver | undefined = state.resolve,
  ): T {
    return CreateSnapshot(state, resolve, value);
  }

  /**
   * Invalidates the cached snapshot of a raw value that was just written to, along with
   * every cached ancestor that embedded it.
   * @param state The snapshot cache to invalidate.
   * @param value The raw value that was written to.
   */
  export function Invalidate(state: ISnapshotState, value: object) {
    InvalidateValue(state, value);
  }
}
