import { RemoveNulls } from "./array";

export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => boolean | void;
export type Emitter = Array<EmitterCallback | null> & { _id: number };

export namespace Emitter {
  let globalId = 0;
  export function Create(): Emitter {
    const emitter: Emitter = [] as any;
    emitter._id = globalId++;
    return emitter;
  }

  export function On(emitter: Emitter, callback: EmitterCallback) {
    emitter.push(callback);
  }

  export function Emit(emitter: Emitter, ...args: any[]) {
    let removed = false;
    for (let x = 0; x < emitter.length; x++) {
      if (emitter[x] === null || emitter[x](...args) === true) {
        removed = true;
        emitter[x] = null;
      }
    }

    if (removed) RemoveNulls(emitter);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    const index = emitter.indexOf(callback);
    if (index >= 0)
      emitter[index] = null;
  }

  export function Clear(emitter: Emitter) {
    emitter.splice(0);
  }

  export function Sort(emitters: Emitter[]) {
    return emitters.sort(Compare);
  }

  function Compare(a: Emitter, b: Emitter) {
    return a._id - b._id;
  }
}
