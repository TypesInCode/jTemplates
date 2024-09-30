import { Emitter, EmitterCallback } from "../../Utils/emitter";
import { List } from "../../Utils/list";
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
  promise: Promise<T> | null;
  dirty: boolean;
  emitter: Emitter;
  emitters: (Emitter | null)[];
  setCallback: EmitterCallback;
  destroyed: boolean;
  watchEmitters: Emitter[] | null;
}

let currentScope: IObservableScope<unknown> = null;
let currentlyWatching = false;
function WatchScope<T>(scope: IObservableScope<T>): T {
  const parentScope = currentScope;
  const parentWatching = currentlyWatching;

  currentScope = scope;
  currentlyWatching = true;

  const value = scope.getFunction();

  currentScope = parentScope;
  currentlyWatching = parentWatching;
  return value;
}

export namespace ObservableScope {
  export function Create<T>(valueFunction: { (): T | Promise<T> }) {
    const scope = {
      getFunction: valueFunction,
      value: null,
      promise: null,
      async: (valueFunction as any)[Symbol.toStringTag] === "AsyncFunction",
      dirty: true,
      emitter: Emitter.Create(),
      emitters: [],
      destroyed: false,
      watchEmitters: null,
      setCallback: function () {
        return OnSet(scope);
      },
    } as IObservableScope<T>;
    return scope;
  }

  export function Register(emitter: Emitter) {
    if(!currentlyWatching)
      return;

    currentScope.watchEmitters ??= [];
    currentScope.watchEmitters.push(emitter);
  }

  export function Value<T>(scope: IObservableScope<T>) {
    if (!scope) return undefined;

    Register(scope.emitter);
    UpdateValue(scope);
    return scope.value;
  }

  export function Watching() {
    return currentlyWatching;
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

function UpdateScope(scope: IObservableScope<unknown>) {
  UpdateValue(scope);
  scope.promise.then(function() {
    Emitter.Emit(scope.emitter, scope);
  });  
}

const updateScopeQueue = List.Create<IObservableScope<unknown>>();
function ProcessScopeUpdateQueue() {
  const processList = List.Split(updateScopeQueue, 0);

  for(let node = processList.head; node !== null; node = node.next)
    UpdateScope(node.data);

  List.Clear(processList);
}

function QueueScopeUpdate(scope: IObservableScope<unknown>) {
  List.Add(updateScopeQueue, scope);
  if(updateScopeQueue.size === 1)
    queueMicrotask(ProcessScopeUpdateQueue);
}

function DirtyScope(scope: IObservableScope<unknown>) {
  scope.dirty = true;
  scope.async ? QueueScopeUpdate(scope) : Emitter.Emit(scope.emitter, scope);
}

function OnSet(scope: IObservableScope<any>) {
  if (!scope || scope.dirty || scope.destroyed) return scope?.destroyed;

  DirtyScope(scope);
  return false;
}

function UpdateValue<T>(scope: IObservableScope<T>) {
  if(!scope.dirty)
    return;

  scope.dirty = false;
  scope.watchEmitters = null;
  const value = WatchScope(scope);  

  if (scope.async) {
    scope.promise = (value as Promise<T>).then(function(result) {
      scope.value = result;
      return result;
    });
  }
  else scope.value = value;

  UpdateEmitters(scope);
}

function UpdateEmitters(scope: IObservableScope<unknown>) {
  const newEmitters = scope.watchEmitters;
  if (newEmitters === null) {
    for (let x = 0; x < scope.emitters.length; x++)
      Emitter.Remove(scope.emitters[x], scope.setCallback);

    scope.emitters = [];
    return;
  }

  let x = 0;
  for(; x < scope.emitters.length && x < newEmitters.length && scope.emitters[x] === newEmitters[x]; x++) {}

  for(let y=x; y<scope.emitters.length; y++)
    Emitter.Remove(scope.emitters[y], scope.setCallback);

  for(let y=x; y<newEmitters.length; y++)
    Emitter.On(newEmitters[y], scope.setCallback);

  scope.emitters = newEmitters;
}

function DestroyScope(scope: IObservableScope<any>) {
  if (!scope) return;

  scope.emitters = null;
  scope.emitter = null;
  scope.getFunction = null;
  scope.setCallback = null;
  scope.destroyed = true;
}
