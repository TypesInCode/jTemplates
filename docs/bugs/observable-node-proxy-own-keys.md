# Store bugs: `Object.hasOwn` and `Object.prototype`-named keys on proxies, and `cloneData` ignored on updates

**Found:** 2026-10-17, j-templates 8.1.0, reading a `PushStore` from builder-app (procedures-engine,
result-index-worker-plan.md §4.2). Issues 1 and 2 are in `src/Store/Tree/observableNode.ts` and affect any
store's object proxies, not only `PushStore`. Issue 3 is in `src/Store/Store/store.ts` and affects every store
built with `cloneData = false`, `PushStore` by default.

## 1. `Object.hasOwn(proxy, key)` is true for every key

`getOwnPropertyDescriptor` (and `getOwnPropertyDescriptorArray`) spread the target's descriptor into a new
object even when there is none:

```ts
function getOwnPropertyDescriptor(target: ObservableNodeWrapper, prop: string | symbol) {
  const descriptor = Object.getOwnPropertyDescriptor(target[NODE_VALUE], prop);
  return { ...descriptor, configurable: true } as PropertyDescriptor;
}
```

For a missing key that returns `{ configurable: true }`, so `Object.hasOwn`,
`Object.prototype.hasOwnProperty.call` and `Object.getOwnPropertyDescriptor` all report the key as present.
The trap also registers no read, so a scope that tests membership this way never wakes when the key is
added or removed. `key in proxy` is correct: the `has` trap checks the raw value and touches
`ITERATOR_SCOPE`.

### Repro

```ts
import { PushStore } from "j-templates/Store";
import { DiffTreeWriter } from "j-templates/Store/Diff/diffTreeWriter";

const target = new EventTarget();
const store = new PushStore(target);
const writer = new DiffTreeWriter(
  { postMessage: (m: unknown) => target.dispatchEvent(new MessageEvent("message", { data: structuredClone(m) })) },
  undefined,
  {},
);
writer.DiffPath("r", { a: { x: 1 } });
writer.Commit();

const r = store.Get<any>("r");
Object.hasOwn(r, "missing"); // true   (expected false)
"missing" in r;              // false  (correct)
r.missing;                   // undefined
```

### Suggested fix

Return `undefined` when the raw value has no such property (a proxy may report a property as absent
while its target, the wrapper, doesn't have it either). To make the test reactive, read the property's
scope as `get` does, so the reader wakes when that key changes:

```ts
function getOwnPropertyDescriptor(target: ObservableNodeWrapper, prop: string | symbol) {
  if (typeof prop === "string") ObservableScope.Value(GetPropertyScope(target, prop));
  const descriptor = Object.getOwnPropertyDescriptor(target[NODE_VALUE], prop);
  return descriptor && { ...descriptor, configurable: true };
}
```

## 2. Keys named like `Object.prototype` members read `undefined`

Property scopes are cached on the wrapper object itself:

```ts
function GetPropertyScope(object: ObservableNodeWrapper, prop: string) {
  return object[prop] ??= ObservableScope.Basic(Property.bind(null, object[NODE_VALUE], prop));
}
```

The wrapper is a plain object literal, so for `constructor`, `toString`, `hasOwnProperty`, `valueOf` and
the like, `object[prop]` is the inherited function. `??=` keeps it, `ObservableScope.Value` is given a
function instead of a scope, and the read returns `undefined`. `toJSON` is a further case, since the
getter handles it specially. Keys are often user data (ids, names), so a record keyed by them loses those
entries on the main thread, though snapshots and `JSON.stringify` still show them.

### Repro

```ts
writer.DiffPath("r", { toString: { v: 1 }, constructor: { v: 2 }, hasOwnProperty: { v: 3 } });
writer.Commit();

const r = store.Get<any>("r");
JSON.stringify(r);    // {"toString":{"v":1},"constructor":{"v":2},"hasOwnProperty":{"v":3}}
r.toString;           // undefined (expected a proxy of { v: 1 })
r.constructor;        // undefined
r.hasOwnProperty;     // undefined
```

It is worse than a missing read. Writing such a key through a proxy throws (`scope.setCallback is not a
function`: `SetObjectValue` calls `ObservableScope.Update` on the inherited function), and a scope that reads
one throws when it is woken (`Cannot read properties of undefined (reading 'push')`).

### Suggested fix

Keep the property scopes where nothing is inherited: a `Map<string, scope>`, or a null-prototype object
(`Object.create(null)`) held under a symbol on the wrapper. Then `GetPropertyScope`, `SetObjectValue`
(`ObservableScope.Update(object[prop])`) and `Update`/`Assign` (`wrapper[prop]`) all look scopes up in
it. Writes through `ObjectProxySetter` with such keys go through the same lookup and need the same change.

## 3. `cloneData = false` is ignored when a root already exists

`Store.UpdateRootObject` honours `cloneData` when it creates a root, but not when it updates one:

```ts
private UpdateRootObject(rootPath: string | number, results: JsonDiffResult) {
  const rootObject = this.rootMap.get(rootPath);
  if (rootObject === undefined) {
    // ...
    const rootData = this.cloneData ? JsonDeepClone(results[0].value) : results[0].value;
    // ...
    return;
  }
  ObservableNode.ApplyDiff(rootObject, results); // cloneData not passed
}
```

`ObservableNode.ApplyDiff(rootNode, diffResult, cloneData = true)` defaults to cloning, so every diff value
written into an existing root is deep-cloned. `SpliceRootObject` passes `this.cloneData` to `ApplySplice`;
only this call misses it.

For a `PushStore` this doubles the main thread's cost of every commit after a root's first: the value
was just deserialized from the worker's message, so nothing else holds it, and the store copies it again.
In builder-app the push of a large run (about 200 MB) took 2.1 s to deserialize and then 1.3 s in
`JsonDeepClone` under `PushStore.messageHandler → UpdateRootMap → UpdateRootObject → ApplyDiff`, in one
main-thread task (Chrome performance trace).

### Repro

```ts
import { PushStore } from "j-templates/Store";
import { DIFF_TREE_EVENT } from "j-templates/Store/Diff";

const target = new EventTarget();
const store = new PushStore(target); // cloneData = false
const post = (path: string[], value: unknown) =>
  target.dispatchEvent(
    new MessageEvent("message", { data: { type: DIFF_TREE_EVENT, data: [{ type: "diff", result: [{ path, value }] }] } }),
  );

const first = { a: { x: 1 } };
post(["r"], first); // creates the root: adopted
first.a.x = 10;
store.Get<any>("r").a.x; // 10: the store holds `first` itself

const value = { x: 2 };
post(["r", "a"], value); // updates the root
value.x = 20;
store.Get<any>("r").a.x; // 2 (expected 20): ApplyDiff deep-cloned `value`
```

Checked against 8.1.0: the two reads give 10 and 2. (Mutating after posting is only a probe for whether the
store copied; a real channel delivers copies.)

### Suggested fix

```ts
ObservableNode.ApplyDiff(rootObject, results, this.cloneData);
```

A test beside the existing `cloneData` ones, as the repro: with `cloneData = false` an update to an existing
root adopts the posted object, and with `cloneData = true` it still copies it.

## Tests

`test/store/store-proxy-bugs-test.ts` (the `default` project) covers all three issues, asserting the fixed
behaviour, so its cases fail until the fixes land: `Object.hasOwn` on objects, arrays and a `PushStore` root,
and a scope that tests a key waking when it is added and removed (1); each `Object.prototype` name read
directly, through a `PushStore`, by a scope that wakes when it changes, and written through a proxy (2); and a
`PushStore` adopting an update's value, with `cloneData = true` still copying it (3). Two cases are controls that
pass today: a new root is adopted, and `cloneData = true` copies.

With the suggested fixes applied (the property scopes in a null-prototype object under a symbol, read through
one helper by `GetPropertyScope`, `SetObjectValue`, `Update` and `Read`), all 16 cases pass, and the rest of the
suite is unchanged: it fails only the three `store-reactivity-test.ts` cases that fail without the fixes too.

## Workaround in builder-app

`engine/model/keyed.ts` reads a key's value first and treats `undefined` as absent (no collection there
holds `undefined`), so it doesn't depend on `Object.hasOwn`. A reader that reads one key still subscribes
to only that key. Nothing works around issue 2. Plain snapshots (`ObservableNode.Snapshot`) are
unaffected by issues 1 and 2. Nothing works around issue 3; builder-app is cutting what it pushes instead
(its raw relations), which shrinks the copy but doesn't remove it.

## Not a bug: same-thread pushes must be copies

While narrowing this down, a `PushStore` fed by a same-thread port that posted the writer's own objects
missed key additions in `Object.keys` readers. Without `cloneData`, the first commit's new root
is the writer's own object, and the writer's later write added the key to it in place before the store
applied the change. `SetObjectValue` then saw the key as already present and skipped `ITERATOR_SCOPE`. With
`structuredClone` (as a real `Worker` delivers), additions wake iterating readers. The primer already
says to post copies or pass `cloneData: true`. A test shim may be worth cloning by default.
