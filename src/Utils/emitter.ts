export interface Callback {
    (...args: any[]): void;
}

/* interface CallbackMap {
    [name: string]: Set<Callback>;
} */

export class Emitter {
    // private callbackMap: CallbackMap = {};
    private callbackMap: Map<string, Set<Callback>> = new Map();

    public addListener(name: string, callback: Callback) {
        // var events = this.callbackMap[name] || new Set();
        var events = this.getEvents(name, true);
        // if (!events.has(callback))
            events.add(callback);

        // this.callbackMap[name] = events;
    }

    public removeListener(name: string, callback: Callback) {
        // var events = this.callbackMap[name];
        var events = this.getEvents(name);
        events && events.delete(callback);
    }

    public emit(name: string, ...args: any[]) {
        // var events = this.callbackMap[name];
        var events = this.getEvents(name);
        events && events.forEach(c => c(...args));
    }

    public clear(name: string) {
        // var events = this.callbackMap[name];
        var events = this.getEvents(name);
        events && events.clear();
    }

    public removeAllListeners() {
        /* for(var key in this.callbackMap)
            this.clear(key); */
        this.callbackMap.forEach(value => value.clear());
        this.callbackMap.clear();
    }

    private getEvents(name: string, ensure = false) {
        var events = this.callbackMap.get(name);
        if(!events && ensure) {
            events = new Set();
            this.callbackMap.set(name, events);
        }

        return events;
    }
}

export default Emitter;