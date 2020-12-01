import { IList, INode, List } from "./list";

interface IThreadContext {
    async: boolean;
    workEndNode: INode<{(): void}>;
    workList: IList<{(): void}>;
}

const workTimeMs = 16;
const setTimeoutQueue: IList<{(): void}> = List.Create();

var threadContext: IThreadContext = null;
var timeoutRunning = false;

function ExecTimeouts() {
    var workStartTime = Date.now();
    var callback: {(): void};
    while((Date.now() - workStartTime) < workTimeMs && (callback = List.Pop(setTimeoutQueue)))
        callback();

    if(setTimeoutQueue.size > 0)
        setTimeout(ExecTimeouts, 0);
    else
        timeoutRunning = false;
}

function ScheduleWork(ctx: IThreadContext) {
    List.Add(setTimeoutQueue, function() { DoWork(ctx); });

    if(timeoutRunning)
        return;

    timeoutRunning = true;
    setTimeout(ExecTimeouts, 0);
}

function Invoke(ctx: IThreadContext, callback: {(): void}) {
    var parent = ctx.workEndNode;
    ctx.workEndNode = ctx.workList.head;
    callback();
    ctx.workEndNode = parent;
}

function DoWork(ctx: IThreadContext) {
    var parentContext = threadContext;
    threadContext = ctx;

    var workStartTime = Date.now();
    var async = ctx.async;
    var callback: {(): void};
    while(async === ctx.async && (Date.now() - workStartTime) < workTimeMs && (callback = List.Pop(ctx.workList)))
        Invoke(ctx, callback);

    if(ctx.workList.size > 0)
        ScheduleWork(ctx);

    threadContext = parentContext;
}

function CreateContext() {
    var ctx: IThreadContext = {
        async: false,
        workEndNode: null,
        workList: List.Create()
    };
    
    return ctx;
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
    callback();
    if(threadContext)
        if(threadContext.async)
            ScheduleWork(threadContext);
        else
            DoWork(threadContext);

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

export function Synch(callback: {(): void}) {
    if(threadContext)
        callback();
    else
        SynchWithoutThread(callback);
}

export function Thread(callback: {(): void}) {
    if(threadContext)
        ScheduleCallback(callback, true, false);
    else
        SynchWithoutThread(callback);
}

export function ThreadAsync(callback: {(): void}) {
    return new Promise(resolve => 
        Thread(function() {
            callback();
            Thread(resolve);
        })
    );
}