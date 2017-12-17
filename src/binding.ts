//import Observable from "./Observable/observable";
import ObservableScope from "./Observable/observableScope";
import Emitter from "./emitter";

enum BindingStatus {
    Init,
    Updating,
    Updated
}

abstract class Binding<T> { //} extends Emitter {
    private boundTo: T;
    private observableScope: ObservableScope;
    private setCallback: (obs: ObservableScope) => void;
    private scheduleUpdate: (callback: () => void) => void;
    private status: BindingStatus;
    private hasStaticValue: boolean;
    private staticValue: any;

    protected get Value(): any {
        return this.hasStaticValue ? this.staticValue : this.observableScope.Value;
    }

    protected get BoundTo(): T {
        return this.boundTo;
    }

    constructor(boundTo: T, binding: any, scheduleUpdate: (callback: () => void) => void) {
        //super(); 
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);

        if(typeof binding == 'function') {
            this.hasStaticValue = false;
            this.observableScope = new ObservableScope(binding);
            this.observableScope.AddListener("set", this.setCallback);
        }
        else {
            this.hasStaticValue = true;
            this.staticValue = binding;
            //this.observableScope = new ObservableScope(() => binding);
        }
    }

    public Update() {
        if(this.status == BindingStatus.Updated) {
            //this.Updating();
            this.scheduleUpdate(() => {
                this.Apply();
                //this.Updated();
            });
        }
        else if(this.status == BindingStatus.Init) {
            this.status = BindingStatus.Updating;
            this.Apply();
            this.status = BindingStatus.Updated;
        }
    }

    protected abstract Apply(): void;

    public Destroy(): void {
        // this.ClearAll();
        this.observableScope && this.observableScope.Destroy();
    }

    /* protected Updating() {
        if(this.status != BindingStatus.Updating) {
            this.Fire("updating");
            this.status = BindingStatus.Updating;
        }
    }

    protected Updated() {
        if(this.status != BindingStatus.Updated) {
            this.Fire("updated");
            this.status = BindingStatus.Updated;
        }
    } */
}

export default Binding;