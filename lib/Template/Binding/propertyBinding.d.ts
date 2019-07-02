import { Binding } from "./binding";
import { FunctionOr } from "../template.types";
declare class PropertyBinding extends Binding<any> {
    private lastValue;
    private scheduleUpdate;
    protected readonly ScheduleUpdate: boolean;
    constructor(boundTo: Node, bindingFunction: FunctionOr<any>);
    protected Apply(): void;
    private ApplyRecursive;
}
export default PropertyBinding;
