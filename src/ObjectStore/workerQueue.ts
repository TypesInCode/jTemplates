export class WorkerQueue<S, R> {
    private queue: Array<{(next: {(): void}): void}> = [];
    private queueIndex = 0;
    private running = false;

    constructor(private workerFactory: {(): Worker}) {
    }

    public Push(getMessage: {(): S}, completeCallback: {(postMessage: { data: R }): void}) {
        this.queue.push((next: {(): void}) => {
            var worker = this.workerFactory();
            worker.onmessage = (message: any) => {
                worker.terminate();
                completeCallback(message);
                next();
            };
            worker.onerror = (err) => {
                console.error(err);
                next();
            };
            worker.postMessage(getMessage());
        });

        this.ProcessQueue();
    }

    private ProcessQueue() {
        if(this.running)
            return;

        this.queueIndex = 0;
        this.running = true;
        this.ProcessQueueRecursive();
    }

    private ProcessQueueRecursive() {
        if(this.queueIndex >= this.queue.length) {
            this.queue = [];
            this.running = false;
            this.queueIndex = 0;
            return;
        }

        this.queue[this.queueIndex](() => {
            this.queueIndex++;
            this.ProcessQueueRecursive();
        });
    }
}