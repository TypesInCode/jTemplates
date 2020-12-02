import { IList, INode, List } from "./list";

interface IThreadContext {
    async: boolean;
    workEndNode: INode<{(): void}>;
    workList: IList<{(): void}>;
}

const workTimeMs = 16;
const contextQueue: IList<IThreadContext> = List.Create();

var threadContext: IThreadContext = null;
var timeoutRunning = false;

function ProcessQueue() {
    var workStartTime = Date.now();

    var ctx: IThreadContext;
    while((Date.now() - workStartTime) < workTimeMs && (ctx = List.Pop(contextQueue)))
        DoWork(ctx, workStartTime);

    if(contextQueue.size > 0)
        setTimeout(ProcessQueue);
    else
        timeoutRunning = false;
}

function ScheduleWork(ctx: IThreadContext) {
    List.Add(contextQueue, ctx);

    if(timeoutRunning)
        return;

    timeoutRunning = true;
    setTimeout(ProcessQueue);
}

function Invoke(ctx: IThreadContext, callback: {(): void}) {
    var parent = ctx.workEndNode;
    ctx.workEndNode = ctx.workList.head;
    callback();
    ctx.workEndNode = parent;
}

function DoWork(ctx: IThreadContext, workStartTime = Date.now()) {
    var parentContext = threadContext;
    threadContext = ctx;

    var async = ctx.async;
    var callback: {(): void};
    while(async === ctx.async && (Date.now() - workStartTime) < workTimeMs && (callback = List.Pop(ctx.workList)))
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

function ScheduleCallback(callback: {(): void}, before: boolean, async: boolean) {
    threadContext = threadContext || CreateContext();
    threadContext.async = threadContext.async || async;

    if(before)
        List.AddBefore(threadContext.workList, threadContext.workEndNode, callback);
    else if(threadContext.workEndNode) 
        List.AddAfter(threadContext.workList, threadContext.workEndNode, callback);
    else
        threadContext.workEndNode = List.Add(threadContext.workList, callback);
}

function SynchWithoutThread(callback: {(): void}) {
    var workStartTime = Date.now();
    callback();
    if(threadContext)
        if(threadContext.async)
            ScheduleWork(threadContext);
        else
            DoWork(threadContext, workStartTime);

    threadContext = null;
}

export function Schedule(callback: {(): void}) {
    ScheduleCallback(callback, true, true);
}

export function After(callback: {(): void}) {
    ScheduleCallback(callback, false, false);
}

export function Callback<A = void, B = void, C = void, D = void>(callback: (a: A, b: B, c: C, d: D) => void) {
    return function(a?: A, b?: B, c?: C, d?: D) {        
        Schedule(function() { callback(a, b, c, d); });
    };
}

var inSynchCallback = false;
export function Synch(callback: {(): void}) {
    if(threadContext || inSynchCallback)
        callback();
    else {
        inSynchCallback = true;
        SynchWithoutThread(callback);
        inSynchCallback = false;
    }
}

export function Thread(callback: {(): void}) {
    if(threadContext)
        ScheduleCallback(callback, true, false);
    else
        Synch(callback);
}

export function ThreadAsync(callback: {(): void}) {
    return new Promise(resolve => 
        Thread(function() {
            callback();
            Thread(resolve);
        })
    );
}