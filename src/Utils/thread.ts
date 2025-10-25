import { IList, INode, List } from "./list";

/**
 * A threading utility for managing asynchronous and synchronous callbacks
 * in an efficient manner, similar to how requestIdleCallback works but with
 * more control over execution timing.
 *
 * Only the following functions result in actual thread processing:
 * - Synch() - executes callbacks synchronously or asynchronously based on context
 * - Thread() - schedules callbacks that may run synchronously or asynchronously
 * - ThreadAsync() - creates async operations that return promises
 *
 * Schedule() and After() are scheduling functions that add work to the queue,
 * but don't trigger processing themselves. They only take effect when called
 * within a callback passed to one of the three processing functions above.
 *
 * Example usage:
 * ```typescript
 * import { Schedule, Thread, ThreadAsync } from './thread';
 *
 * // Run a callback in the next tick
 * Thread(() => {
 *   console.log('This runs in thread context');
 *   // Schedule work to be done after this callback
 *   Schedule(() => {
 *     console.log('This runs asynchronously after the thread callback');
 *   });
 * });
 *
 * // Create an async operation that returns a promise
 * ThreadAsync(async () => {
 *   const result = await someAsyncOperation();
 *   console.log('Result:', result);
 * }).then(completed => {
 *   console.log('Async operation completed:', completed);
 * });
 *
 * // Create a callback wrapper
 * const wrappedCallback = Callback((data: string) => {
 *   console.log('Received data:', data);
 * });
 *
 * // Schedule the wrapped callback (this will be processed by Thread)
 * Thread(() => {
 *   wrappedCallback('Hello World');
 * });
 * ```
 */

/**
 * Type definition for thread callback functions
 */
type ThreadCallback = { (async: boolean): void };

interface IThreadContext {
  /**
   * Indicates whether the current thread is asynchronous
   */
  async: boolean;

  /**
   * The node that represents the end of work in the current context
   */
  workEndNode: INode<ThreadCallback>;

  /**
   * The list of callbacks to be executed in this context
   */
  workList: IList<ThreadCallback>;
}

// Constants
/**
 * The maximum time allowed for work execution in milliseconds
 */
const workTimeMs = 16;

/**
 * Queue of thread contexts that need processing
 */
const contextQueue: IList<IThreadContext> = List.Create();

// State variables
let threadContext: IThreadContext = null;
let timeoutRunning = false;

// Callback scheduling functions
const scheduleInitialCallback = queueMicrotask;
const scheduleCallback = setTimeout;

/**
 * Calculates the remaining time until the deadline
 * @param this - The deadline object
 * @returns The remaining time in milliseconds
 */
function timeRemaining(this: { end: number }) {
  return this.end - Date.now();
}

/**
 * Creates a deadline object for time management
 * @returns An IdleDeadline object with timeRemaining function
 */
function createDeadline() {
  return {
    end: Date.now() + workTimeMs,
    timeRemaining,
  } as unknown as IdleDeadline;
}

/**
 * Processes the queue of thread contexts, executing callbacks within the time limit
 * @param deadline - The deadline for execution
 */
function ProcessQueue(deadline: IdleDeadline = createDeadline()) {
  let ctx: IThreadContext;
  while (deadline.timeRemaining() > 0 && (ctx = List.Pop(contextQueue)))
    DoWork(ctx, deadline);

  if (contextQueue.size > 0) scheduleCallback(ProcessQueue);
  else timeoutRunning = false;
}

/**
 * Schedules work for a thread context to be processed
 * @param ctx - The thread context to schedule
 */
function ScheduleWork(ctx: IThreadContext) {
  List.Add(contextQueue, ctx);

  if (timeoutRunning) return;

  timeoutRunning = true;
  scheduleInitialCallback(ProcessQueue);
}

/**
 * Invokes a callback in the specified thread context
 * @param ctx - The thread context
 * @param callback - The callback to invoke
 */
function Invoke(ctx: IThreadContext, callback: ThreadCallback) {
  const parent = ctx.workEndNode;
  ctx.workEndNode = ctx.workList.head;
  callback(true);
  ctx.workEndNode = parent;
}

/**
 * Executes work for a specific thread context within a deadline
 * @param ctx - The thread context to execute work for
 * @param deadline - The deadline for execution (default: createDeadline())
 */
function DoWork(ctx: IThreadContext, deadline = createDeadline()) {
  const parentContext = threadContext;
  threadContext = ctx;

  const async = ctx.async;
  let callback: ThreadCallback;
  while (
    async === ctx.async &&
    deadline.timeRemaining() > 0 &&
    (callback = List.Pop(ctx.workList))
  )
    Invoke(ctx, callback);

  if (ctx.workList.size > 0) ScheduleWork(ctx);

  threadContext = parentContext;
}

/**
 * Creates a new thread context
 * @returns A new IThreadContext object
 */
function CreateContext(): IThreadContext {
  return {
    async: false,
    workEndNode: null,
    workList: List.Create(),
  };
}

/**
 * Schedules a callback to be executed in the appropriate context
 * @param callback - The callback function to schedule
 * @param before - Whether to add the callback before existing ones
 * @param async - Whether this is an asynchronous operation
 */
function ScheduleCallback(
  callback: ThreadCallback,
  before: boolean,
  async: boolean,
) {
  threadContext = threadContext || CreateContext();
  threadContext.async = threadContext.async || async;

  if (before)
    List.AddBefore(threadContext.workList, threadContext.workEndNode, callback);
  else if (threadContext.workEndNode)
    List.AddAfter(threadContext.workList, threadContext.workEndNode, callback);
  else threadContext.workEndNode = List.Add(threadContext.workList, callback);
}

/**
 * Executes a callback synchronously without using threading
 * @param callback - The callback to execute
 */
function SynchWithoutThread(callback: ThreadCallback) {
  callback(false);
  if (threadContext)
    if (threadContext.async) ScheduleWork(threadContext);
    else DoWork(threadContext);

  threadContext = null;
}

/**
 * Schedules a callback to run asynchronously
 * @param callback - The callback function to schedule
 */
export function Schedule(callback: ThreadCallback) {
  ScheduleCallback(callback, true, true);
}

/**
 * Schedules a callback to run after existing callbacks in the same context
 * @param callback - The callback function to schedule
 */
export function After(callback: ThreadCallback) {
  ScheduleCallback(callback, false, false);
}

/**
 * Creates a wrapper function that schedules callbacks to run asynchronously
 * @param callback - The original callback function
 * @returns A wrapped function that schedules execution
 */
export function Callback<A = void, B = void, C = void, D = void>(
  callback: (a: A, b: B, c: C, d: D) => void,
) {
  return function (a?: A, b?: B, c?: C, d?: D) {
    Schedule(function () {
      callback(a, b, c, d);
    });
  };
}

/**
 * Flag to track if we're currently in a synchronous callback
 */
var inSynchCallback = false;

/**
 * Executes a callback synchronously or asynchronously based on context
 * @param callback - The callback function to execute
 */
export function Synch(callback: ThreadCallback) {
  if (threadContext || inSynchCallback) callback(false);
  else {
    inSynchCallback = true;
    SynchWithoutThread(callback);
    inSynchCallback = false;
  }
}

/**
 * Schedules a callback that can run either synchronously or asynchronously
 * @param callback - The callback function to schedule
 */
export function Thread(callback: ThreadCallback) {
  if (threadContext) ScheduleCallback(callback, true, false);
  else Synch(callback);
}

/**
 * Creates an asynchronous thread operation that returns a promise
 * @param callback - The callback function to execute
 * @returns A promise that resolves when the callback completes
 */
export function ThreadAsync(callback: ThreadCallback) {
  return new Promise<boolean>((resolve) =>
    Thread(function (async) {
      callback(async);
      Thread(resolve);
    })
  );
}