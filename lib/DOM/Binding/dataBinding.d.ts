import NodeBinding from './nodeBinding';
import { TemplateDefinitionsValueFunction, ValueFunction } from "../elements";
declare class DataBinding extends NodeBinding {
    private childTemplates;
    private rebind;
    private destroyedTemplates;
    private templateFunction;
    constructor(boundTo: Node, binding: ValueFunction<any>, rebind: boolean, children: TemplateDefinitionsValueFunction);
    Update(): void;
    Destroy(): void;
    protected Apply(): void;
    private GetValue;
}
export default DataBinding;
