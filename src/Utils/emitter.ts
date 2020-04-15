export class Emitter {
    
    private events: Map<string, Set<{(): void}>> = new Map();

    public On(event: string, callback: {(): void}) {
        var callbacks = this.events.get(event);
        if(!callbacks) {
            callbacks = new Set();
            this.events.set(event, callbacks);
        }

        callbacks.add(callback);
    }

    public Emit(event: string) {
        var callbacks = this.events.get(event);
        if(callbacks)
            callbacks.forEach(cb => cb());
    }

    public Remove(event: string, callback: {(): void}) {
        var callbacks = this.events.get(event);
        if(callbacks)
            callbacks.delete(callback);
    }

    public Clear() {
        this.events.clear();
    }

}

export default Emitter;