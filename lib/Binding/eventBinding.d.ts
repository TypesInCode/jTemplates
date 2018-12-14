import { Binding } from "./binding";
import { PromiseOr } from "../template.types";
declare class EventBinding extends Binding<any> {
    boundEvents: {
        [name: string]: any;
    };
    constructor(boundTo: Node, bindingFunction: PromiseOr<any>);
    protected Apply(): void;
}
export default EventBinding;
