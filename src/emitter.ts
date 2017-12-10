export interface Callback {
    (sender: Emitter, ...args: any[]): void;
}

interface CallbackMap {
    [name: string]: Callback[];
}

export class Emitter {
    private callbackMap: CallbackMap = {};

    public AddListener(name: string, callback: Callback) {
        var events = this.callbackMap[name] || [];
        var ind = events.indexOf(callback);
        if( ind >= 0 )
            throw "Event already registered";

        events.push(callback);
        this.callbackMap[name] = events;
    }

    public RemoveListener(name: string, callback: Callback) {
        var events = this.callbackMap[name] || [];
        var ind = events.indexOf(callback);
        if( ind >= 0 ) {        
            events.splice(ind, 1);
            this.callbackMap[name] = events;
        }
    }

    public Fire(name: string, ...args: any[]) {
        var events = this.callbackMap[name] || [];
        events.forEach((c) => {
            c(this, ...args);
        });
    }

    public Clear(name: string) {
        this.callbackMap[name] = null;
    }

    public ClearAll() {
        for(var key in this.callbackMap)
            this.Clear(key);
    }
}

export default Emitter;