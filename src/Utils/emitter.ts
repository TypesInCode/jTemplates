export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => void;
export type Emitter = EmitterCallback[]; // [number, ...EmitterCallback[]];

export namespace Emitter {
  export function Create(): Emitter {
    return [];
  }

  export function On(emitter: Emitter, callback: EmitterCallback) {
    emitter.push(callback);
  }

  export function Emit(emitter: Emitter, ...args: any[]) {
    let writePos = 0;
    for (let x = 0; x < emitter.length; x++) {
      if (emitter[x] !== null) {
        (emitter[x] as EmitterCallback)(...args);
        emitter[writePos++] = emitter[x];
      }
    }

    if (writePos < emitter.length) emitter.splice(writePos);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    const index = emitter.indexOf(callback);
    if (index >= 0) emitter[index] = null;
  }

  export function Clear(emitter: Emitter) {
    emitter.splice(0);
  }
}
