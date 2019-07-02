import { Scope } from '../../Store/scope/scope';
import { BindingConfig } from './bindingConfig';
import { FunctionOr } from '../template.types';
import { Injector } from '../../injector';

enum BindingStatus {
    Init,
    Updating,
    Updated,
    Destroyed
}

export abstract class Binding<T> {
    private injector: Injector;
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

    protected get Injector() {
        return this.injector;
    }

    protected get BoundTo(): any {
        return this.boundTo;
    }

    protected get IsStatic() {
        return this.isStatic;
    }

    protected get ScheduleUpdate() {
        return true;
    }

    constructor(boundTo: any, binding: FunctionOr<any>, config: T) {
        this.injector = Injector.Current();
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
        
        if(this.status === BindingStatus.Init || !this.ScheduleUpdate) {
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

    public Destroy(parentDestroyed = false): void {
        this.observableScope && this.observableScope.Destroy();
        this.status = BindingStatus.Destroyed;
    }

    protected OverrideBinding(binding: FunctionOr<any>, config: T) {
        return binding;
    }

    protected Init(config: T): void { };

    protected abstract Apply(): void;
}