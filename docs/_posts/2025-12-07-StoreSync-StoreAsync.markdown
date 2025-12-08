# StoreSync & StoreAsync

*Files: `src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`*

This post explains the two store implementations that provide a simple, diff‑based persistence layer for jTemplates data. Both expose the same high‑level API but differ in how updates are applied – synchronously or asynchronously.

## Core API (shared)
- **Write(data, key?)** – Stores a deep‑cloned value. If `key` is omitted it is derived from `keyFunc`.
- **Patch(key, patch)** – Merges a JSON patch into the existing value.
- **Push(key, ...items)** – Appends one or more items to an array stored at `key`.
- **Splice(key, start, deleteCount?, ...items)** – Performs an array splice operation and returns the removed items.
- **Get(key)** – Inherited from `Store` to retrieve the proxied value. The returned `ObservableNode` objects are read‑only; state changes must be performed via the Store API (Write, Patch, Push, Splice).
- **UpdateRootMap(diffResult)** – Internal: applies a JSON‑diff to the root map, triggering observable updates.

## StoreSync (synchronous)
```ts
import { StoreSync } from 'j-templates';

const syncStore = new StoreSync(value => value.id);

// Write a new object
syncStore.Write({ id: 'user1', name: 'Alice' });

// Patch a field
syncStore.Patch('user1', { name: 'Alice B.' });

// Array operations
syncStore.Push('todos', { id: 1, text: 'Buy milk' });
syncStore.Splice('todos', 0, 1); // removes first todo
```
All operations happen immediately; the diff is calculated and applied in the same call stack.

## StoreAsync (asynchronous)
> Note: `StoreAsync` relies on `DiffAsync`, which off‑loads diff calculations to a WebWorker via `WorkerQueue` and `DiffWorker`. This keeps heavy JSON‑diff work off the main thread, improving UI responsiveness.
```ts
import { StoreAsync } from 'j-templates';

const asyncStore = new StoreAsync(value => value.id);

await asyncStore.Write({ id: 'doc1', title: 'Doc' });
await asyncStore.Patch('doc1', { title: 'Updated' });
await asyncStore.Push('items', { id: 10 }, { id: 11 });
await asyncStore.Splice('items', 1, 0, { id: 12 });
```
Writes are queued through an internal `AsyncQueue`, ensuring ordered, non‑blocking updates. The API returns promises that resolve after the diff is applied.

## Choosing Between Sync and Async
- **Sync** – Use when data volume is small and UI updates must occur instantly.
- **Async** – Prefer for large payloads, network‑backed stores, or when you want to avoid blocking the main thread.
Both stores emit the same observable events, so component code can remain unchanged.

## File References
- **Implementation**: `src/Store/Store/storeSync.ts`, `src/Store/Store/storeAsync.ts`
- **Diff engines**: `src/Store/Diff/diffSync.ts`, `src/Store/Diff/diffAsync.ts`
- **Base class**: `src/Store/Store/store.ts`

---
*Next post*: Decorators – utility decorators and their integration with components (`src/Utils/decorators.ts`).