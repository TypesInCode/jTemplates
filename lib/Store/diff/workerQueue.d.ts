export declare class WorkerQueue<S, R> {
    private promiseQueue;
    private worker;
    constructor(worker: Worker);
    Push(getMessage: {
        (): S;
    }): Promise<R>;
    Stop(): void;
    Destroy(): void;
}
