import { Emitter } from '../emitter';
import { watcher } from './watcher';

export class Scope<T> extends Emitter {
    private getFunction: {(): Promise<T> | T};
    private trackedEmitters: Set<Emitter>;
    private setCallback: () => void;
    private value: T;
    private defaultValue: T;
    private dirty: boolean;
    private isSync: boolean;

    public get Value(): T {
        watcher.Register(this);
        if(this.dirty)
            this.UpdateValue();
        
        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }

    constructor(getFunction: {(): Promise<T> | T}, defaultValue: T) {
        super();
        this.getFunction = getFunction;
        this.trackedEmitters = new Set<Emitter>();
        this.setCallback = this.SetCallback.bind(this);
        this.defaultValue = defaultValue;
        this.isSync = false;
        this.UpdateValue();
    }

    public Scope<O>(getFunction: {(val: T): Promise<O> | O }, defaultValue: O): Scope<O> {
        return new Scope(() => getFunction(this.Value), defaultValue);
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private UpdateEmitters(newEmitters: Set<Emitter>) {
        this.trackedEmitters.forEach(emitter => {
            if(!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        newEmitters.delete(this);
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;
    }

    private UpdateValue() {
        this.dirty = false;
        if(!this.isSync) {
            watcher.WatchAsync(() => {
                var val = this.getFunction();
                var promise = Promise.resolve(val);
                this.isSync = promise !== val;
                return promise;
            }).then(val => {
                this.UpdateEmitters(val.emitters);
                this.value = val.value;
                this.emit("set");
            });
            /* watcherAsync.Get()
            .then(scope => 
                scope.Watch(() => {
                    var val = this.getFunction();
                    var promise = Promise.resolve(val);
                    this.isSync = promise !== val;
                    return promise;
                })
            ).then(resp => {
                this.UpdateScope(resp[0], resp[1]);
                this.emit("set");
            }); */
        }
        else {
            var syncEmitters = watcher.Watch(() => {
                this.value = this.getFunction() as T;
            });
            this.UpdateEmitters(syncEmitters);
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
        // this.UpdateValue();        
        this.dirty = true;
        this.emit("set");
    }
}