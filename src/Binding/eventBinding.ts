import { Binding } from "./binding";
import { ProxyObservable } from "../ProxyObservable/proxyObservable";
import { BindingConfig } from "./bindingConfig";

class EventBinding extends Binding<any> {
    boundEvents: { [name: string]: any };

    constructor(boundTo: Node, bindingFunction: () => any) {
        super(boundTo, bindingFunction, null);
    }

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