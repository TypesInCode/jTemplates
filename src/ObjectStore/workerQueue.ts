import { DeferredPromise } from "./deferredPromise";

export class WorkerQueue<S, R> {
    private promiseQueue: Array<DeferredPromise<R>> = [];
    private deferred: DeferredPromise<any> = null;
    private queueIndex = 0;
    private running = false;
    private worker: Worker = null;

    public get Running() {
        return this.running;
    }

    constructor(worker: Worker) {
        this.worker = worker;
    }

    public OnComplete(): Promise<any> {
        if(!this.running)
            return Promise.resolve();
        
        this.deferred = new DeferredPromise(resolve => resolve());
        return this.deferred;
    }

    public Push(getMessage: {(): S}): Promise<R> {
        var p = new DeferredPromise<R>((resolve, reject) => {
            this.worker.onmessage = (message: any) => {
                resolve(message.data);
            };
            this.worker.onerror = reject;
            this.worker.postMessage(getMessage());
        });

        this.promiseQueue.push(p);
        return p;
    }

    public Process() {
        if(this.running)
            return;

        this.running = true;
        this.ProcessQueueRecursive();
    }

    private ProcessQueueRecursive() {
        if(this.queueIndex >= this.promiseQueue.length) {
            this.running = false;
            this.queueIndex = 0;
            this.promiseQueue = [];
            this.deferred && this.deferred.Invoke();
            this.deferred = null;
            return;
        }

        this.promiseQueue[this.queueIndex].Invoke();
        this.promiseQueue[this.queueIndex].then(() => {
            this.queueIndex++;
            this.ProcessQueueRecursive();
        });
    }
}