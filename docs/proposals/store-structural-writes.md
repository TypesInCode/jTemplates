# Proposal: Structural Writes and Cached Snapshots for the Store

Status: proposal 3 (cached snapshots) is implemented; proposals 1 and 2 are drafts, for discussion. Builds on the structural `Splice` (`DiffTree.SplicePath`, `ObservableNode.ApplySplice`).

## Summary

The store's goal is ergonomics: reactive data is read and written as plain data, and objects with a key are flattened into entities of their own, so a write to one entity shows everywhere it appears. That holds for reads and for targeted writes. It breaks down for large structural writes, where the cost depends on how the store works inside rather than on what changed.

Three changes would close most of that gap:

1. **Key-matched array diffs.** A `Write` of an array of keyed entities compares keys, not slots, and moves entities by reference.
2. **Nested paths for `Push` and `Splice`, typed.** Both accept a path into a root, as `Write` does, so an app's data can keep its natural shape.
3. **Cached snapshots** (implemented). Plain values are cached per node and invalidated along the path from a write to its roots, so reading a snapshot after a small edit reuses everything that didn't change. `toJSON()` now returns the snapshot.

## Motivation

Measured in an app with a 5,000-row array of keyed entities (10 fields each), with `StoreSync`:

| Operation | Time |
| --- | --- |
| `Splice` at index 0, before `SplicePath` | about 206 ms |
| `Splice` at index 0, with `SplicePath` | 0.1–0.4 ms |
| Restore 5,000 unchanged entities into an emptied root (`Write`, `Push` or `Splice`) | 55–65 ms |
| `toJSON()` of the 5,000-row root | about 18–26 ms |

The structural `Splice` shows the pattern: when an operation describes the structural change instead of rewriting the positions it affects, the cost drops from proportional to the array to proportional to the change. The other two rows are what's left:

- A `Write` of an array is still diffed position by position. A reorder, or a restore of entities the store already holds, compares and clones every member. Each member is cloned three or four times: in `FlattenValue`, in `JsonDeepClone`, on the node, and across `postMessage` for `StoreAsync`.
- `toJSON()` rebuilt its whole subtree on every call. In that app it was most of the cost of a one-row edit, more than the store write itself. Proposal 3, now implemented, addresses this.

Apps work around this today by splitting their data into many roots so `Push` and `Splice` apply (they take a root key only), and by keeping their own partial snapshots. Both are the store's layout leaking into the app's data model.

## 1. Key-matched array diffs

### Design

The change is in `JsonDiffArrays`, which `Write` uses. When the old and new arrays both hold only keyed objects (the `keyFunc` returns a key for every member), compare their key lists:

- **Same keys in the same order:** diff as today. Field changes inside members already reach each entity at its own key through `ResolveKeyPath`.
- **Otherwise:** emit one structural entry for the array, meaning "the array at this path now holds these entities, in this order":

  ```ts
  type DiffArrayKeysEntry = {
    path: (string | number)[];
    keys: string[];
  };
  ```

  followed by the same pass `SpliceSource` makes: flatten the new members and diff each against the root the tree already holds (`source[key]`). A member the tree doesn't hold is added whole; one held unchanged produces nothing; one with changed data produces field diffs.

Arrays that mix keyed and unkeyed members, or hold no keyed members, keep the positional diff.

### Why a key list rather than moves

A result type with explicit moves (`from`, `to`) is not needed:

- A key list is idempotent: applying it twice gives the same array. A list of moves has to be applied in order, and each move depends on the ones before it.
- The node side doesn't need to reconcile anything. It rebuilds the raw array from the entities it holds, by key, and replaces the array's contents.
- Across the worker boundary it is a few thousand strings instead of member data.

### Node side

For a `DiffArrayKeysEntry`, the store:

1. applies the flattened entity diffs first (`UpdateRootMap`), so every key in the list is a root before the array refers to it (the same order `Splice` uses);
2. builds the new raw array from `rootMap` by key (the raw values, not proxies), replaces the array's contents in place, and fires one `ObservableNode.Update` for the array.
3. calls `InvalidateSnapshotForValue` on the array, as every other write path does, so cached snapshots of it and its ancestors are rebuilt (proposal 3).

No member is cloned or diffed field by field. Readers of entities whose data didn't change don't wake.

### Effect

A reorder, or a restore of entities the store still holds (an undo after a removal), costs about what a `Splice` costs now: one pass over the key list plus the work for members that actually changed. It also makes `Splice` less critical: an app can write the whole array and get the same cost.

### Open questions

- **Where the check runs.** Checking "every member is keyed" is a full pass over both arrays; it can stop at the first unkeyed member. The key lists can be built in the same pass.
- **Duplicate keys in one array.** Today the same entity can appear twice in an array. The key list handles that (a key can repeat), but the entry needs a test.
- **`ApplyDiff` root replacement.** The branch that replaces a root array whole (`splice(0, length, ...)`) should take the same path when the new value is a keyed array.

### Tests

- A reorder of N keyed members produces one `DiffArrayKeysEntry` and no member diffs; readers of the members don't wake; a reader of the array wakes once.
- Restoring removed members that are still roots produces no member diffs.
- A write that both reorders and changes one member produces the key list plus that member's field diffs, and wakes only that member's readers.
- Mixed and unkeyed arrays produce the same result as today.
- `StoreSync` and `StoreAsync` give the same arrays (the shared cases in `test/store/splice-cases.ts` are a model).

## 2. Nested paths for `Push` and `Splice`

### Runtime

`Push` and `Splice` currently take a root key only, and reject a dotted path. They should resolve a path the way `Write` does:

- On the diff side, `SpliceSource` already reads the array through `GetPathValue`. The path should first be resolved to its nearest keyed entity (`ResolveKeyPath`), so that a path into an entity splices that entity's array and the change reaches every parent that holds it.
- On the node side, `SpliceRootObject` must walk the same path to the same array before calling `ApplySplice`. Without that walk the two sides diverge: the diff side splices the nested array and the node side fails or splices the wrong one.
- `Push` becomes `Splice` at `length` with `deleteCount` 0, so it shares the path handling and the cheap insert.
- Snapshots need nothing extra: `ApplySplice` already invalidates the array it splices, and the parent links carry that up to the root (proposal 3).

### Types

Two forms, both type-checked:

- **Tuple paths**, `store.Splice(["doc", "list"], 0, 1)`. These type easily with a recursive tuple type, and they avoid string parsing. They also avoid an ambiguity dotted strings have: keys are data, and a key that contains `.` can't be written as a dotted path.
- **Dotted strings as sugar**, `store.Splice("doc.list", 0, 1)`, using template literal types:

  ```ts
  type Path<T, Depth extends unknown[] = []> = Depth["length"] extends 6
    ? never
    : T extends readonly (infer E)[]
      ? `${number}` | `${number}.${Path<E, [...Depth, 1]>}`
      : T extends object
        ? { [K in keyof T & string]: K | `${K}.${Path<T[K], [...Depth, 1]>}` }[keyof T & string]
        : never;
  ```

  with `PathValue<T, P>` resolving the value type, and `Splice` accepting only paths whose value is an array.

Cap the recursion depth, since large or recursive types slow the compiler down. Paths could stop at keyed entities: a path into an entity is better written at the entity's key, which is where `ResolveKeyPath` sends it at runtime anyway.

### Tests

- `Splice` and `Push` on a nested array, including one inside a keyed entity that two parents hold: both parents show the change.
- After a nested `Splice`, a `Write` by index into the same array finds the right member. This is the check that the diff side and the node side agree.
- A path to a non-array, or a path that doesn't exist, is rejected without changing either side.

## 3. Cached snapshots (implemented)

`ObservableNode.Snapshot(proxy)` returns an immutable plain copy of a node, and `toJSON()` on a node returns the same object. The implementation is in `src/Store/Tree/observableNode.ts` (`CreateSnapshot`, `ChildSnapshot`, `CreateSnapshotLink`, `InvalidateSnapshotForValue`).

### Design

- **A cache per node, keyed by the raw value** (`valueSnapshotCache`, a `WeakMap`). No node wrappers, proxies or scopes are created to take a snapshot, so the store stays lazy. Entries go when the store drops the raw value.
- **Parent links recorded while building** (`valueSnapshotHierarchy`, a `WeakMap` from a raw child to the set of raw parents holding it). A keyed entity can have several parents.
- **A cached snapshot is returned as-is.** A rebuild makes new containers but reuses the cached snapshots of unchanged children, so a snapshot handed out never changes and unchanged parts are shared between snapshots.
- **Invalidation climbs from the written value to its roots.** Every write path calls `InvalidateSnapshotForValue` with the raw value it changes: `SetObjectValue`, `SetArrayValue`, the mutating array methods in `ArrayProxyGetter`, the no-wrapper branch of `Assign`, `ApplySplice`, and the root-replacement branch of `ApplyDiff`. It clears the value's entry, deletes its links, and recurses into each parent that is still cached. An uncached parent means every ancestor above it is uncached too (building a node builds its children), so the climb stops there, and a write with many diff entries climbs once.
- **Keyed children are linked twice.** Their snapshot comes from their root (through `alias`), so the root is linked to the container. The container's own embedded copy is linked too, because a positional write (one that changes which entity a slot holds) mutates that copy in place, not the root.

### Performance

Measured on an app workload (90 keyed collections, 20,090 rows; largest array 5,000 rows × 25 values; `StoreSync`):

| Read | `toJSON()` before | Snapshot, walking every node | Snapshot, parent links (implemented) |
| --- | --- | --- | --- |
| Largest array, no change | 19.0 ms | 15.8 ms | ~0 ms |
| Largest array, after a one-field edit | 18.0 ms | 15.2 ms | 2.4 ms |
| Largest array, after an insert at index 0 | 18.0 ms | 15.7 ms | 2.4 ms |
| All 99 roots, no change | 37.4 ms | 34.4 ms | 0.05 ms |
| All 99 roots, after a one-field edit | 36.8 ms | 35.2 ms | 2.3 ms |

The first build costs about what `toJSON()` did (25 ms). After a one-field edit, 5,008 of the array's 5,009 rows are the same objects as in the previous snapshot. The remaining ~2.3 ms is rebuilding the 5,000-slot array, where each slot is a cache hit.

A first version that walked every node on each read, checking child identity (copy-on-write), was correct but barely faster than `toJSON()`: visiting every node costs about 5 ms on its own for this array, `alias` about a quarter of a read, `Object.keys` about 2 ms (`for...in` was slower). Skipping unchanged subtrees, through the parent links, is what made reads fast. The per-root version counter in `Store` considered earlier was not needed.

### Breaking change

`toJSON()` used to return a fresh copy that callers could modify. It now returns a shared snapshot, so modifying the result changes what every later reader sees, including the cache. Callers must treat it as read-only.

### Tests

`test/store/snapshot-cases.ts` (21 cases, run on `StoreSync` by `snapshot-test.ts` and on `StoreAsync` by `snapshot-test-async.ts`) and the plain-node cases in `snapshot-test.ts` cover reading, identity, invalidation by every write path, isolation from the store, and a randomised sequence of writes checked against the stored data. Expected values are read through the store's proxies, not from `toJSON()`.

### Deferred

- **Freezing snapshots in development builds.** There is no development flag yet. The suggested one reads `process.env.NODE_ENV` inside a `try`/`catch` (bundlers replace it with a literal; without a bundler `process` doesn't exist and the checks stay on), with `SetDevMode` to override. A `typeof process` guard would not work in browser bundles, where `process` doesn't exist even though the bundler replaced `process.env.NODE_ENV`.
- **Reactive snapshots**, behind a flag. A lazy way: a `Basic` scope per snapshotted node, created only for reactive reads and fired from `InvalidateSnapshotForValue`.
- **Per-container tracking of cleared children**, to make a rebuild proportional to what changed rather than to the container's size. Not needed at the measured cost.
- **Self-referencing entities.** An entity that holds a reference to itself through a key would recurse without end.

## Related findings

Smaller issues found while moving an app's state onto the store:

- **Divergence goes undetected.** Every bug in the first structural `Splice` was the diff side and the node side disagreeing. A debug mode that compares the two after each operation, run in the test suite, would turn that class of bug into an immediate failure.
- **Roots can't be deleted.** There is no way to drop a root, and removed keyed entities stay registered. Long-lived stores only grow. Stores of destroyed owners can also stay reachable (in tests, an injected `StoreSync` is never destroyed).
- **Modelling rules are learned by hitting them.** A keyed object must keep one shape (`null`, not a missing field), `Patch` can't carry keyed values, and `keyFunc` is serialized with `toString()` and `eval`'d in the worker, so a closure breaks silently. These belong in the syntax primer, with the cost model above.
- **Errors are thrown as strings**, so they carry no stack. Throwing `Error` objects would make them easier to trace.

## Suggested order

Cached snapshots (proposal 3) are done. For the rest:

1. Key-matched array diffs (largest effect; makes whole-array writes as cheap as `Splice`).
2. Nested paths for `Push` and `Splice` (removes the need to split data into roots).
3. The debug consistency check, early, since 1 and 2 add new ways for the two sides to diverge.
4. The snapshot follow-ups under "Deferred", starting with the development-build freeze.
