import NodeBinding from './nodeBinding';
import { BindingDefinition, ValueFunction } from "../elements";
declare class DataBinding extends NodeBinding {
    private childTemplates;
    private updatingTemplates;
    private localUpdate;
    private templateFunction;
    constructor(boundTo: Node, binding: ValueFunction<any>, children: BindingDefinition);
    Destroy(): void;
    protected Apply(): void;
}
export default DataBinding;
