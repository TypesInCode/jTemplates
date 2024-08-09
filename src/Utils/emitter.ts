export type EmitterCallback<T extends readonly any[] = any[]> = (...args: T) => boolean | void;
export type Emitter = Set<EmitterCallback>;

export namespace Emitter {

    export function Create(): Emitter {
        return new Set();
    }

    export function On(emitter: Emitter, callback: EmitterCallback) {
        emitter.add(callback);
    }

    export function Emit(emitter: Emitter, ...args: any[]) {
        let cleanup: EmitterCallback[];
        emitter.forEach(function(cb) {
            const result = cb(...args);
            if(result === true) {
                cleanup ??= [];
                cleanup.push(cb);
            }
        });

        for(let x=0; cleanup !== undefined && x<cleanup.length; x++)
            Remove(emitter, cleanup[x]);
    }

    export function Remove(emitter: Emitter, callback: EmitterCallback) {
        emitter.delete(callback);
    }

}