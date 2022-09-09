import { List } from "./list";

export class AsyncQueue {

    private running = false;
    private queue = List.Create<() => Promise<void>>();

    Next<T>(callback: () => Promise<T>) {
        const ret = new Promise<T>(async function(resolve, reject) {
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

    Stop() {
        List.Clear(this.queue);
    }

    private Start() {
        if(this.running)
            return;

        this.running = true;
        this.ExecuteQueue();
    }

    private async ExecuteQueue() {
        const callback = List.Pop(this.queue);
        if(callback !== null) {
            await callback();
            this.ExecuteQueue();
        }
        else
            this.running = false;
    }

}