import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
import { NodeRef } from "../nodeRef";
declare class EventBinding extends Binding<any> {
    boundEvents: {
        [name: string]: any;
    };
    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>);
    protected Apply(): void;
}
export default EventBinding;
