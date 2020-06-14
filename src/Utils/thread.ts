import { List, INode } from "../Utils/list";

interface IThreadWorkerContext {
    running: boolean;
    async: boolean;
    workEndNode: INode<{(): void}>;
    workList: List<{(): void}>;
    DoWork: {(): void};
}

const workTimeMs = 16;
const setTimeoutQueue: List<{(): void}> = new List();
var timeoutRunning = false;
function ExecTimeouts() {
    var startTime = Date.now();
    var callback: {(): void};
    while((Date.now() - startTime) < workTimeMs && (callback = setTimeoutQueue.Pop()))
        callback();

    if(setTimeoutQueue.Size === 0)
        timeoutRunning = false;
    else
        setTimeout(ExecTimeouts, 0);
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

function DoWork(ctx: IThreadWorkerContext, startTime = Date.now()) {
    var parentContext = threadWorkerContext;
    threadWorkerContext = ctx;
    
    var async = threadWorkerContext.async;
    var callback: {(): void};
    while(async === threadWorkerContext.async && (Date.now() - startTime) < workTimeMs && (callback = ctx.workList.Pop()))
        Invoke(ctx, callback);

    if(ctx.workList.Size === 0)
        ctx.running = false;
    else
        SetTimeout(ctx.DoWork);

    threadWorkerContext = parentContext;
}

function CreateContext() {
    var ctx: IThreadWorkerContext = {
        running: true,
        async: false,
        workEndNode: null,
        workList: new List(),
        DoWork: null
    };
    ctx.DoWork = () => DoWork(ctx);
    threadWorkerContext = ctx;
}

var newThread = false;
function ScheduleContext(callback: {(): void}, async = false) {
    if(newThread && !threadWorkerContext)
        CreateContext();

    if(!threadWorkerContext)
        return callback();
    
    threadWorkerContext.async = threadWorkerContext.async || async;
    threadWorkerContext.workList.AddBefore(threadWorkerContext.workEndNode, callback);
}

function ScheduleAfterContext(callback: {(): void}) {
    if(!threadWorkerContext || !threadWorkerContext.running)
        return callback();

    threadWorkerContext.workList.Add(callback);
}

function NewThread(callback: {(): void}) {
    var startTime = Date.now();
    var parent = threadWorkerContext;
    newThread = true;
    threadWorkerContext = null;
    callback();
    newThread = false;
    
    if(threadWorkerContext) {
        if(threadWorkerContext.async)
            SetTimeout(threadWorkerContext.DoWork);
        else
            DoWork(threadWorkerContext, startTime);
    }

    threadWorkerContext = parent;
}

export function Schedule(callback: () => void) {
    ScheduleContext(callback, true);
}

export function Callback<A = void, B = void, C = void, D = void>(callback: (a: A, b: B, c: C, d: D) => void) {
    return (a?: A, b?: B, c?: C, d?: D) => {        
        ScheduleContext(() => callback(a, b, c, d), true);
    }
}

export function After(callback: () => void) {
    ScheduleAfterContext(callback);
}

export function Thread(callback: {(): void}, forceNew = false) {
    if((newThread || threadWorkerContext) && !forceNew)
        ScheduleContext(callback);
    else 
        NewThread(callback);
}