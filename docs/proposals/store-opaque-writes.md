# Note: a store applies writes inside an opaque root

Status: a note, not started. The rest of "opaque is local" (`docs/patterns/05-difftree-endpoints.md`); `NEXT_STEPS.md` lists it as open.

## Where it stands

`opaque` means "never diff this path", for whoever holds the key, and never travels: a tree takes its opaque keys from its own config (`IObservableDiffTreeConfig.opaque`), and each store from its options. A store no longer marks its tree: `StoreAsync` used to send its keys to the worker's tree (`jt-markopaque`), which changed how the tree described those keys to every subscriber and was never undone. That path is removed.

What's left is on the store's side. A store holds an opaque root boxed (`Opaque`), and `ReadStore`'s `OpaqueResults` (`src/Store/Store/store.ts`) throws when a post writes inside one:

```
Opaque root view was changed at view.label: mark it opaque in the DiffTree too (DiffTree.MarkOpaque)
```

So a store can hold fewer keys whole than its tree, but not more: every key a store holds whole has to be in its tree's config as well, shared from a file both import. A store can't decide on its own to hold a root whole.

## The change

A store applies records inside an opaque root itself:

- **Copy along the record's path, then box the new root.** For each record whose path goes inside the root, copy the root's raw value along that path (each object or array on the path, shallowly), apply the write, splice or delete to the copy, and store the result as a new `Opaque`. Nothing is proxied and nothing is patched in place, so a reader's reference to the old value stays as it was.
- **One update per post.** Apply every record of the post for that root to one copy, then replace the root once, so its readers update once, as they do for a whole write.
- **No throw.** `OpaqueResults` goes, along with the "mark it opaque in the DiffTree too" error and the test that expects it (`test/store/opaque-store-test.ts`, "throws on a diff inside an opaque root").

## Why

- **Opaque is local.** Whether a tree diffs a key is the tree's choice: its commits cost less when it does. Whether a store holds it whole is the store's: its reads cost less when it does. The two are separate, and the subscription is only the transport.
- **A store can hold more keys whole than its tree**, as when a view reads a large value whole and the tree that computes it diffs it for its other subscribers.

## To decide

- **The cost of a deep path.** Copying along the path is linear in its depth plus the width of each level copied. A record deep in a wide array copies that array; fine for the views opaque is meant for (a drawing, a result list), but worth measuring on a large one.
- **Splices inside an opaque array**, applied to the copied array the way `JsonApplyDiff` applies them.
