import { List } from "../../Utils/list";

export class WorkerQueue<S, R> {

    private callbacks: List<{(data: any, err?: any): void}>;
    private worker: Worker;

    constructor(worker: Worker) {
        this.worker = worker;
        this.callbacks = new List();
        this.worker.onerror = (err: any) => {
            var cb = this.callbacks.Pop();
            cb && cb(null, err);
        };
        this.worker.onmessage = (message: MessageEvent) => {
            var cb = this.callbacks.Pop();
            cb && cb(message.data);
        };
    }

    public Push(message: S): Promise<R> {
        return new Promise((resolve, reject) => {
            this.callbacks.Add(function(data, err){
                if(err)
                    reject(err);
                else
                    resolve(data);
            });
            this.worker.postMessage(message);
        });
    }

    public Destroy() {
        this.worker.terminate();
    }

}
