// import { PromiseQueue } from "../../Promise/promiseQueue";
import { AsyncQueue } from "../../Utils/asyncQueue";

export class WorkerQueue<S, R> {

    private asyncQueue: AsyncQueue<void>;
    private worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
        this.asyncQueue = new AsyncQueue();
    }

    // public Push(getMessage: {(): S}): Promise<R> {
    public Push(message: S): Promise<R> {
        return new Promise((resolve, reject) => {
            this.asyncQueue.Add(next => {
                this.worker.onmessage = (message: any) => {
                    resolve(message.data);
                    next();
                };
                this.worker.onerror = (event) => {
                    reject(event);
                    next();
                };
                // this.worker.postMessage(getMessage());
                this.worker.postMessage(message);
            });
            this.asyncQueue.Start();
        });
    }

    public Stop() {
        this.asyncQueue.Stop();
    }

    public Destroy() {
        this.asyncQueue.Stop();
        this.worker.terminate();
    }

}
