export interface Callback {
    (sender: Emitter, ...args: any[]): void;
}

interface CallbackMap {
    [name: string]: Callback[];
}

export class Emitter {
    private callbackMap: CallbackMap = {};
    private firingEvents: boolean = false;
    private removedEvents: Array<any> = [];

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
            var event = events.splice(ind, 1)[0];
            this.callbackMap[name] = events;
            if(this.firingEvents)
                this.removedEvents.push(event);
        }
    }

    public Fire(name: string, ...args: any[]) {
        this.firingEvents = true;
        var events = (this.callbackMap[name] || []).slice();
        events.forEach((c: any, i: number) => {
            if(this.removedEvents.indexOf(c) < 0)
                c(this, ...args);
            else
                console.log("skipping event because it was removed");
        });
        this.firingEvents = false;
        this.removedEvents = [];
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