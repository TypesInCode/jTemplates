/**
 * A value an ObservableNode holds whole: it's never proxied, diffed into or cloned. A node stores
 * the box and reads open it, so a reader gets the raw value, the same reference until the box is
 * replaced. The property holding the box is the only thing observed: replacing the box updates its
 * readers, and a change made inside the raw value notifies no one, so treat it as read-only.
 *
 * - Write one into a node by assigning it (`node.view = new Opaque(view)`), pushing or splicing it
 *   into a node's array, or putting it in a value given to `ObservableNode.Create` or returned from
 *   a `@Computed` getter.
 * - A store holds a root whole when the root's key is in the store's `opaque` option. The store
 *   boxes the root itself; don't pass an `Opaque` to a store's `Write`, `Patch`, `Push` or `Splice`.
 * - Reads, array methods, property descriptors, snapshots and `JSON.stringify` give the raw value,
 *   so an object composed from a node's reads holds no box. `ObservableNode.Unwrap` gives a node's
 *   storage, boxes included, and `ObservableNode.Clone` keeps a box it's given: writing either back
 *   into a node keeps the value opaque, but don't pass them to a store.
 *
 * Reading a box's value through a node and writing it somewhere else writes the raw value, which is
 * then plain data again: box it again (`new Opaque(value)`) to keep it whole.
 */
export class Opaque<T = unknown> {
  constructor(readonly value: T) { }

  /** The raw value, so `JSON.stringify` writes the value, not the box */
  toJSON() {
    return this.value;
  }

  /**
   * The raw value of a box, or the value itself when it isn't one.
   * @param value Any value.
   */
  static Open<V>(value: V | Opaque<V>): V {
    return value instanceof Opaque ? value.value : value;
  }
}
