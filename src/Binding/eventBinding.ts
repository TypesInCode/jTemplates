import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";
import { PromiseOr } from "../template.types";

class EventBinding extends Binding<any> {
    boundEvents: { [name: string]: any };

    constructor(boundTo: Node, bindingFunction: PromiseOr<any>) {
        super(boundTo, bindingFunction, {}, null);
    }

    /* public Destroy() {
        super.Destroy();
        for(var key in this.boundEvents)
            BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);
    } */

    protected Apply() {
        for(var key in this.boundEvents)
            BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);

        this.boundEvents = {};
        var value = this.Value;
        for(var key in value) {
            this.boundEvents[key] = value[key];
            BindingConfig.addListener(this.BoundTo, key, value[key]);
        }
    }
}

export default EventBinding;