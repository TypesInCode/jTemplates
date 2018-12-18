export declare class WorkerQueue<S, R> {
    private promiseQueue;
    private deferred;
    private queueIndex;
    private running;
    private worker;
    readonly Running: boolean;
    constructor(worker: Worker);
    OnComplete(): Promise<any>;
    Push(getMessage: {
        (): S;
    }): Promise<R>;
    Process(): void;
    private ProcessQueueRecursive;
}
