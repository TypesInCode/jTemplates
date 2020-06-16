import { INode, List } from "./list";

interface IThreadWorkerContext {
    async: boolean;
    workEndNode: INode<{(): void}>;
    workList: List<{(): void}>;
    DoWork: {(): void};
}

const workTimeMs = 16;
const setTimeoutQueue: List<{(): void}> = new List();
var timeoutRunning = false;
var workStartTime: number = null;
function ExecTimeouts() {
    workStartTime = Date.now();
    var callback: {(): void};
    while((Date.now() - workStartTime) < workTimeMs && (callback = setTimeoutQueue.Pop()))
        callback();

    if(setTimeoutQueue.Size > 0)
        setTimeout(ExecTimeouts, 0);
    else
        timeoutRunning = false;

    workStartTime = null;
}

function SetTimeout(callback: {(): void}) {
    setTimeoutQueue.Add(callback);

    if(timeoutRunning)
        return;

    timeoutRunning = true;
    setTimeout(ExecTimeouts, 0);
}

var threadWorkerContext: IThreadWorkerContext = null;

function Invoke(ctx: IThreadWorkerContext, callback: {(): void}) {
    var parent = ctx.workEndNode;
    ctx.workEndNode = ctx.workList.HeadNode;
    callback();
    ctx.workEndNode = parent;
}

function DoWork(ctx: IThreadWorkerContext) {
    var parentContext = threadWorkerContext;
    threadWorkerContext = ctx;

    workStartTime = workStartTime || Date.now();
    var async = ctx.async;
    var callback: {(): void};
    while(async === ctx.async && (Date.now() - workStartTime) < workTimeMs && (callback = ctx.workList.Pop()))
        Invoke(ctx, callback);

    if(ctx.workList.Size > 0)
        SetTimeout(ctx.DoWork);

    threadWorkerContext = parentContext;
}

function CreateContext() {
    var ctx: IThreadWorkerContext = threadWorkerContext = {
        async: false,
        workEndNode: null,
        workList: new List(),
        DoWork: null
    };
    ctx.DoWork = () => DoWork(ctx);
    return ctx;
}

function NewThread(callback: {(): void}) {
    var parentContext = threadWorkerContext;
    threadWorkerContext = null;
    workStartTime = Date.now();
    callback();

    if(threadWorkerContext) {
        if(threadWorkerContext.async)
            SetTimeout(threadWorkerContext.DoWork);
        else
            DoWork(threadWorkerContext);
    }

    threadWorkerContext = parentContext;
    workStartTime = null;
}

function ScheduleCallback(callback: {(): void}, before: boolean, async: boolean) {
    var ctx = threadWorkerContext = threadWorkerContext || CreateContext();
    ctx.async = ctx.async || async;
    before ?
        ctx.workList.AddBefore(ctx.workEndNode, callback) :
        ctx.workList.AddAfter(ctx.workEndNode, callback);
}

export function Schedule(callback: {(): void}) {
    ScheduleCallback(callback, true, true);
}

export function After(callback: {(): void}) {
    ScheduleCallback(callback, false, false);
}

export function Callback<A = void, B = void, C = void, D = void>(callback: (a: A, b: B, c: C, d: D) => void) {
    return (a?: A, b?: B, c?: C, d?: D) => {        
        Schedule(() => callback(a, b, c, d));
    }
}

export function Thread(callback: {(): void}, forceNew = false) {
    if(threadWorkerContext && !forceNew)
        ScheduleCallback(callback, true, false);
    else
        NewThread(callback);
}