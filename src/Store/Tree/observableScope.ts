import { ArrayDiff, RemoveNulls } from "../../Utils/array";
import { Emitter, EmitterCallback } from "../../Utils/emitter";
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
    this.scopeEmitter && Emitter.Clear(this.scopeEmitter); //.clear();
  }
}

export class ObservableScope<T> extends ObservableScopeWrapper<T> {
  constructor(getFunction: { (): T | Promise<T> }) {
    super(ObservableScope.Create(getFunction));
  }
}

export interface IObservableScope<T> extends IDestroyable {
  getFunction: { (): T };
  async: boolean;
  value: T;
  dirty: boolean;
  emitter: Emitter;
  emitters: (Emitter | null)[];
  setCallback: EmitterCallback;
  destroyed: boolean;
  calc: any[] | null;
  watchSet: Set<Emitter> | null;
  watchCalc: any[] | null;
}

let currentScope: IObservableScope<unknown> = null;
let currentWatching = false;
function WatchScope<T>(scope: IObservableScope<T>): T {
  const parentScope = currentScope;
  const parentWatching = currentWatching;

  currentScope = scope;
  currentWatching = true;

  const value = scope.getFunction();

  currentScope = parentScope;
  currentWatching = parentWatching;
  return value;
}

export namespace ObservableScope {
  export function Create<T>(valueFunction: { (): T | Promise<T> }) {
    const scope = {
      getFunction: valueFunction,
      value: null,
      async: (valueFunction as any)[Symbol.toStringTag] === "AsyncFunction",
      dirty: true,
      emitter: Emitter.Create(),
      emitters: [],
      destroyed: false,
      calc: null,
      watchSet: null,
      watchCalc: null,
      setCallback: function () {
        return OnSet(scope);
      },
    } as IObservableScope<T>;
    return scope;
  }

  export function Register(emitter: Emitter) {
    if(!currentWatching)
      return;

    currentScope.watchSet ??= new Set();
    currentScope.watchSet.add(emitter);
  }

  export function Calc<T>(value: T): T {
    if(!currentWatching)
      return;

    currentScope.watchCalc ??= [];
    currentScope.watchCalc.push(value);
    return value;
  }

  export function Value<T>(scope: IObservableScope<T>) {
    if (!scope) return undefined;

    Register(scope.emitter);
    UpdateValue(scope);
    return scope.value;
  }

  export function Watching() {
    return currentWatching;
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

  export function Update(scope: IObservableScope<any>) {
    OnSet(scope);
  }

  export function Destroy<T>(scope: IObservableScope<T>) {
    DestroyScope(scope);
  }
}

function OnSet(scope: IObservableScope<any>) {
  if (!scope || scope.dirty || scope.destroyed) return scope?.destroyed;

  scope.dirty = !!scope.getFunction;
  Emitter.Emit(scope.emitter, scope);
  return false;
}

function UpdateValue<T>(scope: IObservableScope<T>) {
  if (!scope.dirty) return;
  scope.dirty = false;

  const value = WatchScope(scope);
  const change = scope.watchCalc === null || ArrayDiff(scope.calc, scope.watchCalc);
  scope.calc = scope.watchCalc;

  if(change) {
    if (scope.async)
      Promise.resolve(value).then((val) => {
        scope.value = val;
        Emitter.Emit(scope.emitter, scope);
      });
    else scope.value = value;

    UpdateEmitters(scope);
  }

  scope.watchCalc = null;
  scope.watchSet?.clear();
}

function UpdateEmitters<T>(
  scope: IObservableScope<T>
) {
  const newEmitters = scope.watchSet;
  if (newEmitters === null) {
    for (let x = 0; x < scope.emitters.length; x++)
      Emitter.Remove(scope.emitters[x], scope.setCallback);

    scope.emitters = [];
    return;
  }

  let removed = false;
  for (let x = 0; x < scope.emitters.length; x++) {
    if (!newEmitters.delete(scope.emitters[x])) {
      Emitter.Remove(scope.emitters[x], scope.setCallback);
      scope.emitters[x] = null;
      removed = true;
    }
  }

  const initLength = scope.emitters.length;
  scope.emitters.push(...newEmitters);
  for (let x = initLength; x < scope.emitters.length; x++)
    Emitter.On(scope.emitters[x], scope.setCallback);

  removed && RemoveNulls(scope.emitters);
}

function DestroyScope(scope: IObservableScope<any>) {
  if (!scope) return;

  scope.emitters = null;
  scope.emitter = null;
  scope.getFunction = null;
  scope.setCallback = null;
  scope.destroyed = true;
}
