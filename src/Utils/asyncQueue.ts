import { List } from "./list";

interface AsyncCallback<T> {
    (next: {(data?: T): void}, data?: T): void;
}

enum AsyncQueueState {
    Idle,
    Running
}

export class AsyncQueueObject<T> {
    private list: List<AsyncCallback<T>>;
    private state: AsyncQueueState;
    private data: T;
    private onComplete: Array<{ (data: T): void }>;

    public get Running() {
        return this.state === AsyncQueueState.Running;
    }

    constructor() {
        this.list = new List();
        this.state = AsyncQueueState.Idle;
        this.onComplete = [];
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
        this.onComplete = [];
        var data = this.data;
        this.data = null;

        return data;
    }

    public OnComplete(callback: {(data: T): void}) {
        if(callback)
            this.onComplete.push(callback);
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
        else {
            this.onComplete.forEach(cb => cb(this.data));
            this.onComplete = [];
            this.Stop();
        }
    }
}

export class AsyncQueue<T> {
    private queue = new AsyncQueueObject<T>();

    public get Running() {
        return this.queue.Running;
    }

    public Add(callback: AsyncCallback<T>) {
        this.queue.Add(callback);
    }

    public Start(init?: T) {
        this.queue.Start(init);
    }

    public Stop(): T {
        if(this.queue.Running) {
            var ret = this.queue.Stop();
            this.queue = new AsyncQueueObject();
            return ret;
        }
        
        return null;
    }

    public OnComplete(callback: {(data: T): void}) {
        this.queue.OnComplete(callback);
    }
}