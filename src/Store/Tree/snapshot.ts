import { JsonType } from "../../Utils/json";
import { Opaque } from "./opaque";

/**
 * Resolves a keyed child to the root entity it should be read through. Returns the entity, or
 * undefined when the child isn't keyed (or has no root), in which case the child itself is used.
 */
export type SnapshotResolver = (child: any) => object | undefined;

/**
 * Snapshot cache state. Each owner (a `DiffTree` instance, or `ObservableNode` at module
 * level) creates its own state, so cached snapshots are never shared between owners.
 */
export interface ISnapshotState {
  /** Raw value -> its cached immutable snapshot */
  rawToSnapshotCache: WeakMap<object, any>;
  /** Raw value -> every parent whose cached snapshot embedded it */
  hierarchy: WeakMap<object, Set<object>>;
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
function InvalidateValue(state: ISnapshotState, value: object, invalidateCallback?: (value: any) => void) {
  const deleted = state.rawToSnapshotCache.delete(value);
  const parents = state.hierarchy.get(value);
  if (parents !== undefined) {
    state.hierarchy.delete(value);
    for (const parent of parents)
      if (state.rawToSnapshotCache.has(parent)) InvalidateValue(state, parent, invalidateCallback);
  }

  deleted && invalidateCallback?.(value);
}

/**
 * An immutable snapshot of a raw value (arrays and plain objects; an Opaque gives its raw
 * value, and other values are returned as they are). A snapshot is cached per raw value and returned as-is until a
 * write invalidates it. A rebuild makes new containers but reuses the cached snapshots of
 * unchanged children, so a snapshot handed out never changes and unchanged parts are
 * shared between snapshots. Keyed children are read through their root.
 */
function CreateSnapshot(
  state: ISnapshotState,
  resolve: SnapshotResolver | undefined,
  value: any
): any {
  if (JsonType(value) === "value") return Opaque.Open(value);

  const cached = state.rawToSnapshotCache.get(value);
  if (cached !== undefined) return cached;

  let snapshot: any;
  if (Array.isArray(value)) {
    snapshot = new Array(value.length);
    for (let x = 0; x < value.length; x++)
      snapshot[x] = ChildSnapshot(state, resolve, value, x);
  } else {
    snapshot = {};
    const keys = Object.keys(value);
    for (let x = 0; x < keys.length; x++)
      snapshot[keys[x]] = ChildSnapshot(state, resolve, value, keys[x]);
  }

  state.rawToSnapshotCache.set(value, snapshot);
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
  parent: any,
  key: string | number
) {
  const child = parent[key];
  if (JsonType(child) === "value") return Opaque.Open(child);

  CreateSnapshotLink(state, child as object, parent);
  const resolved = resolve?.(child);
  if (resolved !== undefined && resolved !== child) {
    CreateSnapshotLink(state, resolved, parent);
    return CreateSnapshot(state, resolve, resolved);
  }

  return CreateSnapshot(state, resolve, child);
}

function RegisterSnapshot(
  state: ISnapshotState,
  snapshot: any
) {
  if (JsonType(snapshot) !== 'value')
    state.rawToSnapshotCache.set(snapshot, snapshot);
}

export namespace Snapshot {
  /**
   * Creates a new, empty snapshot cache.
   * @returns A new snapshot state.
   */
  export function Create(): ISnapshotState {
    return {
      rawToSnapshotCache: new WeakMap(),
      hierarchy: new WeakMap(),
    };
  }

  /**
   * Returns an immutable, cached snapshot of a raw value. The same snapshot is returned
   * until a write invalidates it, and unchanged nested parts are shared between snapshots,
   * so `===` holds for any part that hasn't changed.
   * @param state The snapshot cache to read from and populate.
   * @param value The raw value to snapshot.
   * @param resolve Resolver for keyed children. Snapshots are cached per raw value, so a value
   * must always be read with the same resolver.
   * @returns The snapshot.
   */
  export function Get<T>(state: ISnapshotState, value: T, resolve?: SnapshotResolver): T {
    return CreateSnapshot(state, resolve, value);
  }

  /**
   * The snapshot of one property of a raw value, as the value's own snapshot would hold it:
   * cached, keyed children read through their root, and linked to the value so a write to the
   * property invalidates the value's snapshot. Reads one property without building a snapshot of
   * the whole value.
   * @param state The snapshot cache to read from and populate.
   * @param parent The raw value the property is on.
   * @param key The property.
   * @param resolve Resolver for keyed children.
   * @returns The property's snapshot.
   */
  export function Child(state: ISnapshotState, parent: any, key: string | number, resolve?: SnapshotResolver): any {
    return ChildSnapshot(state, resolve, parent, key);
  }

  /**
   * Invalidates the cached snapshot of a raw value that was just written to, along with
   * every cached ancestor that embedded it.
   * @param state The snapshot cache to invalidate.
   * @param value The raw value that was written to.
   */
  export function Invalidate(state: ISnapshotState, value: object, invalidateCallback?: (value: any) => void) {
    InvalidateValue(state, value, invalidateCallback);
  }

  /**
   * The cached snapshot of a raw value, without building one. A write to the value, or to
   * anything its snapshot embeds, clears the cache, so a reader that kept the snapshot it got
   * can tell nothing under the value changed when this returns that same snapshot.
   * @param state The snapshot cache.
   * @param value The raw value.
   * @returns The cached snapshot, or undefined when there's none.
   */
  export function Peek<T>(state: ISnapshotState, value: T): T | undefined {
    return state.rawToSnapshotCache.get(value as object);
  }

  /**
   * Registers a value as its own snapshot. Use in a case where an immutable value can
   * represent itself as a valid snapshot without cloning.
   * @param state The snapshot cache.
   * @param value The raw value that is its own snapshot.
   */
  export function Register(state: ISnapshotState, value: object) {
    RegisterSnapshot(state, value);
  }
}
