import { _requestIdleCallback } from "./scheduling";

export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => void;
export type Emitter = [number, ...EmitterCallback[]]; // [number, ...EmitterCallback[]];

const pendingCompactEmitters = new Set<Emitter>();

function Compact(emitter: Emitter) {
  if (emitter.length === 1 || emitter[0] === 0) return;

  pendingCompactEmitters.add(emitter);
  ScheduleCompact();
}

let compactScheduled = false;
function ScheduleCompact() {
  if (compactScheduled) return;

  compactScheduled = true;
  _requestIdleCallback(PerformCompact);
}

function PerformCompact() {
  compactScheduled = false;

  let compactEmitters = Array.from(pendingCompactEmitters);
  pendingCompactEmitters.clear();

  for (let x = 0; x < compactEmitters.length; x++)
    CompactEmitter(compactEmitters[x]);
}

function CompactEmitter(emitter: Emitter) {
  if (emitter[0] === 0)
    return;

  emitter.splice(1, emitter[0]);
  emitter[0] = 0;
}

export namespace Emitter {

  export function Create(): Emitter {
    return [0];
  }

  export function On(emitter: Emitter, callback: EmitterCallback) {
    emitter.push(callback);
  }

  export function Emit(emitter: Emitter, ...args: any[]) {
    for (let x = emitter[0] + 1; x < emitter.length; x++)
      (emitter[x] as EmitterCallback)(...args);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    if (emitter.length === 1)
      return;

    const startIndex = emitter[0] + 1;
    const index = emitter.indexOf(callback, startIndex);
    if (index > 0) {
      emitter[0]++;
      emitter[index] = emitter[startIndex];
      emitter[startIndex] = null;
      Compact(emitter);
    }
  }

  export function Clear(emitter: Emitter) {
    emitter.length > 1 && emitter.splice(1);
    emitter[0] = 0;
  }
}
