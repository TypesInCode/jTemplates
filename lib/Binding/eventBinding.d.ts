import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
declare class EventBinding extends Binding<any> {
    boundEvents: {
        [name: string]: any;
    };
    constructor(boundTo: Node, bindingFunction: FunctionOr<any>);
    protected Apply(): void;
}
export default EventBinding;
