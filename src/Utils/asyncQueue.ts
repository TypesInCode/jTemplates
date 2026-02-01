import { List } from "./list";

/**
 * A queue that executes async callbacks sequentially, one at a time.
 */
export class AsyncQueue {

    private running = false;
    private queue = List.Create<() => Promise<void>>();

    /**
     * Adds a callback to the queue and returns a promise that resolves when it executes.
     * @template T - The type the callback promise resolves to
     * @param callback - Async function to queue
     * @returns Promise that resolves with the callback's result when executed
     */
    Next<T>(callback: () => Promise<T>) {
        const ret = new Promise<T>((resolve, reject) => {
            List.Add(this.queue, async function() {
                try {
                    const ret = await callback();
                    resolve(ret);
                }
                catch(e) {
                    reject(e);
                }
            });
        });

        this.Start();
        return ret;
    }

    /**
     * Clears the queue and stops execution.
     */
    Stop() {
        List.Clear(this.queue);
    }

    /**
     * Starts queue execution if not already running.
     * @private
     */
    private Start() {
        if(this.running)
            return;

        this.running = true;
        this.ExecuteQueue();
    }

    /**
     * Executes the next callback in the queue recursively until empty.
     * @private
     */
    private async ExecuteQueue() {
        const callback = List.Pop(this.queue);
        if(callback !== undefined) {
            await callback();
            this.ExecuteQueue();
        }
        else
            this.running = false;
    }

}