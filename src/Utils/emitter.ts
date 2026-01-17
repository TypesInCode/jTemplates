import { InsertionSortTuples } from "./array";

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
    let writePos = 1;
    for (let x = 1; x < emitter.length; x++) {
      if (
        emitter[x] !== null &&
        (emitter[x] as EmitterCallback)(...args) !== true
      )
        emitter[writePos++] = emitter[x];
    }

    if (writePos < emitter.length) emitter.splice(writePos);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    const index = emitter.indexOf(callback);
    if (index >= 1) emitter[index] = null;
  }

  export function Clear(emitter: Emitter) {
    emitter.splice(1);
  }

  export function Distinct(emitters: Emitter[]) {
    if (emitters.length < 2) return;

    Sort(emitters);

    let writePos = 0;
    for (let x = 1; x < emitters.length; x++) {
      if (emitters[x][0] !== emitters[writePos][0]) {
        emitters[++writePos] = emitters[x];
      }
    }

    writePos++;
    if (writePos < emitters.length) emitters.splice(writePos);
  }

  export function Sort(emitters: Emitter[]) {
    if (emitters.length < 11) InsertionSortTuples(emitters);
    else emitters.sort(Compare);
  }

  export function Compare(a: Emitter, b: Emitter) {
    return a[0] - b[0];
  }
}
