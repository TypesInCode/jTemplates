import { Emitter, EmitterCallback } from "../../Utils/emitter";
import { IDestroyable } from "../../Utils/utils.types";

export class ObservableScopeValue<T> {
    public get Value() {
        return ObservableScope.Value(this.scope);
    }

    constructor(protected scope: IObservableScope<T>) { }
}

export class ObservableScopeWrapper<T> extends ObservableScopeValue<T> implements IDestroyable {
    private scopeEmitter: Emitter;

    constructor(scope: IObservableScope<T>) { 
        super(scope);
        if(scope.emitter) {
            this.scopeEmitter = Emitter.Create();
            Emitter.On(scope.emitter, () => Emitter.Emit(this.scopeEmitter, this));
        }
    }

    public Scope<O>(callback: {(parent: T): O}): ObservableScope<O> {
        return new ObservableScope<O>(() => callback(this.Value));
    }

    public Watch(callback: {(scope: ObservableScopeValue<T>): void}) {
        if(!this.scopeEmitter)
            return;

        Emitter.On(this.scopeEmitter, callback);
        callback(this);
    }

    public Unwatch(callback: {(scope: ObservableScopeValue<T>): void}) {
        if(!this.scopeEmitter)
            return;

        Emitter.Remove(this.scopeEmitter, callback);
    }

    public Destroy() {
        DestroyScope(this.scope);
        this.scopeEmitter && this.scopeEmitter.clear();
    }
}

export class ObservableScope<T> extends ObservableScopeWrapper<T> {
    constructor(getFunction: T | {(): T | Promise<T>}) {
        super(ObservableScope.Create(getFunction));
    }
}

export interface IObservableScope<T> extends IDestroyable {
    getFunction: {(): T};
    async: boolean;
    value: T;
    dirty: boolean;
    emitter: Emitter;
    emitters: Set<Emitter>;
    setCallback: EmitterCallback;
    destroyed: boolean;
    dependencies?: IObservableScope<unknown>[];
}

let currentSet: Set<Emitter> = null;
let watching = false;
function WatchAction(action: {(): void}) {
    const parentSet = currentSet;
    currentSet = null;

    const parentWatching = watching;
    watching = true;

    action();

    const lastSet = currentSet;
    currentSet = parentSet;

    watching = parentWatching;
    return lastSet;
}

export namespace ObservableScope {
    export function Create<T>(valueFunction: {(): T | Promise<T>} | T, dependencies?: IObservableScope<unknown>[]) {        
        const hasFunction = typeof valueFunction === 'function';
        const scope = {
            getFunction: hasFunction ? valueFunction : null,
            value: hasFunction ? null : valueFunction,
            async: hasFunction ? (valueFunction as any)[Symbol.toStringTag] === 'AsyncFunction' : false,
            dirty: hasFunction,
            emitter: hasFunction ? Emitter.Create() : null,
            emitters: null,
            destroyed: false,
            setCallback: hasFunction ? function() {
                return OnSet(scope);
            } : null,
            dependencies
        } as IObservableScope<T>;
        return scope;
    }

    export function Register(emitter: Emitter) {
        if(!watching || !emitter)
            return;

        currentSet ??= new Set();
        currentSet.add(emitter);
    }    

    export function Value<T>(scope: IObservableScope<T>) {
        if(!scope)
            return undefined;
    
        Register(scope.emitter);
        UpdateValue(scope);
        return scope.value;
    }

    export function Watching() {
        return watching;
    }

    export function Touch<T>(scope: IObservableScope<T>) {
        if(!scope || !scope.emitter)
            return;

        Register(scope.emitter);
    }

    export function Watch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T>]>) {
        if(!scope || !scope.emitter)
            return;

        Emitter.On(scope.emitter, callback);
    }

    export function Unwatch<T>(scope: IObservableScope<T>, callback: EmitterCallback<[IObservableScope<T> | ObservableScopeValue<T>]>) {
        if(!scope || !scope.emitter)
            return;
        
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
    if(!scope || scope.dirty || scope.destroyed)
        return scope.destroyed;

    scope.dirty = !!scope.getFunction;
    Emitter.Emit(scope.emitter, scope);
    return false;
}

function UpdateValue<T>(scope: IObservableScope<T>) {
    if(!scope.dirty)
        return;

    scope.dirty = false;
    let value: T = null;
    const emitters = scope.getFunction && WatchAction(() =>
        value = scope.getFunction()
    );
    
    if(scope.async)
        Promise.resolve(value).then(val => {
            scope.value = val;
            Emitter.Emit(scope.emitter, scope);
        });
    else
        scope.value = value;

    UpdateEmitters(scope, emitters);
}

function DestroyScope(scope: IObservableScope<any>) {
    if(!scope)
        return;

    if(scope.dependencies !== undefined)
        for(let x=0; x<scope.dependencies.length; x++)
            DestroyScope(scope.dependencies[x]);
    
    /* scope.emitters && scope.emitters.forEach(e => 
        Emitter.Remove(e, scope.setCallback)
    ); */
    
    scope.emitters && scope.emitters.clear();
    scope.emitter && scope.emitter.clear();
    scope.getFunction = null;
    scope.setCallback = null;
    scope.destroyed = true;
}

function UpdateEmitters<T>(scope: IObservableScope<T>, newEmitters?: Set<Emitter>) {
    /* const lastEmitters = scope.emitters && newEmitters ? scope.emitters.difference(newEmitters) : scope.emitters;
    lastEmitters?.forEach((e: Emitter) => Emitter.Remove(e, scope.setCallback));

    const nextEmitters = scope.emitters && newEmitters ? newEmitters.difference(scope.emitters) : newEmitters;
    nextEmitters?.forEach((e: Emitter) => Emitter.On(e, scope.setCallback)); */

    if(newEmitters) {
        newEmitters.forEach(e => {
            if(!scope.emitters?.delete(e))
                Emitter.On(e, scope.setCallback);
        });
    }

    if(scope.emitters)
        scope.emitters.forEach(e => Emitter.Remove(e, scope.setCallback));

    scope.emitters = newEmitters;
}