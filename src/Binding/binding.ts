import { ProxyObservableScope } from '../ProxyObservable/proxyObservableScope';
import { BindingConfig } from './bindingConfig';

enum BindingStatus {
    Init,
    Updating,
    Updated
}

export abstract class Binding<T> {
    private boundTo: any;
    private observableScope: ProxyObservableScope<any>;
    private setCallback: () => void;
    private status: BindingStatus;

    protected get Value(): any {
        return this.observableScope.Value;
    }

    protected get BoundTo(): any {
        return this.boundTo;
    }

    constructor(boundTo: any, binding: {(): any}, config: T) {
        this.boundTo = boundTo;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);

        this.observableScope = new ProxyObservableScope(binding);
        this.observableScope.addListener("set", this.setCallback);
        this.Init(config);
        this.Update();
    }

    public Update() {
        if(this.status == BindingStatus.Init) {
            this.status = BindingStatus.Updating;
            this.Apply();
            this.status = BindingStatus.Updated;
        }
        else if(this.status != BindingStatus.Updating) {
            this.status = BindingStatus.Updating;
            BindingConfig.scheduleUpdate(() => {
                this.Apply();
                this.status = BindingStatus.Updated;
            });
        }
    }

    public Destroy(): void {
        this.observableScope && this.observableScope.Destroy();
    }

    protected Init(config: T): void { };

    protected abstract Apply(): void;
}