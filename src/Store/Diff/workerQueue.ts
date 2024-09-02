import { List, IList } from "../../Utils/list";

export class WorkerQueue<S, R> {
  private callbacks: IList<{ (data: any, err?: any): void }>;
  private worker: Worker;

  constructor(worker: Worker) {
    this.worker = worker;
    this.callbacks = List.Create();
    this.worker.onerror = (err: any) => {
      const cb = List.Pop(this.callbacks);
      cb && cb(null, err);
    };
    this.worker.onmessage = (message: MessageEvent) => {
      const cb = List.Pop(this.callbacks);
      cb && cb(message.data);
    };
  }

  public Push(message: S): Promise<R> {
    return new Promise((resolve, reject) => {
      List.Add(this.callbacks, function (data, err) {
        if (err) reject(err);
        else resolve(data);
      });
      this.worker.postMessage(message);
    });
  }

  public Destroy() {
    this.worker.terminate();
  }
}
