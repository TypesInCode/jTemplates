import { Binding } from "./binding";
declare class EventBinding extends Binding<any> {
    boundEvents: {
        [name: string]: any;
    };
    constructor(boundTo: Node, bindingFunction: {
        (): any;
    } | any);
    Destroy(): void;
    protected Apply(): void;
}
export default EventBinding;
