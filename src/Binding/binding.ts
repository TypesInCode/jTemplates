import { Scope } from '../Store/scope';
import { BindingConfig } from './bindingConfig';
import { PromiseOr } from '../template.types';

enum BindingStatus {
    Init,
    Updating,
    Updated,
    Destroyed
}

export abstract class Binding<T> {
    private boundTo: any;
    private isStatic: boolean;
    private staticValue: any;
    private observableScope: Scope<any>;
    private setCallback: () => void;
    private status: BindingStatus;

    protected get Value(): any {
        return this.isStatic ? 
            this.staticValue : 
            this.observableScope.Value;
    }

    protected get BoundTo(): any {
        return this.boundTo;
    }

    constructor(boundTo: any, binding: PromiseOr<any>, defaultValue: any, config: T) {
        this.boundTo = boundTo;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        binding = this.OverrideBinding(binding, config);

        if(typeof binding === 'function') {
            this.observableScope = new Scope(binding);
            this.observableScope.addListener("set", this.setCallback);
        }
        else {
            this.isStatic = true;
            this.staticValue = binding;
        }
        
        this.Init(config);
        this.Update();
    }

    public Update() {
        if(this.status === BindingStatus.Destroyed)
            return;
        
        if(this.status === BindingStatus.Init) {
            this.status = BindingStatus.Updating;
            this.Apply();
            this.status = BindingStatus.Updated;
        }
        else if(this.status !== BindingStatus.Updating) {
            this.status = BindingStatus.Updating;
            BindingConfig.scheduleUpdate(() => {
                if(this.status === BindingStatus.Destroyed)
                    return;
                
                this.Apply();
                this.status = BindingStatus.Updated;
            });
        }
    }

    public Destroy(): void {
        this.observableScope && this.observableScope.Destroy();
        this.status = BindingStatus.Destroyed;
    }

    protected OverrideBinding(binding: PromiseOr<any>, config: T) {
        return binding;
    }

    protected Init(config: T): void { };

    protected abstract Apply(): void;
}