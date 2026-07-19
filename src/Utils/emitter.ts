export type EmitterCallback<T extends readonly any[] = any[]> = (
  ...args: T
) => void;
export type Emitter = EmitterCallback[]; // [number, ...EmitterCallback[]];

export namespace Emitter {
  const destroyed = new WeakSet();
  let pendingCompactEmitters: Emitter[] = [];

  export function Create(): Emitter {
    return [];
  }

  const scheduleCallback =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : setTimeout;

  export function Compact(emitter: Emitter) {
    if (emitter.length === 0) return;

    pendingCompactEmitters.push(emitter);
    ScheduleCompact();
  }

  let compactScheduled = false;
  function ScheduleCompact() {
    if (compactScheduled) return;

    compactScheduled = true;
    scheduleCallback(PerformCompact);
  }

  function PerformCompact() {
    compactScheduled = false;

    let compactEmitters = pendingCompactEmitters;
    pendingCompactEmitters = [];

    const processedEmitters = new Set<Emitter>();

    for (let x = 0; x < compactEmitters.length; x++)
      if (!processedEmitters.has(compactEmitters[x])) {
        CompactEmitter(compactEmitters[x]);
        processedEmitters.add(compactEmitters[x]);
      }
  }

  function CompactEmitter(emitter: Emitter) {
    let count = 0;
    for (
      ;
      count < emitter.length &&
      (emitter[count] === null || destroyed.has(emitter[count]));
      count++
    ) {}

    if (count > 0) emitter.splice(0, count);

    let writePos = 0;
    for (let x = 0; x < emitter.length; x++) {
      if (emitter[x] !== null && !destroyed.has(emitter[x]))
        emitter[writePos++] = emitter[x];
    }

    if (writePos < emitter.length) emitter.splice(writePos);
  }

  export function DestroyCallback(callback: EmitterCallback) {
    destroyed.add(callback);
  }

  export function On(emitter: Emitter, callback: EmitterCallback) {
    emitter.push(callback);
  }

  export function Emit(emitter: Emitter, ...args: any[]) {
    let writePos = 0;
    for (let x = 0; x < emitter.length; x++) {
      if (emitter[x] !== null && !destroyed.has(emitter[x])) {
        (emitter[x] as EmitterCallback)(...args);
        emitter[writePos++] = emitter[x];
      }
    }

    if (writePos < emitter.length) emitter.splice(writePos);
  }

  export function Remove(emitter: Emitter, callback: EmitterCallback) {
    const index = emitter.indexOf(callback);
    if (index >= 0) {
      emitter[index] = null;
      Compact(emitter);
    }
  }

  export function Clear(emitter: Emitter) {
    if (emitter.length === 0) return;

    emitter.splice(0);
  }
}
