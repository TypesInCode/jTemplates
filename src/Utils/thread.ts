import { List, INode } from "../Utils/list";

const workTimeMs = 16;
var threadWorkerContext: ThreadWorker = null;

class ThreadWorker {

    private workEndNode: INode<{(): void}> = null;
    private running = false;
    private workList = new List<{(): void}>();
    private DoWorkBound = this.DoWork.bind(this);

    public Schedule(callback: {(): void}) {
        this.workList.AddBefore(this.workEndNode, callback);
        this.Start();
    }

    private Invoke(callback: {(): void}) {
        var parent = this.workEndNode;
        this.workEndNode = this.workList.HeadNode;
        callback();
        this.workEndNode = parent;
    }

    private DoWork(elapsed = 0) {
        var parentContext = threadWorkerContext;
        threadWorkerContext = this;

        var startTime = Date.now() - elapsed;
        var callback: {(): void};
        while((Date.now() - startTime) < workTimeMs && (callback = this.workList.Pop()))
            this.Invoke(callback);
        
        if(this.workList.Size === 0)
            this.running = false;
        else
            this.ScheduleWork();

        threadWorkerContext = parentContext;
    }

    private ScheduleWork() {
        setTimeout(this.DoWorkBound, 0);
    }

    private Start() {
        if(this.running)
            return;

        this.running = true;
        // this.ScheduleWork();
        this.DoWork(workTimeMs/2);
    }

}

export function Schedule(callback: () => void) {
    if(!threadWorkerContext)
        return callback();

    threadWorkerContext.Schedule(callback);
}

export function Callback<A = void, B = void, C = void, D = void>(callback: (a: A, b: B, c: C, d: D) => void) {
    return (a?: A, b?: B, c?: C, d?: D) => {
        if(!threadWorkerContext)
            return callback(a, b, c, d);
        
        threadWorkerContext.Schedule(() => callback(a, b, c, d));
    }
}

export function Thread(callback: {(): void}) {
    var thread = threadWorkerContext || new ThreadWorker();
    thread.Schedule(callback);
    return new Promise<void>(resolve => thread.Schedule(resolve));
}