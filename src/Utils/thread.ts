import { List, INode } from "../Utils/list";

interface IThreadWorkerContext {
    running: boolean;
    workEndNode: INode<{(): void}>;
    workList: List<{(): void}>;
    DoWork: {(): void};
}

const workTimeMs = 16;
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
    
    var callback: {(): void};
    while((Date.now() - startTime) < workTimeMs && (callback = ctx.workList.Pop()))
        Invoke(ctx, callback);

    if(ctx.workList.Size === 0)
        ctx.running = false;
    else
        setTimeout(ctx.DoWork, 0);

    threadWorkerContext = parentContext;
}

function CreateContext() {
    var ctx: IThreadWorkerContext = {
        running: true,
        workEndNode: null,
        workList: new List(),
        DoWork: null
    };
    ctx.DoWork = () => DoWork(ctx);
    threadWorkerContext = ctx;
}

var newThread = false;
function ScheduleContext(callback: {(): void}) {
    if(newThread && !threadWorkerContext)
        CreateContext();

    if(!threadWorkerContext)
        return callback();
    
    threadWorkerContext.workList.AddBefore(threadWorkerContext.workEndNode, callback);
}

function NewThread(callback: {(): void}) {
    var startTime = Date.now();
    var parent = threadWorkerContext;
    newThread = true;
    threadWorkerContext = null;
    callback();
    newThread = false;
    
    if(threadWorkerContext)
        DoWork(threadWorkerContext, startTime);

    threadWorkerContext = parent;
}

export function Schedule(callback: () => void) {
    ScheduleContext(callback);
}

export function Callback<A = void, B = void, C = void, D = void>(callback: (a: A, b: B, c: C, d: D) => void) {
    return (a?: A, b?: B, c?: C, d?: D) => {        
        ScheduleContext(() => callback(a, b, c, d));
    }
}

export function Thread(callback: {(): void}, forceNew = false) {
    if((newThread || threadWorkerContext) && !forceNew)
        ScheduleContext(callback);
    else 
        NewThread(callback);
}