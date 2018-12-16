import { Emitter } from '../emitter';
import { watcherAsync } from './watcherAsync';
import { watcher } from './watcher';

export class Scope<T> extends Emitter {
    private getFunction: {(): Promise<T> | T};
    private trackedEmitters: Set<Emitter>;
    private setCallback: () => void;
    private value: T;
    private defaultValue: T;
    private isAsync: boolean;

    public get Value(): T {
        watcherAsync.Register(this);
        watcher.Register(this);
        /* if(this.dirty)
            this.UpdateValue(); */
        
        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }

    constructor(getFunction: {(): Promise<T> | T}, defaultValue: T) {
        super();
        this.getFunction = getFunction;
        this.trackedEmitters = new Set<Emitter>();
        this.setCallback = this.SetCallback.bind(this);
        this.defaultValue = defaultValue;
        this.isAsync = false;
        this.UpdateValue();
    }

    public Scope<O>(getFunction: {(val: T): Promise<O> | O }, defaultValue: O): Scope<O> {
        return new Scope(async () => getFunction(await this.Value), defaultValue);
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private UpdateScope(newEmitters: Set<Emitter>, value: any) {
        this.trackedEmitters.forEach(emitter => {
            if(!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        newEmitters.delete(this);
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;
        this.value = value;
        this.emit("set");
    }

    private UpdateValue() {
        if(!this.isAsync) {
            var syncValue: any = null;
            var syncEmitters = watcher.Watch(() => {
                syncValue = this.getFunction();
            });
            if(Promise.resolve(syncValue) === syncValue)
                this.isAsync = true;
            else
                this.UpdateScope(syncEmitters, syncValue);
        }

        if(this.isAsync) {
            var asyncValue: any = null;
            watcherAsync.Get(this)
            .then(scope => 
                scope.Watch(() => {
                    return (this.getFunction() as Promise<any>).then(val => asyncValue = val);
                })
            ).then(asyncEmitters => {
                this.UpdateScope(asyncEmitters, asyncValue);
            });
            /* var scope = await watcherAsync.Get(this);
            var value = null;
            var newEmitters = await scope.Watch(() => new Promise(resolve => {
                    var v = this.getFunction();
                    resolve(v);
                }).then(v => {
                    value = v;
                })
            ); */
        }

        /* asyncWatcher.Scope((new Promise(resolve => {
            var value = null;
            var newEmitters = globalEmitter.Watch(() => {
                try {
                    value = this.getFunction();
                }
                catch(err) {
                    console.error(err);
                }
            });

            this.trackedEmitters.forEach(emitter => {
                if(!newEmitters.has(emitter))
                    emitter.removeListener("set", this.setCallback);
            });

            newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
            this.trackedEmitters = newEmitters;
            resolve(value);
        })).then(value => {
            this.value = value as T;
            this.emit("set");
        })); */
        /* (new Promise(resolve => {
            var value = null;
            var newEmitters = globalEmitter.Watch(() => {
                try {
                    value = this.getFunction();
                }
                catch(err) {
                    console.error(err);
                }
            });

            this.trackedEmitters.forEach(emitter => {
                if(!newEmitters.has(emitter))
                    emitter.removeListener("set", this.setCallback);
            });

            newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
            this.trackedEmitters = newEmitters;
            resolve(value);
        })).then(value => {
            this.value = value as T;
            this.emit("set");
        }); */
        /* if(!this.valuePromise)
            this.valuePromise = new Promise((resolve) => {
                var value = null;
                var newEmitters = globalEmitter.Watch(() => {
                    try {
                        value = this.getFunction();
                    }
                    catch(err) {
                        console.error(err);
                    }
                });

                this.trackedEmitters.forEach(emitter => {
                    if(!newEmitters.has(emitter))
                        emitter.removeListener("set", this.setCallback);
                });

                newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
                this.trackedEmitters = newEmitters;
                resolve(value);
            });

        return this.valuePromise; */
        /* if(this.updating)
            return;
        
        this.updating = true;
        var value = null;
        var newEmitters = globalEmitter.Watch(() => {
            try {
                value = this.getFunction();
            }
            catch(err) {
                console.error(err);
            }
        });

        // var newEmitters = new Set<Emitter>(newEmitters);

        this.trackedEmitters.forEach(emitter => {
            if(!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;

        this.value = await value;
        this.dirty = false;
        this.emit("set");
        return this.value as T; */
    }

    private SetCallback() {
        this.UpdateValue();
    }
}