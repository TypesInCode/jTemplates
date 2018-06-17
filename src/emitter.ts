export interface Callback {
    (sender: Emitter, ...args: any[]): void;
}

interface CallbackMap {
    [name: string]: Set<Callback> // Callback[];
}

export class Emitter {
    private callbackMap: CallbackMap = {};
    private removedEvents: Array<any> = [];

    public AddListener(name: string, callback: Callback) {
        var events = this.callbackMap[name] || new Set();
        if (!events.has(callback))
            events.add(callback);

        this.callbackMap[name] = events;
    }

    public RemoveListener(name: string, callback: Callback) {
        var events = this.callbackMap[name]; // || new Set();
        events && events.delete(callback);
    }

    public Fire(name: string, ...args: any[]) {
        var events = this.callbackMap[name];
        events && events.forEach(c => c(this, ...args));
    }

    public Clear(name: string) {
        var events = this.callbackMap[name];
        events && events.clear();
    }

    public ClearAll() {
        for(var key in this.callbackMap)
            this.Clear(key);
    }
}

export default Emitter;