const IMMEDIATE_OVERRIDE = typeof process !== "undefined" ?
  process.env.SYNC_SCHEDULING === 'true' :
  false;

export const _requestAnimationFrame: typeof window.requestAnimationFrame = IMMEDIATE_OVERRIDE ?
  function immediateRequestAnimationFrame(callback: FrameRequestCallback) {
    callback(0);
    return 0;
  } :  window.requestAnimationFrame;

export const _setTimeout: typeof window.setTimeout = IMMEDIATE_OVERRIDE ?
  function immediateSetTimeout(handler: TimerHandler, timeout?: number, ...args: any[]) {
    if (typeof handler === "function")
      handler(...args);

    return 0;
  } as typeof window.setTimeout : window.setTimeout;

export const _queueMicrotask: typeof window.queueMicrotask = IMMEDIATE_OVERRIDE ?
  function immediateQueueMicrotask(callback: VoidFunction) {
    callback();
  } : window.queueMicrotask;

export const _requestIdleCallback: typeof window.requestIdleCallback = IMMEDIATE_OVERRIDE ?
  function immediateRequestIdleCallback(callback: IdleRequestCallback, options?: IdleRequestOptions) {
    callback({ didTimeout: false, timeRemaining: () => 0 });
    return 0;
  } as typeof window.requestIdleCallback : window.requestIdleCallback ?? window.setTimeout;
