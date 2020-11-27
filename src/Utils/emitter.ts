export type EmitterCallback = {(...args: any[]): void};
export type Emitter = Set<{(...args: any[]): void}>;

export namespace Emitter {

    export function Create(): Emitter {
        return new Set();
    }

    export function On(emitter: Emitter, callback: EmitterCallback) {
        emitter.add(callback);
    }

    export function Emit(emitter: Emitter, ...args: any[]) {
        emitter.forEach(function(cb) {
            cb(...args);
        });
    }

    export function Remove(emitter: Emitter, callback: EmitterCallback) {
        emitter.delete(callback);
    }

}