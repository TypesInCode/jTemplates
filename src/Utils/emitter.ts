import { RemoveNulls } from "./array";

export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => boolean | void;
export type Emitter = Array<EmitterCallback>; // Set<EmitterCallback>;

export namespace Emitter {
  export function Create(): Emitter {
    return [];
  }

  export function On(emitter: Emitter, callback: EmitterCallback) {
    emitter.push(callback);
  }

  export function Emit(emitter: Emitter, ...args: any[]) {
    let removed = false;
    for (let x = 0; x < emitter.length; x++) {
      if (emitter[x](...args) === true) {
        removed = true;
        emitter[x] = null;
      }
    }

    if (removed) RemoveNulls(emitter);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    const index = emitter.indexOf(callback);
    if (index >= 0) {
      emitter[index] = null;
      RemoveNulls(emitter, index);
    }
  }

  export function Clear(emitter: Emitter) {
    emitter.splice(0);
  }
}
