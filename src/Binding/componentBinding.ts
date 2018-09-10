/* import { Binding } from "./binding";
import { Templates, Component } from "../component";

export class ComponentBinding extends Binding<any> {
    component: Component<any, any>;

    constructor(boundTo: Node, bindingFunction: () => any, type: { new(): Component<any, any> } , templates: Templates<any>) {
        super(boundTo, bindingFunction, null);
        this.component = new type();
        this.component.AttachTo(this.BoundTo);
    }

    public Destroy() {
        super.Destroy();
        this.component.Destroy();
    }

    protected Apply() {
        this.component.Data = this.Value;
    }
} */