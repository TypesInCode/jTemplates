export type JsonWrite = {
  type: "write",
  path: (string | number)[],
  value: unknown
};

/** Removes the property the path ends with from the object holding it */
export type JsonDelete = {
  type: "delete",
  path: (string | number)[]
};

/** How an inserted splice item gets its value */
export enum SPLICE_ACTION {
  /** The element at `from` in the array before the splice is applied */
  MOVE = 1,
  /** A new value */
  INSERT = 2
}

export type JsonSpliceItem =
  | { type: SPLICE_ACTION.MOVE, from: number }
  | { type: SPLICE_ACTION.INSERT, value: unknown };

/**
 * One `Array.prototype.splice` call. Splices are applied in order, so `index` is a position in the
 * array as the splices before it left it. A moved item's `from` is an index in the array before any
 * splice was applied.
 */
export type JsonSplice = {
  index: number,
  delete: number,
  insert: JsonSpliceItem[]
};

/** The splices that turn the array at `path` into its new value */
export type JsonSpliceRecord = {
  type: "splice",
  path: (string | number)[],
  splices: JsonSplice[]
};

/**
 * Result of a JSON diff operation, containing paths and values that changed.
 * @template T - The type of the JSON value being diffed
 */
export type JsonDiffResult<T = unknown> = (JsonWrite | JsonDelete | JsonSpliceRecord)[];

/**
 * How JsonDiff handles an object or array that changed:
 * - `"diff"`: walk into it. An array is diffed by position.
 * - `"splice"`: arrays only. Diff it as splices that match elements by the diff's identity (see
 *   JsonDiffIdentityFunc), without walking into them. Anything else is diffed as `"diff"`.
 * - `"skip"`: record nothing for it.
 * - `"write"`: write the new value as is.
 */
export type JsonDiffStrategy = "diff" | "splice" | "skip" | "write";

/**
 * Chooses how JsonDiff handles a changed object or array, given the new value, the old one (of any
 * type) and the path they're at. Returning undefined means `"diff"`. It isn't called for primitives. `path` is the diff's own, so it
 * must not be kept or changed.
 */
export type JsonDiffStrategyFunc = (newValue: any, oldValue: any, path: readonly (string | number)[]) => JsonDiffStrategy | undefined;

/**
 * What a spliced array's element is compared by: two elements whose identities are === are the same
 * element, so it's matched and never diffed into. It's called for every element, primitives
 * included. When two different elements share an identity, they're treated as the same element;
 * avoiding that is up to the function.
 */
export type JsonDiffIdentityFunc = (value: any) => unknown;

/** The default strategy: every changed object and array is diffed into, arrays by position */
export const JsonDiffDefaultStrategy: JsonDiffStrategyFunc = () => "diff";

/** The default identity: an element is its own identity, so elements are compared by === */
export const JsonDiffDefaultIdentity: JsonDiffIdentityFunc = (value) => value;

/** The callbacks a diff passes down as it walks */
type JsonDiffOptions = {
  strategy: JsonDiffStrategyFunc;
  identity: JsonDiffIdentityFunc;
};

const jsonProto = Object.getPrototypeOf({});
const arrayProto = Object.getPrototypeOf([]);
const strProto = Object.getPrototypeOf("");
const numProto = Object.getPrototypeOf(0);
const boolProto = Object.getPrototypeOf(false);

/**
 * Determines the JSON type of a value.
 * @param value - The value to check
 * @returns "value" for primitives/null/undefined, "object" for plain objects, "array" for arrays
 */
export function JsonType(value: any) {
  if (value === null || value === undefined) return "value";

  switch (Object.getPrototypeOf(value)) {
    case strProto:
    case numProto:
    case boolProto:
      return "value";
    case jsonProto:
      return "object";
    case arrayProto:
      return "array";
  }

  if (Array.isArray(value)) return "array";

  return "value";
}

/**
 * Deep merges a patch into a source value.
 * - If types don't match, returns the patch
 * - For objects: recursively merges properties, adds new properties
 * - For arrays: maps over patch, merging with corresponding source elements
 * @param source - The original value
 * @param patch - The value to merge into source
 * @returns The merged result
 */
export function JsonMerge(source: unknown, patch: unknown) {
  if (patch === undefined) return JsonDeepClone(source);

  const sourceType = JsonType(source);
  const patchType = JsonType(patch);

  if (sourceType !== patchType) return patch;

  switch (sourceType) {
    case "array": {
      const typedSource = source as unknown[];
      const typedPatch = patch as unknown[];

      const result = new Array(typedPatch.length);

      for (let x = 0; x < typedPatch.length; x++)
        result[x] = JsonMerge(typedSource[x], typedPatch[x]);

      return result;
    }
    case "object": {
      const typedSource = source as { [prop: string]: unknown };
      const typedPatch = patch as { [prop: string]: unknown };
      const sourceKeys = Object.keys(typedSource);
      const targetKeys = Object.keys(typedPatch).filter(
        (key) => !sourceKeys.includes(key),
      );

      const result = {} as { [prop: string]: unknown };
      for (let x = 0; x < sourceKeys.length; x++) {
        result[sourceKeys[x]] = JsonMerge(
          typedSource[sourceKeys[x]],
          typedPatch[sourceKeys[x]],
        );
      }

      for (let x = 0; x < targetKeys.length; x++) {
        result[targetKeys[x]] = typedPatch[targetKeys[x]];
      }

      return result;
    }
    default:
      return patch;
  }
}

/**
 * Creates a deep clone of a JSON-compatible value.
 * @template T - The type of the value to clone
 * @param value - The value to clone
 * @returns A deep clone of the value
 */
export function JsonDeepClone<T>(value: T, type = JsonType(value)): T {
  switch (type) {
    case "array": {
      const typed = value as unknown[];
      const result = new Array(typed.length);
      for (let x = 0; x < typed.length; x++)
        result[x] = JsonDeepClone(typed[x]);

      return result as T;
    }
    case "object": {
      const ret = {} as T;
      const keys = Object.keys(value as unknown as object) as (keyof T)[];
      for (let x = 0; x < keys.length; x++)
        ret[keys[x]] = JsonDeepClone(value[keys[x]]);

      return ret;
    }
    default:
      return value;
  }
}

/**
 * Applies a diff result to a root value in place, one record at a time in order. A diff doesn't own
 * its values (see JsonDiff), so each value written or inserted is deep-cloned first: the root never
 * shares an object with the diff, the value it was computed from, or another record, unless
 * `clone` says otherwise.
 * - A write assigns its value at its path
 * - A delete removes the property its path ends with
 * - A splice record splices the array at its path in place (see JsonApplySplices)
 * @param root - The value to update; must be an object or array
 * @param diff - The diff result to apply
 * @param assign - Assigns a written value (already cloned) to its parent
 * @param remove - Removes a deleted property from its parent
 * @param spliced - Called with each array a splice record changed, after it's changed
 * @param clone - Copies each value before it's written or inserted. A caller that already owns the
 *   diff's values can pass one that keeps them, or parts of them, as they are.
 * @throws For a write or delete with an empty path: the root can't be replaced or removed, only
 *   changed inside. JsonDiff records one only when the root's JSON type changes.
 */
export function JsonApplyDiff(
  root: any,
  diff: JsonDiffResult,
  assign: (parent: any, prop: string | number, value: any) => void = DefaultAssign,
  remove: (parent: any, prop: string | number) => void = DefaultRemove,
  spliced?: (array: unknown[]) => void,
  clone: (value: unknown) => unknown = JsonDeepClone,
) {
  // The objects along the last path walked, so records under the same parent walk it once:
  // walked[y] is [path[y - 1], the object at path[0..y)]
  const walked: [string | number | null, any][] = [["", root]];
  for (let x = 0; x < diff.length; x++) {
    const record = diff[x];
    const path = record.path;
    if (path.length === 0 && record.type !== "splice")
      throw new Error("Unable to replace the root of a diff: apply it to an object holding the root");

    if (record.type === "write") {
      const parent = Walk(walked, path, path.length - 1);
      assign(parent, path[path.length - 1], clone(record.value));
      // The value at the path was replaced, so anything walked through it is gone
      walked.length > path.length && (walked.length = path.length);
    }
    else if (record.type === "delete") {
      const parent = Walk(walked, path, path.length - 1);
      remove(parent, path[path.length - 1]);
      walked.length > path.length && (walked.length = path.length);
    }
    else {
      const array = Walk(walked, path, path.length);
      if (!Array.isArray(array))
        throw new Error(`Unable to splice ${path.join(".")}: not an array`);

      JsonApplySplices(array, record.splices, clone);
      // The array is the same object, but its elements moved
      walked.length > path.length + 1 && (walked.length = path.length + 1);
      spliced?.(array);
    }
  }
}

function DefaultAssign(parent: any, prop: string | number, value: any) {
  parent[prop] = value;
}

function DefaultRemove(parent: any, prop: string | number) {
  delete parent[prop];
}

/** The object at `path[0..depth)`, walking from the deepest object in `walked` still on the path */
function Walk(walked: [string | number | null, any][], path: (string | number)[], depth: number) {
  for (let y = 0; y < depth; y++) {
    const property = path[y];
    const index = y + 1;
    if (index < walked.length && walked[index][0] === property)
      continue;

    const child = walked[y][1][property];
    if (index < walked.length) {
      walked[index] = [property, child];
      // Deeper entries were under the old object; clearing the next one makes the walk refresh each
      if (index + 1 < walked.length) walked[index + 1][0] = null;
    }
    else
      walked.push([property, child]);
  }

  return walked[depth][1];
}

/** Sets an array's elements to `items` in place. Unlike `splice(0, length, ...items)`, any length works. */
function ReplaceArrayContents(array: unknown[], items: readonly unknown[]) {
  for (let x = 0; x < items.length; x++)
    array[x] = items[x];

  array.length = items.length;
}

/**
 * Applies splices to an array in place, in one pass however many there are: the new contents are
 * built from the old ones, then written back into the same array. A moved item is the old element
 * at its `from`, as is; an inserted item's value is deep-cloned.
 * @param splices - In ascending, non-overlapping order, as JsonDiffArraySplice returns them: each
 *   one's index is at or after where the one before it ended
 * @param clone - Copies each inserted value; see JsonApplyDiff
 * @throws When a splice starts before the one before it ended
 */
export function JsonApplySplices(array: unknown[], splices: readonly JsonSplice[], clone: (value: unknown) => unknown = JsonDeepClone) {
  if (splices.length === 0)
    return;

  const original = array.slice();
  const result: unknown[] = [];
  // The next old element to copy. The array as the splices so far left it is `result`, then the old
  // elements from `read` on.
  let read = 0;
  for (let x = 0; x < splices.length; x++) {
    const splice = splices[x];
    if (splice.index < result.length)
      throw new Error(`Unable to apply splice at ${splice.index}: splices must be in ascending, non-overlapping order`);

    // Copy the old elements up to the splice; an index past the end splices at the end, as
    // Array.prototype.splice does
    for (; result.length < splice.index && read < original.length; read++)
      result.push(original[read]);

    read = Math.min(read + splice.delete, original.length);
    for (let y = 0; y < splice.insert.length; y++) {
      const item = splice.insert[y];
      result.push(item.type === SPLICE_ACTION.MOVE ? original[item.from] : clone(item.value));
    }
  }

  for (; read < original.length; read++)
    result.push(original[read]);

  ReplaceArrayContents(array, result);
}

/**
 * Whether two JSON values differ, without recording how: it stops at the first difference and
 * skips any subtree both values share, so it costs no more than walking what differs. An
 * undefined property counts as absent, as in JSON. Arrays are compared by position.
 * @param newValue - The new value
 * @param oldValue - The old value to compare against
 * @returns true when the values differ
 */
export function JsonHasChanges(newValue: unknown, oldValue: unknown): boolean {
  if (newValue === oldValue) return false;

  const type = JsonType(newValue);
  if (type !== JsonType(oldValue)) return true;

  switch (type) {
    case "array": {
      const newArray = newValue as unknown[];
      const oldArray = oldValue as unknown[];
      if (newArray.length !== oldArray.length) return true;

      for (let x = 0; x < newArray.length; x++)
        if (JsonHasChanges(newArray[x], oldArray[x])) return true;

      return false;
    }
    case "object": {
      const newObject = newValue as { [key: string]: unknown };
      const oldObject = oldValue as { [key: string]: unknown };
      const newKeys = Object.keys(newObject);
      let defined = 0;
      for (let x = 0; x < newKeys.length; x++) {
        const value = newObject[newKeys[x]];
        if (value === undefined) continue;

        defined++;
        if (!Object.hasOwn(oldObject, newKeys[x]) || JsonHasChanges(value, oldObject[newKeys[x]])) return true;
      }

      // Every defined key of the new value is in the old one, so they differ only when the old
      // one defines more
      const oldKeys = Object.keys(oldObject);
      if (oldKeys.length === defined) return false;

      let oldDefined = 0;
      for (let x = 0; x < oldKeys.length; x++)
        if (oldObject[oldKeys[x]] !== undefined) oldDefined++;

      return oldDefined !== defined;
    }
    default:
      return true;
  }
}

/**
 * Computes the differences between two JSON values.
 * Returns an array of paths and values that changed from oldValue to newValue. A value is only
 * written whole where its JSON type changes (or a strategy says so); an object or array of the
 * same type is always diffed into, however much of it changed. So the root itself is only ever
 * written when its type changes, and a diff of values of the same type can always be applied
 * in place. A record doesn't
 * own its value: it references `newValue`'s objects, so two records can share one, and
 * JsonApplyDiff clones each value as it's applied.
 * @template T - The type of the JSON values being compared
 * @param newValue - The new value
 * @param oldValue - The old value to compare against
 * @param rootPath - Optional dot-separated string for the base path
 * @param strategy - Optional choice of how each changed object or array is diffed; without one,
 *   everything is diffed by walking into it, arrays by position
 * @param identity - Optional identity a spliced array's elements are compared by; without one,
 *   elements are compared by ===. See JsonDiffIdentityFunc
 * @returns Array of change records with path and new value
 */
export function JsonDiff<T>(
  newValue: T,
  oldValue: T,
  rootPath?: string,
  strategy?: JsonDiffStrategyFunc,
  identity?: JsonDiffIdentityFunc,
): JsonDiffResult<T> {
  const result: JsonDiffResult<T> = [];
  JsonDiffInto(newValue, oldValue, rootPath ? rootPath.split(".") : [], result, strategy, identity);
  return result;
}

/**
 * Appends the differences between two JSON values to `result`, so several values can be diffed into
 * one result.
 * @param path - The path the values are at
 * @param strategy - See JsonDiff
 * @param identity - See JsonDiff
 * @returns The result
 */
export function JsonDiffInto<T>(
  newValue: T,
  oldValue: T,
  path: (string | number)[],
  result: JsonDiffResult<T>,
  strategy: JsonDiffStrategyFunc = JsonDiffDefaultStrategy,
  identity: JsonDiffIdentityFunc = JsonDiffDefaultIdentity,
): JsonDiffResult<T> {
  JsonDiffRecursive(path, newValue, oldValue, result, { strategy, identity });
  return result;
}

/**
 * Recursive helper for JsonDiff that traverses and compares values. Values of the same JSON type
 * are diffed into; anything else is written.
 * @internal
 * @param path - Current path being evaluated
 * @param newValue - New value at this path
 * @param oldValue - Old value at this path
 * @param resp - Result array to populate with changes
 * @param options - The diff's strategy and identity, see JsonDiff
 */
function JsonDiffRecursive(
  path: (string | number)[],
  newValue: any,
  oldValue: any,
  resp: JsonDiffResult<unknown>,
  options: JsonDiffOptions,
) {
  if (newValue === oldValue) return;

  const newType = JsonType(newValue);
  const oldType = JsonType(oldValue);
  const choice = newType !== "value" ? options.strategy(newValue, oldValue, path) : undefined;
  if (choice === "skip") return;

  if (newType === oldType && choice !== "write")
    switch (newType) {
      case "array": {
        if (choice === "splice") {
          const splices = JsonDiffArraySplice(newValue, oldValue, options.identity);
          splices.length > 0 && resp.push({ type: "splice", path, splices });
        }
        else
          JsonDiffArrays(path, newValue, oldValue, resp, options);

        return;
      }
      case "object": {
        JsonDiffObjects(path, newValue, oldValue, resp, options);
        return;
      }
    }

  resp.push({
    type: "write",
    path,
    value: newValue,
  });
}

/**
 * The splices that turn `oldValue` into `newValue`, matching elements by identity without walking
 * into them: two elements are the same when their identities are ===. With the default identity,
 * that's the elements themselves. A matched element is never diffed into, even when it isn't === to
 * its match. An identity that repeats is matched in order, and a repeat with no old element left to
 * match is inserted.
 *
 * It works in four stages, followed through this example in the comments below:
 *
 *   old: [A, B, C, D, E, F]
 *   new: [A, E, B, X, D, F]
 *
 * 1. Trim the elements identical at the start and end (A and F): they can't need a change.
 * 2. Match each remaining new element to the old index holding the same element, or -1.
 * 3. Choose which matched elements stay in place: the longest run of them still in their old
 *    order (B, D). Keeping the longest run is what keeps the number of moves as small as possible.
 * 4. Walk both arrays from kept element to kept element. Between two kept elements, delete the
 *    old elements that aren't kept (C, E) and insert the new ones that aren't (E as a move, X as
 *    a new value).
 *
 * @returns The splices, in the order to apply them; none when the arrays hold the same elements.
 *   Applied in order to [A, B, C, D, E, F], with each move read from the array before any splice:
 *
 *   splice(1, 0, E)   [A, E, B, C, D, E, F]
 *   splice(3, 1, X)   [A, E, B, X, D, E, F]
 *   splice(5, 1)      [A, E, B, X, D, F]
 *
 * @param identity - What elements are compared by, called once for every element. See
 *   JsonDiffIdentityFunc
 */
export function JsonDiffArraySplice(newValue: readonly unknown[], oldValue: readonly unknown[], identity: JsonDiffIdentityFunc = JsonDiffDefaultIdentity): JsonSplice[] {
  const newLength = newValue.length;
  const oldLength = oldValue.length;
  // Every comparison below is between identities. Inserted values are still read from newValue.
  const newIds = identity === JsonDiffDefaultIdentity ? newValue : newValue.map(identity);
  const oldIds = identity === JsonDiffDefaultIdentity ? oldValue : oldValue.map(identity);

  // Stage 1: trim the elements with the same identity at the start and end. An append, a delete or a single
  // replaced element leaves little or nothing in the middle, so the stages after this cost little.
  //
  //   start: A === A, B !== E → start = 1
  //   end:   F === F, E !== D → newEnd = oldEnd = 5
  //   middle old (indexes 1-4): [B, C, D, E]
  //   middle new (indexes 1-4): [E, B, X, D]
  const shared = Math.min(newLength, oldLength);
  let start = 0;
  for (; start < shared && newIds[start] === oldIds[start]; start++) { }

  if (start === newLength && start === oldLength)
    return [];

  let newEnd = newLength;
  let oldEnd = oldLength;
  for (; newEnd > start && oldEnd > start && newIds[newEnd - 1] === oldIds[oldEnd - 1]; newEnd--, oldEnd--) { }

  // Stage 2: match each new element in the middle to an old index holding an element with the same
  // identity.
  //
  // oldIndexes maps each old identity to every index it's at. The lists are filled from the end, so
  // each holds its indexes highest first and pop() hands them out lowest first: the first copy of a
  // repeated value in the new array matches its first copy in the old array, and so on. Once a
  // value's indexes run out, any further copy has no match.
  //
  //   oldIndexes: B → [1], C → [2], D → [3], E → [4]
  const oldIndexes = new Map<unknown, number[]>();
  for (let x = oldEnd - 1; x >= start; x--) {
    const indexes = oldIndexes.get(oldIds[x]);
    indexes ? indexes.push(x) : oldIndexes.set(oldIds[x], [x]);
  }

  // matched[x] is the old index the new element at start + x matched, or -1 when it has none.
  //
  //   new:      E   B   X   D
  //   matched:  4   1  -1   3
  const middle = newEnd - start;
  const matched = new Int32Array(middle);
  for (let x = 0; x < middle; x++)
    matched[x] = oldIndexes.get(newIds[start + x])?.pop() ?? -1;

  // Stage 3: choose which matched elements stay in place. They're the longest run whose old
  // indexes increase from left to right, because only those can keep their order without moving.
  //
  //   matched:  4   1  -1   3
  //   longest increasing run: 1, 3 → B and D are kept
  //   E (4) is matched but out of order → it will be moved
  //   X (-1) has no match → it will be inserted
  //
  // keptNew is indexed by position in the new middle; keptOld marks the same kept elements by
  // their position in the old middle.
  //
  //   keptNew (E, B, X, D): 0 1 0 1
  //   keptOld (B, C, D, E): 1 0 1 0 → C and E aren't kept, so they will be deleted
  const keptNew = KeptMatches(matched);
  const keptOld = new Uint8Array(oldEnd - start);
  for (let x = 0; x < middle; x++)
    if (keptNew[x]) keptOld[matched[x] - start] = 1;

  // Stage 4: walk both arrays at once. The kept elements appear in the same order in both, so after
  // skipping the elements that aren't kept, both cursors stop at the same kept element (or both
  // reach the end). Each stop emits one splice:
  // - delete: the old elements skipped, which aren't kept
  // - insert: the new elements skipped, as a move when they were matched, otherwise as a new value
  //
  // A splice's index is the new cursor's position when it starts. The splices before it have already
  // made the array match the new array up to that position, so that's where this one goes.
  //
  //   index 1: old skips nothing before B; new skips E (matched 4)    → { 1, delete 0, [MOVE 4] }
  //   index 3: old skips C before D;       new skips X (no match)     → { 3, delete 1, [INSERT X] }
  //   index 5: old skips E to the end;     new has nothing left       → { 5, delete 1, [] }
  //
  // The last stop is what deletes old elements left over at the end of the array.
  const splices: JsonSplice[] = [];
  let oldIndex = start;
  let newIndex = start;
  while (oldIndex < oldEnd || newIndex < newEnd) {
    const index = newIndex;
    let deleteCount = 0;
    for (; oldIndex < oldEnd && !keptOld[oldIndex - start]; oldIndex++)
      deleteCount++;

    const insert: JsonSpliceItem[] = [];
    for (; newIndex < newEnd && !keptNew[newIndex - start]; newIndex++) {
      const from = matched[newIndex - start];
      insert.push(from < 0 ? { type: SPLICE_ACTION.INSERT, value: newValue[newIndex] } : { type: SPLICE_ACTION.MOVE, from });
    }

    // Two kept elements next to each other in both arrays leave nothing to splice between them
    if (deleteCount > 0 || insert.length > 0)
      splices.push({ index, delete: deleteCount, insert });

    // Step past the kept element both cursors stopped at. At the end, this takes both past the end
    // and the loop stops.
    oldIndex++;
    newIndex++;
  }

  return splices;
}

/**
 * Which matched elements to keep in place: the longest run of them, from left to right, whose old
 * indexes increase. That's the longest increasing subsequence of `matched`, ignoring the -1s, and
 * every matched element left out of it has to move. O(n log n).
 *
 * For example, matched [4, 1, -1, 3] keeps the elements at 1 and 3 (old indexes 1 and 3), and a
 * rotate, matched [4, 0, 1, 2, 3], keeps everything but the first, so only that one moves.
 *
 * @param matched - Each new element's matched old index, or -1 when it has none
 * @returns 1 for each element kept, by position in `matched`
 */
function KeptMatches(matched: Int32Array) {
  const length = matched.length;
  // previous[x]: the element before x in the longest run found that ends at x, or -1. Following it
  // back from the end of the longest run gives the whole run.
  const previous = new Int32Array(length);
  // tails[k]: of every increasing run of length k + 1 found so far, the element ending the one with
  // the smallest old index. A smaller ending is better, since more elements can extend it. Their old
  // indexes always increase along tails, which is what lets the search below be a binary search.
  const tails: number[] = [];
  for (let x = 0; x < length; x++) {
    const value = matched[x];
    // An unmatched element can't be kept
    if (value < 0) continue;

    // Find the first run in tails whose ending old index isn't below this element's. This element
    // can extend the run before it (every ending before it is lower), so it ends a run of length
    // low + 1: either a better ending for that length, or, past the end of tails, a new longest run.
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (matched[tails[mid]] < value) low = mid + 1;
      else high = mid;
    }

    previous[x] = low > 0 ? tails[low - 1] : -1;
    tails[low] = x;
  }

  // The last entry of tails ends a longest run; follow previous back from it to mark the whole run
  //
  //   matched [4, 1, -1, 3]:
  //   x=0 (4):  tails [0]          (run: 4)
  //   x=1 (1):  tails [1]          (1 is a better ending than 4 for length 1)
  //   x=3 (3):  tails [1, 3]       (3 extends the run ending at 1; previous[3] = 1)
  //   back from 3 → 1 → done: kept = [0, 1, 0, 1]
  const kept = new Uint8Array(length);
  for (let x = tails.length > 0 ? tails[tails.length - 1] : -1; x >= 0; x = previous[x])
    kept[x] = 1;

  return kept;
}

/**
 * Compares two arrays by position and records differences: each changed position, then the
 * length when it changed. Elements identical at the start, and at the end when the lengths are the
 * same, aren't diffed.
 * @internal
 * @param path - Current path being evaluated
 * @param newValue - New array
 * @param oldValue - Old array to compare against
 * @param resp - Result array to populate with changes
 * @param options - The diff's strategy and identity, see JsonDiff
 */
function JsonDiffArrays(
  path: (string | number)[],
  newValue: any[],
  oldValue: any[],
  resp: JsonDiffResult<unknown>,
  options: JsonDiffOptions,
) {
  const sameLength = newValue.length === oldValue.length;
  const shared = Math.min(newValue.length, oldValue.length);
  let start = 0;
  for (; start < shared && newValue[start] === oldValue[start]; start++) { }

  // Arrays are equal, no diffing required
  if (sameLength && start === newValue.length)
    return;

  let end = newValue.length;
  if (sameLength)
    for (; end > start && newValue[end - 1] === oldValue[end - 1]; end--) { }

  for (let x = start; x < end; x++)
    JsonDiffRecursive(path.concat(x), newValue[x], oldValue[x], resp, options);

  if (!sameLength)
    resp.push({
      type: "write",
      path: path.concat("length"),
      value: newValue.length,
    });
}

/**
 * Compares two objects and records differences, walking their sorted keys together: a key in
 * both is diffed, a key only the new value has is written, and a key only the old value has is
 * deleted. A new key holding undefined counts as absent and isn't written.
 * @internal
 * @param path - Current path being evaluated
 * @param newValue - New object
 * @param oldValue - Old object to compare against
 * @param resp - Result array to populate with changes
 * @param options - The diff's strategy and identity, see JsonDiff
 */
function JsonDiffObjects(
  path: (string | number)[],
  newValue: { [key: string]: any },
  oldValue: { [key: string]: any },
  resp: JsonDiffResult<unknown>,
  options: JsonDiffOptions,
) {
  const newKeys = Object.keys(newValue).sort();
  const oldKeys = Object.keys(oldValue).sort();

  let newKeyIndex = 0;
  let oldKeyIndex = 0;
  while (newKeyIndex < newKeys.length || oldKeyIndex < oldKeys.length) {
    const newKey = newKeys[newKeyIndex];
    const oldKey = oldKeys[oldKeyIndex];
    // Both lists are sorted the same way `<` compares strings
    if (oldKeyIndex >= oldKeys.length || (newKeyIndex < newKeys.length && newKey < oldKey)) {
      newValue[newKey] !== undefined && resp.push({
        type: "write",
        path: path.concat(newKey),
        value: newValue[newKey],
      });
      newKeyIndex++;
    }
    else if (newKeyIndex >= newKeys.length || oldKey < newKey) {
      resp.push({
        type: "delete",
        path: path.concat(oldKey),
      });
      oldKeyIndex++;
    }
    else {
      JsonDiffRecursive(path.concat(newKey), newValue[newKey], oldValue[oldKey], resp, options);
      newKeyIndex++;
      oldKeyIndex++;
    }
  }
}
