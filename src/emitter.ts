export interface Callback {
    (...args: any[]): void;
}

interface CallbackMap {
    [name: string]: Set<Callback>;
}

export class Emitter {
    private callbackMap: CallbackMap = {};
    private emitting: boolean = false;

    public addListener(name: string, callback: Callback) {
        var events = this.callbackMap[name] || new Set();
        if (!events.has(callback))
            events.add(callback);

        this.callbackMap[name] = events;
    }

    public removeListener(name: string, callback: Callback) {
        var events = this.callbackMap[name];
        events && events.delete(callback);
    }

    public emit(name: string, ...args: any[]) {
        if(this.emitting)
            return;
        
        this.emitting = true;
        var events = this.callbackMap[name];
        events && events.forEach(c => c(...args));
        this.emitting = false;
    }

    public clear(name: string) {
        var events = this.callbackMap[name];
        events && events.clear();
    }

    public removeAllListeners() {
        for(var key in this.callbackMap)
            this.clear(key);
    }
}

export default Emitter;