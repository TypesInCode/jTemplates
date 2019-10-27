import { Binding } from "./binding";
import { BindingConfig } from "./bindingConfig";
import { FunctionOr } from "../template.types";
import { NodeRef } from "../nodeRef";

class EventBinding extends Binding<any> {
    boundEvents: { [name: string]: any };

    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>) {
        super(boundTo, bindingFunction, {});
    }

    /* public Destroy() {
        super.Destroy();
        for(var key in this.boundEvents)
            BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);
    } */

    protected Apply() {
        this.BoundTo.SetEvents(this.Value);
    }

    /* protected Apply() {
        for(var key in this.boundEvents)
            BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);

        this.boundEvents = {};
        var value = this.Value;
        for(var key in value) {
            this.boundEvents[key] = value[key];
            BindingConfig.addListener(this.BoundTo, key, value[key]);
        }
    } */
}

export default EventBinding;