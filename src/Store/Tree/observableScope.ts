import { ReconcileSortedEmitters } from "../../Utils/array";
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

interface ICalcObservable<T> {
  id: string;
  scope: IObservableScope<T>;
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
  calcScopes: { [id: string]: IObservableScope<unknown> | null } | null;
  calc: boolean;
  onDestroyed: Emitter | null;
  destroyed: boolean;
}

let watchState: [
  Emitter[],
  { [id: string]: IObservableScope<unknown> | null } | null,
  { [id: string]: IObservableScope<unknown> } | null,
] = null;
function WatchScope<T>(scope: IObservableScope<T>): T {
  const parent = watchState;
  watchState = [[], scope.calcScopes, null];

  const value = scope.getFunction();
  const emitters = watchState[0];
  UpdateEmitters(scope, emitters);
  const calcScopes = watchState[1];
  if (calcScopes) {
    const calcScopeValues = Object.values(calcScopes);
    for (let x = 0; x < calcScopeValues.length; x++)
      calcScopeValues[x] && ObservableScope.Destroy(calcScopeValues[x]);
  }

  scope.calcScopes = watchState[2];
  watchState = parent;
  return value;
}

export function CalcScope<T>(callback: () => T, idOverride?: string) {
  if (watchState === null) return callback();

  const nextScopes = (watchState[2] ??= {});
  const currentScopes = watchState[1];
  const id = idOverride ?? callback.toString();

  const currentScope = currentScopes?.[id];
  if (currentScope) {
    delete currentScopes[id];
    nextScopes[id] = currentScope;
  } else if (!nextScopes[id]) {
    const scope = ObservableScope.Create(callback, true);
    nextScopes[id] = scope;
  }

  return ObservableScope.Value(nextScopes[id]);
}

export namespace ObservableScope {
  export function Create<T>(
    valueFunction: { (): T | Promise<T> },
    calc = false,
  ) {
    const scope = {
      getFunction: valueFunction,
      value: null,
      promise: null,
      async: IsAsync(valueFunction),
      dirty: true,
      emitter: Emitter.Create(),
      emitters: null,
      calcScopes: null,
      calc,
      destroyed: false,
      onDestroyed: null,
      setCallback: function () {
        return OnSet(scope);
      },
    } as IObservableScope<T>;
    return scope;
  }

  export function Register(emitter: Emitter) {
    if (watchState === null) return;

    watchState[0].push(emitter);
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
    callback: EmitterCallback,
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
  scope.dirty = true;
  if (scope.async) UpdateValue(scope);
  else if (scope.calc) {
    const startValue = scope.value;
    UpdateValue(scope);
    startValue !== scope.value && Emitter.Emit(scope.emitter, scope);
  } else Emitter.Emit(scope.emitter, scope);
}

let scopeQueue: IObservableScope<unknown>[] = [];
function ProcessScopeQueue() {
  const scopes = scopeQueue;
  scopeQueue = [];

  const distinct = new Set();
  for (let x = 0; x < scopes.length; x++) {
    if (!distinct.has(scopes[x])) {
      distinct.add(scopes[x]);
      DirtyScope(scopes[x]);
    }
  }
}

function OnSet(scope: IObservableScope<any>) {
  if (scope.destroyed) return true;

  if (scope.async || scope.calc) {
    if (scopeQueue.length === 0) queueMicrotask(ProcessScopeQueue);

    scopeQueue.push(scope);
    return;
  }

  DirtyScope(scope);
}

function UpdateValue<T>(scope: IObservableScope<T>) {
  if (!scope.dirty) return;

  scope.dirty = false;
  const value = WatchScope(scope);

  if (scope.async) {
    scope.promise = (value as Promise<T>).then(function (result) {
      if (scope.destroyed) return;

      scope.value = result;
      Emitter.Emit(scope.emitter, scope);
      return result;
    });
  } else scope.value = value;
}

function UpdateEmitters(scope: IObservableScope<unknown>, right: Emitter[]) {
  Emitter.Distinct(right);

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
    },
  );

  scope.emitters = right;
}

function DestroyScope(scope: IObservableScope<any>) {
  if (!scope) return;

  Emitter.Clear(scope.emitter);
  const scopes = scope.calcScopes && Object.values(scope.calcScopes);
  scopes && ObservableScope.DestroyAll(scopes);
  scope.calcScopes = null;

  for (let x = 0; x < scope.emitters.length; x++)
    Emitter.Remove(scope.emitters[x], scope.setCallback);

  scope.calcScopes = null;
  scope.emitters = null;
  scope.emitter = null;
  scope.getFunction = null;
  scope.setCallback = null;

  scope.destroyed = true;
  scope.onDestroyed && Emitter.Emit(scope.onDestroyed);
}
