import { RemoveNulls } from "./array";

export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => boolean | void;
export type Emitter = [number, ...EmitterCallback[]];

export namespace Emitter {
  let globalId = 0;
  export function Create(): Emitter {
    const emitter: Emitter = [++globalId] as any;
    return emitter;
  }

  export function GetId(emitter: Emitter) {
    return emitter[0];
  }

  export function On(emitter: Emitter, callback: EmitterCallback) {
    emitter.push(callback);
  }

  export function Emit(emitter: Emitter, ...args: any[]) {
    let removed = false;
    for (let x = 1; x < emitter.length; x++) {
      if (emitter[x] === null || (emitter[x] as EmitterCallback)(...args) === true) {
        removed = true;
        emitter[x] = null;
      }
    }

    if (removed) RemoveNulls(emitter);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    const index = emitter.indexOf(callback);
    if (index >= 1)
      emitter[index] = null;
  }

  export function Clear(emitter: Emitter) {
    emitter.splice(1);
  }

  export function Sort(emitters: Emitter[]) {
    return emitters.sort(Compare);
  }

  export function Compare(a: Emitter, b: Emitter) {
    return a[0] - b[0];
  }
}
