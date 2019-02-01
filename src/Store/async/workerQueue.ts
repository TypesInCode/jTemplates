import { DeferredPromise } from "../../Promise/deferredPromise";
import { PromiseQueue } from "../../Promise/promiseQueue";

export class WorkerQueue<S, R> {

    private promiseQueue: PromiseQueue<R>;
    private worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
        this.promiseQueue = new PromiseQueue();
    }

    public Push(getMessage: {(): S}): Promise<R> {
        return this.promiseQueue.Push((resolve, reject) => {
            this.worker.onmessage = (message: any) => {
                resolve(message.data);
            };
            this.worker.onerror = (event) => {
                console.log("Error in worker");
                console.log(event);
                reject();
            };
            this.worker.postMessage(getMessage());
        });
    }

    public Stop() {
        this.promiseQueue.Stop();
    }

}