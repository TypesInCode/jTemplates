import NodeBinding from './nodeBinding';
import { TemplateDefinitionsValueFunction, ValueFunction } from "../elements";
declare class DataBinding extends NodeBinding {
    private childTemplates;
    private localUpdate;
    private destroyedTemplates;
    private templateFunction;
    constructor(boundTo: Node, binding: ValueFunction<any>, children: TemplateDefinitionsValueFunction);
    Update(): void;
    Destroy(): void;
    protected Apply(): void;
    private GetValue;
}
export default DataBinding;
