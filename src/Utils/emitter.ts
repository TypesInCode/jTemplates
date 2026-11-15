import { _requestIdleCallback } from "./scheduling";

export enum EmitterEvent {
  SUBSCRIBED,
  UNSUBSCRIBED
}

export type EmitterEventCallback = (event: EmitterEvent, emitter: Emitter) => void;

export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => void;
export type Emitter<T extends readonly any[] = any[]> = [[number, number, Emitter<[EmitterEvent, Emitter]> | undefined], ...EmitterCallback<T>[]];

const pendingCompactEmitters = new Set<Emitter>();

function Compact(emitter: Emitter) {
  if (emitter.length === 1 || emitter[0][0] === 0) return;

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
  if (emitter[0][0] === 0)
    return;

  emitter.splice(1, emitter[0][0]);
  emitter[0][0] = 0;
}

export namespace Emitter {

  export function Create<T extends any[] = any[]>(): Emitter<T> {
    return [[0, -1, undefined]];
  }

  export function On<T extends any[]>(emitter: Emitter<T>, callback: EmitterCallback<T>) {
    emitter.push(callback);
    if (emitter.length - emitter[0][0] === 2)
      emitter[0][2] && Emitter.Emit(emitter[0][2], EmitterEvent.SUBSCRIBED, emitter);
  }

  export function Watch(emitter: Emitter, callback: EmitterCallback<[EmitterEvent, Emitter]>) {
    emitter[0][2] ??= Emitter.Create();
    On(emitter[0][2], callback);
  }

  export function Unwatch(emitter: Emitter, callback: EmitterCallback<[EmitterEvent, Emitter]>) {
    if (!emitter[0][2])
      return;

    Remove(emitter[0][2], callback);
  }

  // Re-entry during emit is not supported and considered a bug in client code
  export function Emit<T extends any[]>(emitter: Emitter<T>, ...args: T) {
    if (emitter[0][1] !== -1)
      throw new Error("Emitter.Emit: re-entry during emit is not supported");

    try {
      for (let x = emitter[0][1] = emitter[0][0] + 1; x < emitter.length; emitter[0][1] = ++x) {
        (emitter[x] as EmitterCallback)(...args);
      }
    }
    finally {
      emitter[0][1] = -1;
    }

    if (emitter[0][0] !== 0)
      Compact(emitter);
  }

  function RemoveFromEnd(emitter: Emitter, index: number) {
    emitter[index] = emitter[emitter.length - 1];
    emitter.pop();
  }

  function RemoveFromBeginning(emitter: Emitter, index: number) {
    const tombstoneSize = emitter[0][0];
    emitter[index] = emitter[tombstoneSize + 1];
    emitter[tombstoneSize + 1] = null;
    emitter[0][0]++;
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    if (emitter.length === 1)
      return;

    const startIndex = emitter[0][0] + 1;
    const index = emitter.indexOf(callback, startIndex);

    if (index < 1)
      return;

    if (index <= emitter[0][1])
      RemoveFromBeginning(emitter, index);
    else
      RemoveFromEnd(emitter, index);

    if (emitter.length - emitter[0][0] === 1)
      emitter[0][2] && Emitter.Emit(emitter[0][2], EmitterEvent.UNSUBSCRIBED, emitter);
  }

  export function Clear(emitter: Emitter) {
    if (emitter.length - emitter[0][0] === 1)
      return;

    emitter.splice(1);
    emitter[0][0] = 0;
    emitter[0][2] && Emitter.Emit(emitter[0][2], EmitterEvent.UNSUBSCRIBED, emitter);
  }
}
