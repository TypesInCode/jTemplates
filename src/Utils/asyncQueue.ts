import { List } from "./list";

interface AsyncCallback<T> {
    (next: {(data?: T): void}, data?: T): void;
}

enum AsyncQueueState {
    Idle,
    Running
}

export class AsyncQueue<T> {
    private list: List<AsyncCallback<T>>;
    private state: AsyncQueueState;
    private data: T;

    public get Running() {
        return this.state === AsyncQueueState.Running;
    }

    constructor() {
        this.list = new List();
        this.state = AsyncQueueState.Idle;
    }

    public Add(callback: AsyncCallback<T>) {
        this.list.Add(callback);
    }

    public Start(init?: T) {
        if(this.state === AsyncQueueState.Running)
            return;
    
        this.state = AsyncQueueState.Running;
        this.data = init;
        this.Continue();
    }

    public Stop(): T {
        this.state = AsyncQueueState.Idle;
        this.list.Clear();
        var data = this.data;
        this.data = null;

        return data;
    }

    private Continue() {
        if(this.state !== AsyncQueueState.Running)
            return;
        
        var callback = this.list.Pop();
        if(callback)
            callback((data) => {
                this.data = data;
                this.Continue();
            }, this.data);
        else 
            this.Stop();
    }
}