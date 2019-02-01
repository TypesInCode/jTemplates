import { DeferredPromise } from "./deferredPromise";

export class PromiseQueue<T> {

    private running: boolean = false;
    private queue: Array<DeferredPromise<T>> = [];
    private onComplete: DeferredPromise<void>;

    get OnComplete() {
        if(!this.running)
            return Promise.resolve();

        if(!this.onComplete)
            this.onComplete = new DeferredPromise(resolve => {
                resolve();
            });

        return this.onComplete;
    }

    public Push(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T> {
        var p = new DeferredPromise<T>(executor);
        this.queue.push(p);

        this.Execute();
        return p;
    }

    public Stop() {
        this.queue = [];
    }

    private Execute() {
        if(this.running)
            return;

        this.running = true;
        this.ExecuteRecursive();
    }

    private ExecuteRecursive(queueIndex?: number) {
        queueIndex = queueIndex || 0;

        if(queueIndex >= this.queue.length) {
            this.running = false;
            this.queue = [];
            this.onComplete && this.onComplete.Invoke();
            this.onComplete = null;
            return;
        }

        this.queue[queueIndex].Invoke();
        this.queue[queueIndex].then(() => this.ExecuteRecursive(++queueIndex));
    }

}