export type EmitterCallback = {(...args: any[]): void};
export type Emitter = Map<string, Set<{(...args: any[]): void}>>;

export namespace Emitter {

    export function Create() {
        return new Map() as Emitter;
    }

    export function On(emitter: Emitter, event: string, callback: EmitterCallback) {
        var callbacks = emitter.get(event);
        if(!callbacks) {
            callbacks = new Set([callback]);
            emitter.set(event, callbacks);
        }
        else
            callbacks.add(callback);
    }

    export function Emit(emitter: Emitter, event: string, ...args: any[]) {
        var callbacks = emitter.get(event);
        if(callbacks)
            callbacks.forEach(cb => cb(...args));
    }

    export function Remove(emitter: Emitter, event: string, callback: {(...args: Array<any>): void}) {
        var callbacks = emitter.get(event);
        if(callbacks)
            callbacks.delete(callback);
    }

}