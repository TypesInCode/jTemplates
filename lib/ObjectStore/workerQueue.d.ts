export declare class WorkerQueue<S, R> {
    private workerFactory;
    private queue;
    private queueIndex;
    private running;
    constructor(workerFactory: {
        (): Worker;
    });
    Push(getMessage: {
        (): S;
    }, completeCallback: {
        (postMessage: {
            data: R;
        }): void;
    }): void;
    private ProcessQueue;
    private ProcessQueueRecursive;
}
