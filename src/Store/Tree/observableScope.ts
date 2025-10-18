import { ReconcileSortedEmitters } from "../../Utils/array";
import { DistinctArray } from "../../Utils/distinctArray";
import { Emitter, EmitterCallback } from "../../Utils/emitter";
import { IsAsync } from "../../Utils/functions";
import { IDestroyable } from "../../Utils/utils.types";

export class ObservableScopeValue<T> {
  public get Value() {
    return ObservableScope.Value(this.scope);
  }

  constructor(protected scope: IObservableScope<T>) {}
}

export class ObservableScopeWrapper<T>
  extends ObservableScopeValue<T>
  implements IDestroyable
{
  private scopeEmitter: Emitter;

  constructor(scope: IObservableScope<T>) {
    super(scope);
    if (scope.emitter) {
      this.scopeEmitter = Emitter.Create();
      Emitter.On(scope.emitter, () => Emitter.Emit(this.scopeEmitter, this));
    }
  }

  public Scope<O>(callback: { (parent: T): O }): ObservableScope<O> {
    return new ObservableScope<O>(() => callback(this.Value));
  }

  public Watch(callback: { (scope: ObservableScopeValue<T>): void }) {
    if (!this.scopeEmitter) return;

    Emitter.On(this.scopeEmitter, callback);
    callback(this);
  }

  public Unwatch(callback: { (scope: ObservableScopeValue<T>): void }) {
    if (!this.scopeEmitter) return;

    Emitter.Remove(this.scopeEmitter, callback);
  }

  public Destroy() {
    DestroyScope(this.scope);
    this.scopeEmitter && Emitter.Clear(this.scopeEmitter);
  }
}

export class ObservableScope<T> extends ObservableScopeWrapper<T> {
  constructor(getFunction: { (): T | Promise<T> }) {
    super(ObservableScope.Create(getFunction));
  }
}

interface ICalcFunction<T> {
  getFunction: { (): T };
  value: T;
}

export interface IObservableScope<T> extends IDestroyable {
  getFunction: { (): T };
  setCallback: EmitterCallback;
  async: boolean;
  value: T;
  promise: Promise<T> | null;
  dirty: boolean;
  emitter: Emitter;
  emitters: (Emitter | null)[];
  calcFunctions: ICalcFunction<any>[];
  onDestroyed: Emitter | null;
  destroyed: boolean;
}

let watchState: [DistinctArray<Emitter>, ICalcFunction<any>[]] = null;
function WatchScope<T>(
  scope: IObservableScope<T>,
): readonly [T, Emitter[], ICalcFunction<any>[]] {
  const parent = watchState;
  watchState = [DistinctArray.Create(Emitter.GetId), []];

  const value = scope.getFunction();

  const emitters = DistinctArray.Get(watchState[0]);
  emitters.sort(Emitter.Compare);
  const result = [value, emitters, watchState[1]] as const;
  watchState = parent;
  return result;
}

export function CalcScope<T>(callback: () => T) {
  const value = callback();
  if (watchState !== null)
    watchState[1].push({
      getFunction: callback,
      value,
    });

  return value;
}

export namespace ObservableScope {
  export function Create<T>(valueFunction: { (): T | Promise<T> }) {
    const scope = {
      getFunction: valueFunction,
      value: null,
      promise: null,
      async: IsAsync(valueFunction),
      dirty: true,
      emitter: Emitter.Create(),
      emitters: null,
      calcFunctions: null,
      onDestroyed: null,
      destroyed: false,
      setCallback: function () {
        return OnSet(scope);
      },
    } as IObservableScope<T>;
    return scope;
  }

  export function Register(emitter: Emitter) {
    if (watchState === null) return;

    DistinctArray.Push(watchState[0], emitter);
  }

  export function Init<T>(scope: IObservableScope<T>) {
    if (!scope) return;

    UpdateValue(scope);
  }

  export function Peek<T>(scope: IObservableScope<T>) {
    if (!scope) return undefined;

    UpdateValue(scope);
    return scope.value;
  }

  export function Value<T>(scope: IObservableScope<T>) {
    if (!scope) return undefined;

    Touch(scope);
    return Peek(scope);
  }

  export function Touch<T>(scope: IObservableScope<T>) {
    if (!scope || !scope.emitter) return;

    Register(scope.emitter);
  }

  export function Watch<T>(
    scope: IObservableScope<T>,
    callback: EmitterCallback<[IObservableScope<T>]>,
  ) {
    if (!scope || !scope.emitter) return;

    Emitter.On(scope.emitter, callback);
  }

  export function Unwatch<T>(
    scope: IObservableScope<T>,
    callback: EmitterCallback<[IObservableScope<T> | ObservableScopeValue<T>]>,
  ) {
    if (!scope || !scope.emitter) return;

    Emitter.Remove(scope.emitter, callback);
  }

  export function OnDestroyed(
    scope: IObservableScope<unknown>,
    callback: () => void,
  ) {
    scope.onDestroyed ??= Emitter.Create();
    Emitter.On(scope.onDestroyed, callback);
  }

  export function Update(scope: IObservableScope<any>) {
    if (!scope || scope.dirty || scope.destroyed) return;

    OnSet(scope);
  }

  export function Destroy<T>(scope: IObservableScope<T>) {
    DestroyScope(scope);
  }

  export function DestroyAll(scopes: IObservableScope<unknown>[]) {
    for (let x = 0; x < scopes.length; x++) Destroy(scopes[x]);
  }
}

function DirtyScope(scope: IObservableScope<any>) {
  if (scope.dirty || !scope.getFunction) return;
  
  let dirty = scope.calcFunctions.length === 0;
  for (let x = 0; !dirty && x < scope.calcFunctions.length; x++) {
    const calc = scope.calcFunctions[x];
    dirty = dirty || calc.value !== calc.getFunction();
  }

  scope.dirty = dirty;
  if (!scope.dirty) return;

  if (scope.async) {
    UpdateValue(scope);
  } else Emitter.Emit(scope.emitter, scope);
}

// const scopeQueue = new Set<IObservableScope<unknown>>();
// const scopeQueue = DistinctArray.Create<IObservableScope<unknown>>();
let scopeQueue: IObservableScope<unknown>[] = [];
function ProcessScopeQueue() {
  /* const scopes = Array.from(scopeQueue);
  scopeQueue.clear(); */
  const scopes = scopeQueue; // DistinctArray.Get(scopeQueue);
  scopeQueue = []; // DistinctArray.Clear(scopeQueue);

  for (let x = 0; x < scopes.length; x++) DirtyScope(scopes[x]);
}

function OnSet(scope: IObservableScope<any>) {
  if (scope.destroyed) return true;

  if (scope.async || scope.calcFunctions.length > 0) {
    // if (scopeQueue.size === 0) queueMicrotask(ProcessScopeQueue);
    // if (DistinctArray.Size(scopeQueue) === 0) queueMicrotask(ProcessScopeQueue);
    if (scopeQueue.length === 0) queueMicrotask(ProcessScopeQueue);

    // DistinctArray.Push(scopeQueue, scope); //scopeQueue.add(scope);
    scopeQueue.push(scope);
    return;
  }

  DirtyScope(scope);
}

function UpdateValue<T>(scope: IObservableScope<T>) {
  if (!scope.dirty) return;

  scope.dirty = false;
  const [value, emitters, calcFunctions] = WatchScope(scope);

  if (scope.async) {
    scope.promise = (value as Promise<T>).then(function (result) {
      if (scope.destroyed) return;

      scope.value = result;
      Emitter.Emit(scope.emitter, scope);
      return result;
    });
  } else scope.value = value;

  scope.calcFunctions = calcFunctions;
  UpdateEmitters(scope, emitters);
}

function UpdateEmitters(scope: IObservableScope<unknown>, right: Emitter[]) {
  if (scope.emitters === null) {
    for (let x = 0; x < right.length; x++)
      Emitter.On(right[x], scope.setCallback);

    scope.emitters = right;
    return;
  }

  if (right.length === 0) {
    if (scope.emitters.length > 0) {
      for (let x = 0; x < scope.emitters.length; x++)
        Emitter.Remove(scope.emitters[x], scope.setCallback);

      scope.emitters = [];
    }
    return;
  }

  ReconcileSortedEmitters(
    scope.emitters as [number][],
    right as [number][],
    function (emitter) {
      Emitter.On(emitter, scope.setCallback);
    },
    function (emitter) {
      Emitter.Remove(emitter, scope.setCallback);
    }
  );

  scope.emitters = right;
}

function DestroyScope(scope: IObservableScope<any>) {
  if (!scope) return;

  scope.emitters = null;
  scope.emitter = null;
  scope.getFunction = null;
  scope.setCallback = null;
  scope.calcFunctions = null;
  scope.destroyed = true;
  scope.onDestroyed !== null && Emitter.Emit(scope.onDestroyed);
}