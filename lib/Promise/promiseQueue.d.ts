export declare class PromiseQueue<T> {
    private running;
    private queue;
    private onComplete;
    readonly OnComplete: Promise<void>;
    Push(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
    Stop(): void;
    private Execute;
    private ExecuteRecursive;
}
