import { List, ListNavigator } from "./list";

interface AsyncCallback {
    (next: {(): void}): void;
}

enum AsyncQueueState {
    Idle,
    Running,
    Complete
}

export class AsyncQueue {
    private list: List<AsyncCallback>;
    private navigator: ListNavigator<AsyncCallback>;
    private onStart: AsyncCallback;
    private onComplete: AsyncCallback;
    private onCancel: {(): void};

    private state: AsyncQueueState;

    public get IsRunning() {
        return this.state === AsyncQueueState.Running;
    }

    public get IsComplete() {
        return this.state === AsyncQueueState.Complete;
    }

    constructor(onStart: AsyncCallback, onComplete: AsyncCallback) {
        this.list = new List();
        this.state = AsyncQueueState.Idle;
        this.onStart = onStart;
        this.onComplete = onComplete;
    }

    public Add(callback: AsyncCallback) {
        if(this.state !== AsyncQueueState.Idle)
            throw `Can't push in current state: ${AsyncQueueState[this.state]}`;

        this.list.Add(callback);
    }

    public Start() {
        if(this.state === AsyncQueueState.Complete)
            return;

        if(this.state !== AsyncQueueState.Idle)
            throw "Can't start after Queue has started";
        
        this.onStart(() => {
            this.state = AsyncQueueState.Running;
            this.navigator = this.list.Navigator();
            this.Continue();
        });
    }

    public Cancel(callback?: {(): void}) {
        this.onCancel = callback;
        this.Complete(() => {
            this.onCancel && this.onCancel();
        });
    }

    private Continue() {
        if(this.state === AsyncQueueState.Running && this.navigator.MoveNext())
            this.navigator.Value(() => this.Continue());
        else
            this.Complete();
    }

    private Complete(next?: {(): void}) {
        if(this.state === AsyncQueueState.Complete) {
            next && next();
            return;
        }
        
        this.state = AsyncQueueState.Complete;
        this.onComplete(() => {
            next && next();
        });
    }
}