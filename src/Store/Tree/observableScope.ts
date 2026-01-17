import { ReconcileSortedEmitters } from "../../Utils/array";
import { Emitter, EmitterCallback } from "../../Utils/emitter";
import { IsAsync } from "../../Utils/functions";
import { List } from "../../Utils/list";

/**
 * Represents a static (non-reactive) observable scope.
 * Static scopes are immutable and do not track dependencies or emit updates.
 * @template T The type of value stored in the scope.
 */
interface IStaticObservableScope<T> {
  type: "static";
  value: T;
}

/**
 * Represents a dynamic (reactive) observable scope.
 * Dynamic scopes track dependencies, detect when values change, and emit updates.
 * @template T The type of value stored in the scope.
 */
interface IDynamicObservableScope<T> {
  type: "dynamic";
  /** Whether the scope's getter function is async */
  async: boolean;
  /** Whether updates are batched (true) or immediate (false) */
  greedy: boolean;
  /** Whether the scope needs recomputation */
  dirty: boolean;
  /** Whether the scope has been destroyed */
  destroyed: boolean;
  /** Function that returns the scope's current or computed value */
  getFunction: () => Promise<T> | T;
  /** Callback invoked when dependencies change */
  setCallback: EmitterCallback;
  /** Current cached value */
  value: T;
  /** Emitter for notifying listeners of value changes */
  emitter: Emitter;
  /** Array of emitters this scope listens to for dependency changes */
  emitters: (Emitter | null)[];
  /** Emitter for notifying when the scope is destroyed */
  onDestroyed: Emitter | null;
  /** Map of nested calc scopes created during this scope's execution */
  calcScopes: { [id: string]: IObservableScope<unknown> | null } | null;
}

/**
 * A reactive or static scope containing a value.
 * @template T The type of value stored in the scope.
 */
export type IObservableScope<T> =
  | IStaticObservableScope<T>
  | IDynamicObservableScope<T>;

/**
 * Creates a dynamic (reactive) observable scope.
 * @template T The type of value stored in the scope.
 * @param getFunction Function that returns the scope's value. May be async.
 * @param greedy Whether updates should be batched via microtask queue.
 * @param value Initial value for the scope (null for async functions).
 * @returns A new dynamic observable scope.
 */
function CreateDynamicScope<T>(
  getFunction: () => T,
  greedy: boolean,
  value: T,
): IDynamicObservableScope<T> {
  const async = IsAsync(getFunction);
  const scope: IDynamicObservableScope<T> = {
    type: "dynamic",
    async,
    greedy: greedy || async,
    dirty: false,
    destroyed: false,
    getFunction,
    setCallback: function () {
      return OnSet(scope);
    },
    value,
    emitter: Emitter.Create(),
    emitters: null,
    onDestroyed: null,
    calcScopes: null,
  };

  return scope;
}

/**
 * Creates a static (non-reactive) observable scope.
 * Static scopes are optimized for values that never change and don't need dependency tracking.
 * @template T The type of value stored in the scope.
 * @param initialValue The immutable value to store in the scope.
 * @returns A new static observable scope.
 */
function CreateStaticScope<T>(initialValue: T): IStaticObservableScope<T> {
  return {
    type: "static",
    value: initialValue,
  };
}

let scopeQueue: IDynamicObservableScope<any>[] = [];

/**
 * Processes all queued scopes, recomputing dirty scopes and emitting changes.
 * Executed as a microtask to batch updates efficiently.
 */
function ProcessScopeQueue() {
  const queue = scopeQueue;
  scopeQueue = [];
  for (let x = 0; x < queue.length; x++) {
    const scope = queue[x];
    if (!scope.destroyed) {
      const value = scope.value;
      ExecuteScope(scope);
      if (scope.value !== value) Emitter.Emit(scope.emitter, scope);
    }
  }
}

/**
 * Queues a scope for batched update processing.
 * Schedules ProcessScopeQueue as a microtask if the queue was empty.
 * @param scope The scope to queue for update.
 */
function OnSetQueued(scope: IDynamicObservableScope<any>) {
  if (scopeQueue.length === 0) queueMicrotask(ProcessScopeQueue);

  scopeQueue.push(scope);
}

/**
 * Marks a scope as dirty and triggers update behavior based on scope type.
 * @param scope The scope to mark for update.
 * @returns true if the scope is static or destroyed, false if queued or non-greedy scope emitted.
 */
function OnSet(scope: IObservableScope<any>) {
  if (scope.type === "static" || scope.destroyed) return true;

  if (scope.dirty) return false;

  scope.dirty = true;
  if (scope.greedy) {
    OnSetQueued(scope);
    return;
  }

  Emitter.Emit(scope.emitter, scope);
  return false;
}

/**
 * Registers an emitter using SAME_STRATEGY.
 * If the emitter is already registered at the current index, increments the index.
 * Otherwise, switches to PUSH_STRATEGY and appends the emitter.
 * @param state The current watch state.
 * @param emitter The emitter to register.
 */
function RegisterSame(state: typeof watchState, emitter: Emitter) {
  if (
    state.emitterIndex < state.emitters.length &&
    state.emitters[state.emitterIndex] === emitter
  ) {
    state.emitterIndex++;
    return;
  }

  state.emitters = state.emitters.slice(0, state.emitterIndex);
  state.strategy = SORTED_STRATEGY;
  RegisterSorted(state, emitter);
}

/**
 * Registers an emitter while maintaining sorted order by emitter ID.
 * If insertion would break sort order, falls back to PUSH_STRATEGY.
 * @param state The current watch state.
 * @param emitter The emitter to register.
 */
function RegisterSorted(state: typeof watchState, emitter: Emitter) {
  if (
    state.emitters.length === 0 ||
    state.emitters[state.emitters.length - 1][0] < emitter[0]
  )
    state.emitters.push(emitter);
  else {
    state.strategy = PUSH_STRATEGY;
    RegisterPush(state, emitter);
  }
}

/**
 * Registers an emitter using PUSH_STRATEGY.
 * Switches to DISTINCT_STRATEGY when the emitter count exceeds 50 to optimize memory.
 * @param state The current watch state.
 * @param emitter The emitter to register.
 */
function RegisterPush(state: typeof watchState, emitter: Emitter) {
  state.emitters.push(emitter);

  if (state.emitters.length > 50) {
    const idSet = (state.emitterIds = new Set([state.emitters[0][0]]));
    let writePos = 0;
    for (let x = 1; x < state.emitters.length; x++) {
      if (!idSet.has(state.emitters[x][0])) {
        state.emitters[++writePos] = state.emitters[x];
        idSet.add(state.emitters[x][0]);
      }
    }

    writePos++;
    if (writePos < state.emitters.length) state.emitters.splice(writePos);

    state.strategy = DISTINCT_STRATEGY;
  }
}

/**
 * Registers an emitter using DISTINCT_STRATEGY.
 * Only adds emitters that haven't been registered yet, using an ID set for O(1) lookup.
 * @param state The current watch state.
 * @param emitter The emitter to register.
 */
function RegisterDistinct(state: typeof watchState, emitter: Emitter) {
  if (!state.emitterIds.has(emitter[0])) {
    state.emitters.push(emitter);
    state.emitterIds.add(emitter[0]);
  }
}

/**
 * Routes an emitter to the appropriate registration strategy based on current watch state.
 * Does nothing if not within a watch context.
 * @param emitter The emitter to register.
 */
function RegisterEmitter(emitter: Emitter) {
  if (watchState === null) return;

  switch (watchState.strategy) {
    case SAME_STRATEGY:
      RegisterSame(watchState, emitter);
      break;
    case SORTED_STRATEGY:
      RegisterSorted(watchState, emitter);
      break;
    case PUSH_STRATEGY:
      RegisterPush(watchState, emitter);
      break;
    case DISTINCT_STRATEGY:
      RegisterDistinct(watchState, emitter);
      break;
  }
}

/**
 * Registers a scope as a dependency for the current watch context.
 * @param scope The scope to register as a dependency.
 */
function RegisterScope(scope: IObservableScope<any>) {
  if (watchState === null || scope.type === "static") return;

  RegisterEmitter(scope.emitter);
}

/**
 * Gets the current value of a scope, recomputing if dirty.
 * @template T The type of value stored in the scope.
 * @param scope The scope to get the value from.
 * @returns The scope's current value.
 */
function GetScopeValue<T>(scope: IObservableScope<T>): T {
  if (scope.type === "static" || !scope.dirty || scope.destroyed)
    return scope.value as T;

  ExecuteScope(scope);
  return scope.value as T;
}

/**
 * Strategy constants for optimizing emitter registration during watch operations.
 * Each strategy represents a different approach to tracking and deduplicating dependencies.
 */
const SAME_STRATEGY = 1;
const PUSH_STRATEGY = 2;
const SORTED_STRATEGY = 3;
const DISTINCT_STRATEGY = 4;
const SHRINK_STRATEGY = 5;

type WatchStrategy =
  | typeof SAME_STRATEGY
  | typeof SORTED_STRATEGY
  | typeof PUSH_STRATEGY
  | typeof DISTINCT_STRATEGY
  | typeof SHRINK_STRATEGY;

let watchState: {
  value: any;
  emitterIndex: number;
  emitters: Emitter[];
  emitterIds: Set<number> | null;
  currentCalc: { [id: string]: IObservableScope<unknown> | null } | null;
  nextCalc: { [id: string]: IObservableScope<unknown> } | null;
  strategy: WatchStrategy;
} = null;

const watchPool = List.Create<typeof watchState>();

/**
 * Creates a new watch state object, reusing from pool if available.
 * Object pooling reduces GC pressure during frequent watch operations.
 * @returns A new or recycled watch state object.
 */
function CreateWatchState() {
  return (
    List.Pop(watchPool) ?? {
      emitterIndex: 0,
      value: null,
      emitters: null,
      emitterIds: null,
      currentCalc: null,
      nextCalc: null,
      strategy: PUSH_STRATEGY,
    }
  );
}

/**
 * Returns a watch state object to the pool for reuse.
 * Resets all fields to their default values before pooling.
 * @param state The watch state to return to the pool.
 */
function ReturnWatchState(state: typeof watchState) {
  state.emitterIndex = 0;
  state.value = null;
  state.emitters = null;
  state.emitterIds = null;
  state.currentCalc = null;
  state.nextCalc = null;
  state.strategy = SORTED_STRATEGY;

  List.Push(watchPool, state);
}

/**
 * Executes a callback while tracking all scope and emitter dependencies.
 * Creates a watch context that records what was accessed during execution.
 * @param callback The function to execute while tracking dependencies.
 * @param currentCalc Optional map of existing calc scopes to reuse.
 * @returns The watch state containing tracked dependencies and result.
 */
function WatchFunction(
  callback: () => any,
  currentCalc: { [id: string]: IObservableScope<any> | null } | null,
  initialEmitters: Emitter[] | null,
) {
  const parent = watchState;
  watchState = CreateWatchState();
  watchState.emitters = initialEmitters ?? [];
  watchState.currentCalc = currentCalc;
  if (initialEmitters !== null) watchState.strategy = SAME_STRATEGY;

  watchState.value = callback();

  const resultState = watchState;
  watchState = parent;

  if (
    resultState.strategy === SAME_STRATEGY &&
    resultState.emitterIndex < resultState.emitters.length
  ) {
    resultState.emitters = resultState.emitters.slice(
      0,
      resultState.emitterIndex,
    );
    resultState.strategy = SHRINK_STRATEGY;
  }

  return resultState;
}

/**
 * Recomputes a scope's value by re-executing its getFunction.
 * Updates the scope's dependencies and emits if the value changed.
 * @param scope The scope to recompute.
 */
function ExecuteScope(scope: IDynamicObservableScope<any>) {
  scope.dirty = false;
  const state = WatchFunction(
    scope.getFunction,
    scope.calcScopes,
    scope.emitters,
  );

  UpdateEmitters(scope, state.emitters, state.strategy);

  const calcScopes = state.currentCalc;
  scope.calcScopes = state.nextCalc;
  for (const key in calcScopes) DestroyScope(calcScopes[key]);
  if (scope.async)
    state.value.then(function (result: any) {
      scope.value = result;
      Emitter.Emit(scope.emitter, scope);
    });
  else scope.value = state.value;

  ReturnWatchState(state);
}

/**
 * Creates a scope from a function, choosing between static and dynamic based on dependencies.
 * @template T The type of value returned by the callback.
 * @param callback The function to compute the scope's value.
 * @param greedy Whether the scope should batch updates.
 * @param allowStatic Whether to return a static scope if no dependencies are found.
 * @returns A new observable scope.
 */
function ExecuteFunction<T>(
  callback: () => Promise<T> | T,
  greedy: boolean,
  allowStatic: boolean,
): IObservableScope<T> {
  const async = IsAsync(callback);
  const state = WatchFunction(callback, null, null);
  if (!allowStatic || async || state.emitters !== null) {
    const scope: IDynamicObservableScope<T> = CreateDynamicScope(
      callback,
      greedy,
      async ? null : state.value,
    );
    scope.calcScopes = state.nextCalc;
    UpdateEmitters(scope, state.emitters, state.strategy);
    if (async)
      state.value.then(function (result: any) {
        scope.value = result;
        Emitter.Emit(scope.emitter, scope);
      });

    ReturnWatchState(state);
    return scope;
  }

  const value = state.value;
  ReturnWatchState(state);
  return CreateStaticScope(value);
}

/**
 * Creates a computed scope that acts as a gatekeeper for parent scope emissions.
 * If this scope's value doesn't change (=== comparison) it won't emit.
 *
 * Useful for optimizing expensive operations driven by key values (e.g., sort keys).
 * Scopes are memoized by ID and reused across multiple reads within a single parent scope evaluation.
 * Defaults to "default" ID - provide custom IDs when using multiple calc scopes.
 *
 * Only works within a watch context (during another scope's execution).
 * Always creates greedy scopes that batch updates via microtask queue.
 * @template T The type of value returned by the callback.
 * @param callback The function to compute the derived value.
 * @param idOverride Optional custom ID for memoization when using multiple calc scopes.
 * @returns The computed value, reusing existing scope if available.
 */
export function CalcScope<T>(callback: () => T, idOverride?: string): T {
  if (watchState === null) return callback();

  const nextScopes = (watchState.nextCalc ??= {});
  const id = idOverride ?? "default";

  if (nextScopes[id]) {
    RegisterScope(nextScopes[id]);
    return GetScopeValue(nextScopes[id]) as T;
  }

  const currentScopes = watchState.currentCalc;

  nextScopes[id] = currentScopes?.[id] ?? ExecuteFunction(callback, true, true);
  if (currentScopes?.[id]) delete currentScopes[id];

  RegisterScope(nextScopes[id]);
  return GetScopeValue(nextScopes[id]) as T;
}

/**
 * Updates a scope's dependency emitters using efficient diffing.
 * Subscribes to new emitters and unsubscribes from removed ones.
 * @param scope The scope to update dependencies for.
 * @param right The new list of emitters to track.
 * @param distinct Whether emitters are already unique (sorted and deduplicated).
 */
function UpdateEmitters(
  scope: IDynamicObservableScope<unknown>,
  right: Emitter[],
  strategy: WatchStrategy,
) {
  switch (strategy) {
    case SHRINK_STRATEGY: {
      for (let x = right.length; x < scope.emitters.length; x++)
        Emitter.Remove(scope.emitters[x], scope.setCallback);

      break;
    }
    case PUSH_STRATEGY:
    case DISTINCT_STRATEGY:
      strategy === PUSH_STRATEGY
        ? Emitter.Distinct(right)
        : Emitter.Sort(right);
    case SORTED_STRATEGY:
      if (scope.emitters === null || scope.emitters.length === 0) {
        for (let x = 0; x < right.length; x++)
          Emitter.On(right[x], scope.setCallback);
      } else {
        ReconcileSortedEmitters(
          scope.emitters as [number][],
          right as [number][],
          function (emitter) {
            Emitter.On(emitter, scope.setCallback);
          },
          function (emitter) {
            Emitter.Remove(emitter, scope.setCallback);
          },
        );
      }
      break;
  }

  scope.emitters = right;
}

/**
 * Destroys multiple scopes, cleaning up their resources.
 * @param scopes Array of scopes to destroy.
 */
function DestroyAllScopes(scopes: IObservableScope<any>[]) {
  for (let x = 0; x < scopes.length; x++) DestroyScope(scopes[x]);
}

/**
 * Destroys a scope, cleaning up all resources and dependencies.
 * Unsubscribes from emitters, destroys nested scopes, and clears references.
 * @param scope The scope to destroy.
 */
function DestroyScope(scope: IObservableScope<any>) {
  if (!scope || scope.type === "static") return;

  Emitter.Clear(scope.emitter);
  const scopes = scope.calcScopes && Object.values(scope.calcScopes);
  scopes && DestroyAllScopes(scopes);
  scope.calcScopes = null;

  for (let x = 0; x < scope.emitters.length; x++)
    Emitter.Remove(scope.emitters[x], scope.setCallback);

  scope.value = undefined;
  scope.calcScopes = null;
  scope.emitters = null;
  scope.emitter = null;
  scope.getFunction = null;
  scope.setCallback = null;

  scope.destroyed = true;
  scope.onDestroyed && Emitter.Emit(scope.onDestroyed, scope);
}

export namespace ObservableScope {
  /**
   * Creates a new observable scope from a value function.
   * @template T The type of value returned by the function.
   * @param valueFunction Function that returns the scope's value. Can be async.
   * @param greedy Whether updates should be batched via microtask queue. Defaults to false.
   * @param force If true, always creates a dynamic scope even without dependencies. Defaults to false.
   * @returns A new observable scope.
   */
  export function Create<T>(
    valueFunction: { (): T | Promise<T> },
    greedy = false,
    force = false,
  ): IObservableScope<T> {
    return ExecuteFunction(valueFunction, greedy, !force);
  }

  /**
   * Registers an emitter as a dependency for the current watch context.
   * @param emitter The emitter to register as a dependency.
   */
  export function Register(emitter: Emitter) {
    RegisterEmitter(emitter);
  }

  /**
   * Gets a scope's current value without registering as a dependency.
   * @template T The type of value stored in the scope.
   * @param scope The scope to peek at.
   * @returns The scope's current value.
   */
  export function Peek<T>(scope: IObservableScope<T>): T {
    return GetScopeValue(scope);
  }

  /**
   * Gets a scope's current value and registers as a dependency.
   * @template T The type of value stored in the scope.
   * @param scope The scope to get the value from.
   * @returns The scope's current value.
   */
  export function Value<T>(scope: IObservableScope<T>): T {
    if (!scope) return undefined;

    Touch(scope);
    return Peek(scope);
  }

  /**
   * Registers a scope as a dependency without retrieving its value.
   * @template T The type of value stored in the scope.
   * @param scope The scope to register as a dependency.
   */
  export function Touch<T>(scope: IObservableScope<T>) {
    if (!scope) return;

    RegisterScope(scope);
  }

  /**
   * Subscribes to changes on a dynamic scope.
   * @template T The type of value stored in the scope.
   * @param scope The scope to watch for changes.
   * @param callback Function to invoke when the scope's value changes.
   */
  export function Watch<T>(
    scope: IObservableScope<T>,
    callback: EmitterCallback<[IObservableScope<T>]>,
  ) {
    if (!scope || scope.type === "static") return;

    Emitter.On(scope.emitter, callback);
  }

  /**
   * Unsubscribes from changes on a dynamic scope.
   * @template T The type of value stored in the scope.
   * @param scope The scope to stop watching.
   * @param callback The callback function to remove.
   */
  export function Unwatch<T>(
    scope: IObservableScope<T>,
    callback: EmitterCallback<[IObservableScope<T>]>,
  ) {
    if (!scope || scope.type === "static") return;

    Emitter.Remove(scope.emitter, callback);
  }

  /**
   * Registers a callback to be invoked when the scope is destroyed.
   * @param scope The scope to monitor for destruction.
   * @param callback Function to invoke when the scope is destroyed.
   */
  export function OnDestroyed(
    scope: IObservableScope<unknown>,
    callback: EmitterCallback,
  ) {
    if (scope.type === "static") return;

    scope.onDestroyed ??= Emitter.Create();
    Emitter.On(scope.onDestroyed, callback);
  }

  /**
   * Marks a scope as dirty, triggering recomputation on next access or batch.
   * @param scope The scope to mark for update.
   */
  export function Update(scope: IObservableScope<any>) {
    if (!scope) return;

    OnSet(scope);
  }

  /**
   * Destroys a scope, cleaning up all resources and dependencies.
   * @template T The type of value stored in the scope.
   * @param scope The scope to destroy.
   */
  export function Destroy<T>(scope: IObservableScope<T>) {
    DestroyScope(scope);
  }

  /**
   * Destroys multiple scopes, cleaning up their resources.
   * @param scopes Array of scopes to destroy.
   */
  export function DestroyAll(scopes: IObservableScope<unknown>[]) {
    DestroyAllScopes(scopes);
  }
}
