import { IList, INode, List } from "./list";

type ThreadCallback = {(async: boolean): void};

interface IThreadContext {
    async: boolean;
    workEndNode: INode<ThreadCallback>;
    workList: IList<ThreadCallback>;
}

const workTimeMs = 16;
const contextQueue: IList<IThreadContext> = List.Create();

let threadContext: IThreadContext = null;
let timeoutRunning = false;
// const scheduleCallback = typeof requestIdleCallback === 'undefined' ? setTimeout : requestIdleCallback;
const scheduleInitialCallback = queueMicrotask;
const scheduleCallback = setTimeout;

function timeRemaining(this: { end: number }) {
    return this.end - Date.now();
}

function createDeadline() {
    return {
        end: Date.now() + workTimeMs,
        timeRemaining
    } as unknown as IdleDeadline;
}

function ProcessQueue(deadline: IdleDeadline = createDeadline()) {
    let ctx: IThreadContext;
    while(deadline.timeRemaining() > 0 && (ctx = List.Pop(contextQueue)))
        DoWork(ctx, deadline);

    if(contextQueue.size > 0)
        scheduleCallback(ProcessQueue);
    else
        timeoutRunning = false;
}

function ScheduleWork(ctx: IThreadContext) {
    List.Add(contextQueue, ctx);

    if(timeoutRunning)
        return;

    timeoutRunning = true;
    scheduleInitialCallback(ProcessQueue);
}

function Invoke(ctx: IThreadContext, callback: ThreadCallback) {
    const parent = ctx.workEndNode;
    ctx.workEndNode = ctx.workList.head;
    callback(true);
    ctx.workEndNode = parent;
}

function DoWork(ctx: IThreadContext, deadline = createDeadline()) {
    const parentContext = threadContext;
    threadContext = ctx;

    const async = ctx.async;
    let callback: ThreadCallback;
    while(async === ctx.async && deadline.timeRemaining() > 0 && (callback = List.Pop(ctx.workList)))
        Invoke(ctx, callback);

    if(ctx.workList.size > 0)
        ScheduleWork(ctx);

    threadContext = parentContext;
}

function CreateContext(): IThreadContext {
    return {
        async: false,
        workEndNode: null,
        workList: List.Create()
    };
}

function ScheduleCallback(callback: ThreadCallback, before: boolean, async: boolean) {
    threadContext = threadContext || CreateContext();
    threadContext.async = threadContext.async || async;

    if(before)
        List.AddBefore(threadContext.workList, threadContext.workEndNode, callback);
    else if(threadContext.workEndNode) 
        List.AddAfter(threadContext.workList, threadContext.workEndNode, callback);
    else
        threadContext.workEndNode = List.Add(threadContext.workList, callback);
}

function SynchWithoutThread(callback: ThreadCallback) {
    callback(false);
    if(threadContext)
        if(threadContext.async)
            ScheduleWork(threadContext);
        else
            DoWork(threadContext);

    threadContext = null;
}

export function Schedule(callback: ThreadCallback) {
    ScheduleCallback(callback, true, true);
}

export function After(callback: ThreadCallback) {
    ScheduleCallback(callback, false, false);
}

export function Callback<A = void, B = void, C = void, D = void>(callback: (a: A, b: B, c: C, d: D) => void) {
    return function(a?: A, b?: B, c?: C, d?: D) {        
        Schedule(function() { callback(a, b, c, d); });
    };
}

var inSynchCallback = false;
export function Synch(callback: ThreadCallback) {
    if(threadContext || inSynchCallback)
        callback(false);
    else {
        inSynchCallback = true;
        SynchWithoutThread(callback);
        inSynchCallback = false;
    }
}

export function Thread(callback: ThreadCallback) {
    if(threadContext)
        ScheduleCallback(callback, true, false);
    else
        Synch(callback);
}

export function ThreadAsync(callback: ThreadCallback) {
    return new Promise<boolean>(resolve => 
        Thread(function(async) {
            callback(async);
            Thread(resolve);
        })
    );
}