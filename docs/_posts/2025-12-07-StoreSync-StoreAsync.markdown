# StoreSync & StoreAsync

*Files: `src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`*

StoreSync and StoreAsync provide a diff-based persistence layer for jTemplates data, enabling efficient state management with automatic reactivity. Both implement the same high-level API but differ fundamentally in how they handle updates—synchronously on the main thread or asynchronously using WebWorkers to avoid blocking UI rendering.

## Core API (Shared)

Both stores expose identical methods for managing state:

- **Write(data, key?)** – Stores a deep-cloned value. If `key` is omitted, it's derived from the `keyFunc` provided during construction.
- **Patch(key, patch)** – Merges a JSON patch into the existing value at the specified key.
- **Push(key, ...items)** – Appends one or more items to an array stored at the specified key.
- **Splice(key, start, deleteCount?, ...items)** – Performs an array splice operation and returns the removed items.
- **Get(key)** – Retrieves the stored value as a read-only `ObservableNode` proxy. All state modifications must be performed via the store methods (Write, Patch, Push, Splice).

The `keyFunc` parameter (optional) is used to extract a unique identifier from data objects. For example: `value => value.id` allows the store to automatically use the `id` property as the storage key.

## StoreSync (Synchronous)

`StoreSync` performs all operations immediately on the main thread. This makes it ideal for small datasets where immediate updates are required.

```ts
import { StoreSync } from 'j-templates';

// Create a store with a key function to extract 'id' from objects
const syncStore = new StoreSync(value => value.id);

// Write a new object (automatically uses id as key)
syncStore.Write({ id: 'user1', name: 'Alice' });

// Patch a field
syncStore.Patch('user1', { name: 'Alice B.' });

// Array operations
syncStore.Push('todos', { id: 1, text: 'Buy milk' });
const removed = syncStore.Splice('todos', 0, 1); // removes first todo

// Retrieve the value (returns a read-only proxy)
const user = syncStore.Get('user1');
console.log(user.name); // 'Alice B.'
// user.name = 'Bob'; // This would throw an error - read-only proxy
```

All operations happen synchronously in the same call stack. The diff calculation and application occur immediately, making this the preferred choice for small datasets or when immediate UI updates are critical.

## StoreAsync (Asynchronous)

`StoreAsync` queues all operations through an internal `AsyncQueue` and offloads JSON diff calculations to a WebWorker via `DiffWorker`. This keeps the main thread responsive during heavy data operations.

```ts
import { StoreAsync } from 'j-templates';

// Create a store with a key function to extract 'id' from objects
const asyncStore = new StoreAsync(value => value.id);

// All operations are async and return promises
await asyncStore.Write({ id: 'doc1', title: 'Doc' });
await asyncStore.Patch('doc1', { title: 'Updated' });
await asyncStore.Push('items', { id: 10 }, { id: 11 });
const removed = await asyncStore.Splice('items', 1, 0, { id: 12 });

// Retrieve the value (returns a read-only proxy)
const doc = asyncStore.Get('doc1');
console.log(doc.title); // 'Updated'
```

### How it works:
1. Operations are queued using `AsyncQueue` to ensure ordered execution
2. Diff calculations are delegated to a WebWorker via `WorkerQueue` and `DiffWorker`
3. The main thread continues processing UI events while diffs are computed in the background
4. When the diff is complete, the result is applied to the store and reactivity updates are triggered

This approach is ideal for:
- Large datasets
- Network-backed stores
- Applications where UI responsiveness is critical

## Choosing Between Sync and Async

| Criteria | StoreSync | StoreAsync |
|----------|-----------|------------|
| **Performance** | Fast for small data | Slower per operation, but non-blocking |
| **Thread** | Main thread | Offloads to WebWorker |
| **Best for** | Small datasets, real-time updates | Large datasets, complex diffs, UI responsiveness |
| **API** | Synchronous | Async/await |
| **Complexity** | Simple | Requires async/await handling |

**Recommendation**: Start with `StoreSync` for simplicity. Switch to `StoreAsync` when you notice UI jank during data operations or when working with large datasets.

## Reactivity Integration

Both stores integrate seamlessly with jTemplates' reactivity system:
- All data is stored as `ObservableNode` proxies
- Changes trigger `ObservableScope` updates automatically
- Components and VNodes react to changes without any additional code
- The read-only nature of `Get()` results ensures state changes only occur through the store API

## File References

- **Implementation**: `src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`
- **Diff engines**: `src/Store/Diff/diffSync.ts`, `src/Store/Diff/diffAsync.ts`
- **Worker infrastructure**: `src/Store/Diff/workerQueue.ts`, `src/Store/Diff/diffWorker.ts`
- **Base class**: `src/Store/Store/store.ts`
- **JSON utilities**: `src/Utils/json.ts`

---

*Next post*: Decorators – utility decorators and their integration with components (`src/Utils/decorators.ts`).